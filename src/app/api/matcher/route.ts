export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { combinedFilterSearchQuery } from "@/lib/postgis/queries";
import { db } from "@/lib/supabase/server";
import { getActiveDeveloperProjects, type DeveloperProjectSearchRow } from "@/lib/developer-inventory";
import type { MatcherInput, MatchedProperty, PropertyTypeSlug } from "@/types/property";

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
  distanceKm: number;
  outsidePreferredArea: boolean;
};

const clean = (value: string | null | undefined) => (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const listingTypes = new Set<PropertyTypeSlug>(["house-and-lot", "condominium", "lot-only", "commercial", "townhouse", "foreclosed"]);

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as MatcherInput;
    if (!input.budget || !input.familySize) {
      return NextResponse.json({ error: "Budget and family size are required." }, { status: 400 });
    }

    const minBedrooms = Math.ceil(input.familySize / 2);
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

    const wanted = input.preferredAreas.map(clean).filter(Boolean);
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

    return NextResponse.json({ results: ranked, developerProjects: projectMatches, weights: { location: 50, budget: 25, bedrooms: 10, lifestyle: 15 } });
  } catch (error) {
    console.error("Matcher failed", error);
    return NextResponse.json({ error: "Could not calculate matches." }, { status: 500 });
  }
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
  const locationReason = !wanted.length
    ? "no preferred location selected"
    : exact
      ? "project is inside or very close to your pinned chosen area"
      : Number.isFinite(distanceKm) && distanceKm <= 8
        ? `project is ${distanceKm.toFixed(1)} km from your pinned chosen area`
        : `project is outside your preferred area${Number.isFinite(distanceKm) ? ` (${distanceKm.toFixed(1)} km away)` : ""}`;
  const inventoryReason = project.hasLotOnly ? "lot-only inventory available" : `${project.modelCount} house model${project.modelCount === 1 ? "" : "s"} available`;
  const priceReason = project.startingPrice ? `${Math.round(budgetGap * 100)}% from your budget` : "price on request";

  return {
    ...project,
    matchScore: score,
    distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : 0,
    outsidePreferredArea: Boolean(wanted.length && !exact && distanceKm > 8),
    matchReason: `${locationReason} · ${priceReason} · ${inventoryReason}.`,
  };
}

function scoreProperty(property: MatchedProperty, input: MatcherInput, minBedrooms: number, wanted: string[], centers: Center[], amenity?: Amenity) {
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

  const locationReason = !wanted.length
    ? "no preferred location selected"
    : exact
      ? "inside or very close to your pinned chosen area"
      : Number.isFinite(distanceKm) && distanceKm <= 8
        ? `${distanceKm.toFixed(1)} km from your pinned chosen area`
        : nearbyTag
          ? "tagged near your chosen area, but no close pin match"
          : `outside your preferred area${Number.isFinite(distanceKm) ? ` (${distanceKm.toFixed(1)} km away)` : ""}`;

  const reasons = [
    locationReason,
    `${Math.round(budgetGap * 100)}% from your budget`,
    property.bedrooms == null ? "bedrooms not provided" : `${property.bedrooms} bedrooms for a household of ${input.familySize}`,
  ];
  if (input.lifestyle.length) reasons.push(`${checks.filter(Boolean).length} of ${checks.length} selected priorities met`);

  return {
    ...property,
    matchScore: score,
    distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : 0,
    outsidePreferredArea: Boolean(wanted.length && !exact && !nearbyTag && distanceKm > 8),
    matchReason: `${reasons.join(" · ")}.`,
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
