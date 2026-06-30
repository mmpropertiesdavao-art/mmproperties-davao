export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActiveDeveloperProjects, type DeveloperProjectSearchRow } from "@/lib/developer-inventory";
import { combinedFilterSearchQuery } from "@/lib/postgis/queries";
import { db } from "@/lib/supabase/server";
import type { MatchDetails, MatchDetailTone, MatcherInput, MatchedProperty, PropertyTypeSlug } from "@/types/property";

type Center = {
  name: string;
  barangay: string | null;
  slug: string;
  lat: number | null;
  lng: number | null;
  source: "neighborhood" | "place";
};

type Amenity = {
  id: string;
  schoolDistance: number | null;
  mallDistance: number | null;
  hospitalDistance: number | null;
};

type MatchedDeveloperProject = DeveloperProjectSearchRow & {
  matchScore: number;
  matchReason: string;
  matchDetails: MatchDetails;
  distanceKm: number;
  outsidePreferredArea: boolean;
};

const clean = (value: string | null | undefined) => (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const listingTypes = new Set<PropertyTypeSlug>(["house-and-lot", "condominium", "lot-only", "commercial", "townhouse", "foreclosed"]);

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as MatcherInput;
    if (!input.budget || !input.familySize) {
      return NextResponse.json({ error: "Budget and family size are required." }, { status: 400 });
    }

    const minBedrooms = Math.ceil(input.familySize / 2);
    const wanted = input.preferredAreas.map(clean).filter(Boolean);
    const { rows: centers } = await db.query<Center>({
      text: `
        SELECT name, barangay, slug, ST_Y(centroid::geometry) AS lat, ST_X(centroid::geometry) AS lng, 'neighborhood'::text AS source
        FROM neighborhoods
        WHERE centroid IS NOT NULL
        UNION ALL
        SELECT name, NULL AS barangay, slug, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, 'place'::text AS source
        FROM places
        WHERE status = 'active' AND location IS NOT NULL
        UNION ALL
        SELECT pa.alias AS name, NULL AS barangay, pl.slug, ST_Y(pl.location::geometry) AS lat, ST_X(pl.location::geometry) AS lng, 'place'::text AS source
        FROM place_aliases pa
        JOIN places pl ON pl.id = pa.place_id
        WHERE pl.status = 'active' AND pl.location IS NOT NULL
      `,
      values: [],
    });
    const selectedCenters = centers
      .filter((center) => wanted.some((area) => [center.name, center.barangay, center.slug].some((value) => clean(value) === area)))
      .filter((center) => center.lat != null && center.lng != null);

    const propertyType = input.propertyType || "";
    const listingPropertyType = listingTypes.has(propertyType as PropertyTypeSlug) ? (propertyType as PropertyTypeSlug) : undefined;
    const shouldReturnListings = propertyType !== "new-development";
    const shouldReturnProjects = !propertyType || ["new-development", "lot-only", "house-and-lot", "townhouse"].includes(propertyType);

    const { rows } = shouldReturnListings
      ? await db.query(
          combinedFilterSearchQuery({
            minPrice: input.budget * 0.7,
            maxPrice: input.budget * 1.3,
            minBedrooms,
            propertyType: listingPropertyType,
            pageSize: 120,
          }),
        )
      : { rows: [] as MatchedProperty[] };
    const available = (rows as MatchedProperty[]).filter((property) => property.availability === "available" && property.status === "active");

    const ids = available.map((property) => property.id);
    const { rows: amenities } = ids.length
      ? await db.query<Amenity>({
          text: `
            SELECT
              p.id,
              (SELECT min(ST_Distance(p.location, s.location)) FROM schools s)::float AS "schoolDistance",
              (SELECT min(ST_Distance(p.location, m.location)) FROM malls m)::float AS "mallDistance",
              (SELECT min(ST_Distance(p.location, h.location)) FROM hospitals h)::float AS "hospitalDistance"
            FROM properties p
            WHERE p.id = ANY($1::uuid[])
          `,
          values: [ids],
        })
      : { rows: [] as Amenity[] };

    const amenityById = new Map(amenities.map((amenity) => [amenity.id, amenity]));
    const ranked = available
      .map((property) => scoreProperty(property, input, minBedrooms, wanted, selectedCenters, amenityById.get(property.id)))
      .sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm)
      .slice(0, 24);

    const projectCandidates = shouldReturnProjects
      ? await getActiveDeveloperProjects(80, {
          query: input.preferredAreas[0] || null,
          minPrice: input.budget * 0.7,
          maxPrice: input.budget * 1.3,
          minBedrooms,
          propertyType,
        })
      : [];
    const projectMatches = projectCandidates
      .map((project) => scoreDeveloperProject(project, input, minBedrooms, wanted, selectedCenters))
      .filter((project) => project.matchScore >= 35 || !project.outsidePreferredArea)
      .sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm)
      .slice(0, 8);

    return NextResponse.json({
      results: ranked,
      developerProjects: projectMatches,
      weights: { location: 50, budget: 25, bedrooms: 10, lifestyle: 15 },
    });
  } catch (error) {
    console.error("Matcher failed", error);
    return NextResponse.json({ error: "Could not calculate matches." }, { status: 500 });
  }
}

function scoreProperty(property: MatchedProperty, input: MatcherInput, minBedrooms: number, wanted: string[], centers: Center[], amenity?: Amenity): MatchedProperty {
  const primary = clean(`${property.primaryPlace || property.neighborhoodName} ${property.barangay || ""}`);
  const textExact = Boolean(wanted.length && wanted.some((area) => primary === area || primary.includes(area) || area.includes(primary)));
  const nearbyTag = Boolean(!textExact && wanted.length && (property.nearbyPlaces || []).some((place) => wanted.some((area) => clean(place) === area)));
  const distanceKm = centers.length ? Math.min(...centers.map((center) => haversine(property.lat, property.lng, Number(center.lat), Number(center.lng)))) : Infinity;
  const exact = centers.length ? distanceKm <= 0.75 : textExact;
  const locationPoints = wanted.length
    ? centers.length
      ? distanceKm <= 0.75
        ? 50
        : distanceKm <= 2
          ? 45
          : distanceKm <= 5
            ? 35
            : distanceKm <= 8
              ? 22
              : nearbyTag
                ? 18
                : 0
      : textExact
        ? 45
        : nearbyTag
          ? 25
          : 0
    : 50;
  const budgetGap = Math.abs(property.price - input.budget) / input.budget;
  const budgetPoints = Math.max(0, 25 * (1 - budgetGap / 0.3));
  const bedroomPoints = Math.min(10, 10 * ((property.bedrooms || 0) / minBedrooms));
  const checks = input.lifestyle.map((tag) =>
    tag === "near_schools"
      ? (amenity?.schoolDistance ?? Infinity) <= 3000
      : tag === "near_malls"
        ? (amenity?.mallDistance ?? Infinity) <= 3000
        : tag === "near_hospitals"
          ? (amenity?.hospitalDistance ?? Infinity) <= 3000
          : tag === "financing"
            ? property.financingAvailable
            : tag === "parking"
              ? (property.parkingSpaces || 0) > 0
              : false,
  );
  const lifestylePoints = checks.length ? 15 * (checks.filter(Boolean).length / checks.length) : 15;
  const score = Math.round(Math.min(100, locationPoints + budgetPoints + bedroomPoints + lifestylePoints));
  const matchDetails = propertyDetails(property, input, distanceKm, exact, nearbyTag, minBedrooms, checks, score);
  const concise = [
    matchDetails.location.label,
    matchDetails.budget.label,
    matchDetails.fit.label,
    matchDetails.lifestyle?.label,
  ].filter(Boolean);

  return {
    ...property,
    matchScore: score,
    matchDetails,
    distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : 0,
    outsidePreferredArea: Boolean(wanted.length && !exact && !nearbyTag && distanceKm > 8),
    matchReason: `${concise.join(" · ")}.`,
  };
}

function scoreDeveloperProject(project: DeveloperProjectSearchRow, input: MatcherInput, minBedrooms: number, wanted: string[], centers: Center[]): MatchedDeveloperProject {
  const distanceKm = centers.length && project.latitude != null && project.longitude != null
    ? Math.min(...centers.map((center) => haversine(Number(project.latitude), Number(project.longitude), Number(center.lat), Number(center.lng))))
    : Infinity;
  const text = clean(`${project.projectName} ${project.developerName} ${project.barangay || ""} ${project.address || ""}`);
  const textExact = Boolean(wanted.length && wanted.some((area) => text.includes(area)));
  const exact = centers.length ? distanceKm <= 0.75 : textExact;
  const locationPoints = wanted.length
    ? centers.length
      ? distanceKm <= 0.75
        ? 50
        : distanceKm <= 2
          ? 45
          : distanceKm <= 5
            ? 35
            : distanceKm <= 8
              ? 22
              : 0
      : textExact
        ? 40
        : 0
    : 50;
  const price = project.startingPrice || input.budget;
  const budgetGap = Math.abs(price - input.budget) / input.budget;
  const budgetPoints = Math.max(0, 25 * (1 - budgetGap / 0.35));
  const bedroomPoints = project.hasLotOnly ? 8 : Math.min(10, 10 * ((project.bedroomsMax || 0) / minBedrooms));
  const typePoints = input.propertyType
    ? input.propertyType === "new-development"
      ? 15
      : input.propertyType === "lot-only" && project.hasLotOnly
        ? 15
        : ["house-and-lot", "townhouse"].includes(input.propertyType) && !project.hasLotOnly
          ? 12
          : 0
    : 12;
  const score = Math.round(Math.min(100, locationPoints + budgetPoints + bedroomPoints + typePoints));
  const matchDetails = developerProjectDetails(project, input, distanceKm, exact, score);
  const concise = [matchDetails.location.label, matchDetails.budget.label, matchDetails.fit.label].join(" · ");

  return {
    ...project,
    matchScore: score,
    matchDetails,
    distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : 0,
    outsidePreferredArea: Boolean(wanted.length && !exact && distanceKm > 8),
    matchReason: `${concise}.`,
  };
}

function budgetDetail(price: number | null | undefined, budget: number) {
  if (!price) {
    return {
      tone: "ok" as MatchDetailTone,
      label: "Confirm pricing",
      text: "Price is not fully published yet. Ask for the latest price list, payment terms, and reservation requirements before comparing this option.",
    };
  }
  const diff = price - budget;
  const gap = Math.abs(diff) / budget;
  if (Math.abs(diff) < 1) return { tone: "strong" as MatchDetailTone, label: "On budget", text: "This option is right on your stated budget, so compare it based on location, condition, and total move-in costs." };
  if (diff < 0) {
    return {
      tone: gap <= 0.15 ? "strong" as MatchDetailTone : "ok" as MatchDetailTone,
      label: `${percent(gap)} below budget`,
      text: `This is ${percent(gap)} below your budget. That gives room for transfer costs, repairs, furniture, upgrades, or a stronger emergency fund.`,
    };
  }
  return {
    tone: gap <= 0.08 ? "ok" as MatchDetailTone : "caution" as MatchDetailTone,
    label: `${percent(gap)} above budget`,
    text: `This is ${percent(gap)} above your budget. It may still be worth checking if the location, lot size, condition, or payment terms are clearly better—but confirm financing first.`,
  };
}

function locationDetail(distanceKm: number, exact: boolean, nearbyTag: boolean, hasWanted: boolean, noun = "property") {
  if (!hasWanted) return { tone: "ok" as MatchDetailTone, label: "No selected area", text: "You did not select a preferred area, so MM Pulse did not penalize location. Add a barangay, subdivision, landmark, or neighborhood for sharper results." };
  if (exact) return { tone: "strong" as MatchDetailTone, label: "Very close", text: `This ${noun} is inside or very close to your selected pinned area, so it should strongly match your target route and neighborhood preference.` };
  if (Number.isFinite(distanceKm) && distanceKm <= 2) return { tone: "strong" as MatchDetailTone, label: `${distanceKm.toFixed(1)} km away`, text: `This ${noun} is only ${distanceKm.toFixed(1)} km from your selected pinned area. It is close enough to compare seriously with exact-area options.` };
  if (Number.isFinite(distanceKm) && distanceKm <= 5) return { tone: "ok" as MatchDetailTone, label: `${distanceKm.toFixed(1)} km away`, text: `This ${noun} is ${distanceKm.toFixed(1)} km from your selected pinned area. It is still nearby, but check commute, school/work access, and neighborhood feel.` };
  if (Number.isFinite(distanceKm) && distanceKm <= 8) return { tone: "caution" as MatchDetailTone, label: `${distanceKm.toFixed(1)} km away`, text: `This ${noun} is ${distanceKm.toFixed(1)} km from your selected pinned area. Consider it only if price, size, or condition is meaningfully better.` };
  if (nearbyTag) return { tone: "caution" as MatchDetailTone, label: "Tagged nearby", text: `This ${noun} is tagged near your chosen area, but the pin is not close. Verify the map location before shortlisting.` };
  return { tone: "caution" as MatchDetailTone, label: "Outside area", text: `This ${noun} is outside your preferred area. Only consider it if value, inventory, or payment terms justify the location trade-off.` };
}

function propertyDetails(property: MatchedProperty, input: MatcherInput, distanceKm: number, exact: boolean, nearbyTag: boolean, minBedrooms: number, lifestyleChecks: boolean[], score: number): MatchDetails {
  const bedroomCount = property.bedrooms || 0;
  const fitText = property.bedrooms == null
    ? "Bedroom count is not provided, so confirm the layout before relying on this match."
    : bedroomCount >= minBedrooms
      ? `${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"} for a household of ${input.familySize}. This should be comfortable for the household size you entered.`
      : `${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"} for a household of ${input.familySize}. This may feel tight unless the layout is unusually efficient.`;
  const lifestyle = input.lifestyle.length
    ? {
        tone: lifestyleChecks.filter(Boolean).length === input.lifestyle.length ? "strong" as MatchDetailTone : lifestyleChecks.some(Boolean) ? "ok" as MatchDetailTone : "caution" as MatchDetailTone,
        label: `${lifestyleChecks.filter(Boolean).length}/${input.lifestyle.length} priorities`,
        text: `${lifestyleChecks.filter(Boolean).length} of your ${input.lifestyle.length} selected lifestyle priorities matched. Use this to compare day-to-day fit, not just price.`,
      }
    : undefined;
  return {
    location: locationDetail(distanceKm, exact, nearbyTag, Boolean(input.preferredAreas.length)),
    budget: budgetDetail(property.price, input.budget),
    fit: { tone: property.bedrooms == null || bedroomCount < minBedrooms ? "caution" : "strong", label: property.propertyTypeLabel || "Property fit", text: fitText },
    lifestyle,
    take: takeDetail(score, "property"),
  };
}

function developerProjectDetails(project: DeveloperProjectSearchRow, input: MatcherInput, distanceKm: number, exact: boolean, score: number): MatchDetails {
  const fitText = project.hasLotOnly
    ? "Lot-only inventory is available. This is useful if the buyer wants land first and plans construction later."
    : project.modelCount > 0
      ? `${project.modelCount} house model${project.modelCount === 1 ? "" : "s"} available. Compare turnover timeline, sample computation, and layout against resale listings.`
      : "No active model count is showing, so confirm availability directly before recommending this project.";
  return {
    location: locationDetail(distanceKm, exact, false, Boolean(input.preferredAreas.length), "project"),
    budget: budgetDetail(project.startingPrice, input.budget),
    fit: { tone: project.hasLotOnly && input.propertyType === "lot-only" ? "strong" : project.modelCount > 0 ? "ok" : "caution", label: project.hasLotOnly ? "Lot inventory" : "Project inventory", text: fitText },
    take: takeDetail(score, "project"),
  };
}

function takeDetail(score: number, noun: "property" | "project") {
  const tone: MatchDetailTone = score >= 80 ? "strong" : score >= 55 ? "ok" : "caution";
  return {
    tone,
    label: score >= 80 ? "Worth shortlisting" : score >= 55 ? "Review carefully" : "Lower fit",
    text: score >= 80
      ? `Strong ${noun} option for Davao buyers if documents, actual viewing, financing, and map location check out.`
      : score >= 55
        ? `Possible ${noun} option, but compare the trade-offs carefully before scheduling a viewing or inquiry.`
        : `This ${noun} is not a top fit based on your inputs. Keep it only if one feature matters more than location, budget, or space.`,
  };
}

function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radius = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
