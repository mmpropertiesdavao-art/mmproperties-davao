"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchDetails, MatchDetailTone, MatchedProperty, PropertyTypeSlug } from "@/types/property";
import { CompareButton } from "@/components/compare/CompareButton";
import { FavoriteButton } from "@/components/property/FavoriteButton";
import { ValueEstimator } from "@/components/pulse/ValueEstimator";
import { DeveloperProjectCard } from "@/components/developer/DeveloperProjectCard";
import { usePropertyModal } from "@/components/property/PropertyModalProvider";
import { trackEvent } from "@/lib/analytics";

const TAGS = ["near_schools", "near_malls", "near_hospitals", "financing", "parking"];
const PROPERTY_TYPES: { value: "" | PropertyTypeSlug | "new-development"; label: string; hint: string }[] = [
  { value: "", label: "Any property type", hint: "Listings and nearby projects" },
  { value: "house-and-lot", label: "House and Lot", hint: "Resale homes and developer house models" },
  { value: "condominium", label: "Condominium", hint: "Condo listings" },
  { value: "lot-only", label: "Lot Only", hint: "Lot listings and lot-only projects" },
  { value: "commercial", label: "Commercial", hint: "Commercial listings" },
  { value: "townhouse", label: "Townhouse", hint: "Townhouse listings and house models" },
  { value: "new-development", label: "New Development", hint: "Developer projects only" },
];

type PlaceOption = { id: string; name: string; kind?: string; source?: string };
type MatchedDeveloperProject = {
  id: string;
  slug: string;
  projectName: string;
  developerName: string;
  status: string;
  barangay: string | null;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  heroImage: string | null;
  startingPrice: number | null;
  modelCount: number;
  hasLotOnly: boolean;
  availableUnits: number;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  bathroomsMin: number | null;
  bathroomsMax: number | null;
  floorAreaMin: number | null;
  floorAreaMax: number | null;
  lotAreaMin: number | null;
  lotAreaMax: number | null;
  matchScore: number;
  matchReason: string;
  matchDetails?: MatchDetails;
  distanceKm: number;
  outsidePreferredArea: boolean;
};

const shown = (value: number | null | undefined, suffix = "") => (value == null ? "Not provided" : `${value}${suffix}`);

function normalizePropertyType(value: string | null): "" | PropertyTypeSlug | "new-development" {
  const clean = String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");
  const aliases: Record<string, "" | PropertyTypeSlug | "new-development"> = {
    house: "house-and-lot",
    "house-lot": "house-and-lot",
    "house-and-lot": "house-and-lot",
    condo: "condominium",
    condominium: "condominium",
    lot: "lot-only",
    "lot-only": "lot-only",
    commercial: "commercial",
    townhouse: "townhouse",
    "new-development": "new-development",
    developer: "new-development",
    project: "new-development",
  };
  return aliases[clean] || "";
}

function areasFromParams(params: URLSearchParams) {
  const raw = params.getAll("area").concat(params.getAll("location"), params.getAll("preferredArea"), params.getAll("preferredLocation"), params.getAll("areas"));
  return raw.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean).slice(0, 6);
}

function linkForMatcher({ budget, familySize, propertyType, preferredAreas, lifestyle }: { budget: number; familySize: number; propertyType: string; preferredAreas: string[]; lifestyle: string[] }) {
  if (typeof window === "undefined") return "";
  const url = new URL("/matcher", window.location.origin);
  preferredAreas.forEach((area) => url.searchParams.append("area", area));
  if (propertyType) url.searchParams.set("type", propertyType);
  if (budget) url.searchParams.set("budget", String(budget));
  if (familySize) url.searchParams.set("familySize", String(familySize));
  lifestyle.forEach((tag) => url.searchParams.append("tag", tag));
  url.searchParams.set("run", "1");
  return url.toString();
}

function visitor() {
  let id = localStorage.getItem("mm-visitor-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mm-visitor-id", id);
  }
  return id;
}

function track(eventType: string, propertyIds: string[]) {
  if (!propertyIds.length) return;
  trackEvent(`mm_pulse_${eventType}`, { property_ids: propertyIds, result_count: propertyIds.length });
  void fetch("/api/matcher/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: visitor(), eventType, propertyIds }),
  });
}

export default function MMPulse() {
  const [mode, setMode] = useState<"match" | "estimate">("match");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-gold-700">MM Properties intelligence</p>
      <h1 className="mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">MM Pulse</h1>
      <p className="mt-2 max-w-3xl text-base text-navy-600 sm:text-lg">
        Smarter Davao property decisions for buyers, investors, and sellers—discover suitable listings, nearby developer projects, or an indicative market range with transparent local data.
      </p>
      <div className="my-7 grid rounded-lg border bg-white p-1 sm:inline-flex">
        <button onClick={() => setMode("match")} className={`min-h-11 rounded-md px-5 py-2 font-semibold ${mode === "match" ? "bg-navy-900 text-white" : "text-navy-600"}`}>
          Match properties
        </button>
        <button onClick={() => setMode("estimate")} className={`min-h-11 rounded-md px-5 py-2 font-semibold ${mode === "estimate" ? "bg-navy-900 text-white" : "text-navy-600"}`}>
          Estimate value
        </button>
      </div>
      {mode === "match" ? <PropertyMatcher /> : <ValueEstimator />}
    </div>
  );
}

function PropertyMatcher() {
  const [budget, setBudget] = useState(5_000_000);
  const [familySize, setFamilySize] = useState(4);
  const [propertyType, setPropertyType] = useState<"" | PropertyTypeSlug | "new-development">("");
  const [preferredAreas, setAreas] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [results, setResults] = useState<MatchedProperty[]>([]);
  const [developerProjects, setDeveloperProjects] = useState<MatchedDeveloperProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const initializedFromUrl = useRef(false);
  const toggle = (items: string[], value: string, setter: (next: string[]) => void) => setter(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);

  async function submit(overrides?: { budget: number; familySize: number; preferredAreas: string[]; propertyType: "" | PropertyTypeSlug | "new-development"; lifestyle: string[] }) {
    const payload = overrides || { budget, familySize, preferredAreas, propertyType, lifestyle };
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const nextResults = data.results || [];
      const nextProjects = data.developerProjects || [];
      setResults(nextResults);
      setDeveloperProjects(nextProjects);
      trackEvent("mm_pulse_completed", {
        budget: payload.budget,
        family_size: payload.familySize,
        property_type: payload.propertyType || "any",
        preferred_areas: payload.preferredAreas,
        lifestyle: payload.lifestyle,
        listing_result_count: nextResults.length,
        developer_project_count: nextProjects.length,
      });
      if (nextResults.length) track("result_view", nextResults.map((property: MatchedProperty) => property.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find matches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initializedFromUrl.current || typeof window === "undefined") return;
    initializedFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const nextBudget = Number(params.get("budget")) || budget;
    const nextFamilySize = Math.min(10, Math.max(1, Number(params.get("familySize") || params.get("family")) || familySize));
    const nextPropertyType = normalizePropertyType(params.get("type") || params.get("propertyType"));
    const nextAreas = areasFromParams(params);
    const tagParams = params.getAll("tag").concat(params.getAll("priority"));
    const nextLifestyle = Array.from(new Set([
      ...tagParams,
      params.get("financing") === "true" ? "financing" : "",
      params.get("parking") === "true" ? "parking" : "",
    ].filter((tag) => TAGS.includes(tag))));
    const hasPrefill = nextAreas.length || nextPropertyType || params.get("budget") || params.get("familySize") || params.get("family") || nextLifestyle.length;
    if (!hasPrefill) return;
    const nextState = { budget: nextBudget, familySize: nextFamilySize, propertyType: nextPropertyType, preferredAreas: nextAreas, lifestyle: nextLifestyle };
    setBudget(nextBudget);
    setFamilySize(nextFamilySize);
    setPropertyType(nextPropertyType);
    setAreas(nextAreas);
    setLifestyle(nextLifestyle);
    trackEvent("mm_pulse_shared_link_opened", {
      budget: nextBudget,
      family_size: nextFamilySize,
      property_type: nextPropertyType || "any",
      preferred_areas: nextAreas,
      lifestyle: nextLifestyle,
    });
    if (params.get("run") === "1" || params.get("auto") === "1") void submit(nextState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyShareLink() {
    const link = linkForMatcher({ budget, familySize, propertyType, preferredAreas, lifestyle });
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopyNotice("MM Pulse link copied.");
    trackEvent("mm_pulse_link_copied", { property_type: propertyType || "any", preferred_areas: preferredAreas });
    setTimeout(() => setCopyNotice(""), 1800);
  }

  const nearby = results.filter((property) => !property.outsidePreferredArea);
  const outside = results.filter((property) => property.outsidePreferredArea);
  const nearbyProjects = developerProjects.filter((project) => !project.outsidePreferredArea);
  const outsideProjects = developerProjects.filter((project) => project.outsidePreferredArea);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Property matching</h2>
          <p className="mt-2 max-w-3xl text-navy-500">Location carries 50% of the score. MM Pulse now uses your pinned places and neighborhoods, then adds budget, property type, family needs, and lifestyle priorities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyShareLink} className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-bold text-navy-900 hover:border-gold-400 hover:bg-gold-50">
            Copy MM Pulse link
          </button>
          <Link href="/tools/payment-calculator" className="rounded-lg border border-gold-400 px-4 py-2 text-sm font-bold text-navy-900 hover:bg-gold-50">
            Open calculator
          </Link>
        </div>
      </div>
      {copyNotice && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">{copyNotice}</p>}

      <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="font-semibold text-navy-900">
            Budget: PHP {budget.toLocaleString("en-PH")}
            <input type="range" min={1_000_000} max={50_000_000} step={500_000} value={budget} onChange={(event) => setBudget(+event.target.value)} className="mt-2 w-full" />
          </label>
          <label className="font-semibold text-navy-900">
            Family size: {familySize}
            <input type="range" min={1} max={10} value={familySize} onChange={(event) => setFamilySize(+event.target.value)} className="mt-2 w-full" />
          </label>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-navy-900">Property type</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type.value || "any"}
                type="button"
                onClick={() => setPropertyType(type.value)}
                className={`min-h-16 rounded-xl border px-3 py-2 text-left transition ${propertyType === type.value ? "border-gold-500 bg-gold-50 ring-2 ring-gold-100" : "border-navy-100 bg-white hover:border-gold-300"}`}
              >
                <span className="block text-sm font-bold text-navy-900">{type.label}</span>
                <span className="mt-1 block text-xs text-navy-500">{type.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <AreaInput selected={preferredAreas} onChange={setAreas} />
        <Choice title="Other priorities" values={TAGS} selected={lifestyle} toggle={(value) => toggle(lifestyle, value, setLifestyle)} />
        <button onClick={() => void submit()} disabled={loading} className="mt-5 min-h-12 rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-950 disabled:opacity-60">
          {loading ? "Finding matches…" : "Find my matches"}
        </button>
        {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}
      </div>

      {nearby.length > 0 && <ResultSection title={preferredAreas.length ? "Best matching listings in or near your chosen location" : "Best matching listings"} properties={nearby} />}
      {nearbyProjects.length > 0 && <DeveloperProjectSection title="Nearby developer projects" projects={nearbyProjects} />}
      {outside.length > 0 && <ResultSection title="Other listings outside your preferred area" description="These listings match other needs but are farther from your selected location." properties={outside} />}
      {outsideProjects.length > 0 && <DeveloperProjectSection title="Developer projects outside your preferred area" description="These projects may fit your budget or property type, but they are farther from your selected location." projects={outsideProjects} />}
      {!loading && results.length === 0 && developerProjects.length === 0 && <p className="mt-8 rounded-xl border border-dashed border-navy-200 p-8 text-center text-navy-500">Set your preferences and find matching listings or nearby developer projects.</p>}
    </div>
  );
}

function ResultSection({ title, description, properties }: { title: string; description?: string; properties: MatchedProperty[] }) {
  return (
    <section className="mt-9">
      <h2 className="text-2xl font-semibold text-navy-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-navy-500">{description}</p>}
      <div className="mt-4 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{properties.map((property) => <PropertyMatch key={property.id} property={property} />)}</div>
    </section>
  );
}

function DeveloperProjectSection({ title, description, projects }: { title: string; description?: string; projects: MatchedDeveloperProject[] }) {
  return (
    <section className="mt-9">
      <h2 className="text-2xl font-semibold text-navy-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-navy-500">{description}</p>}
      <div className="mt-4 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div key={project.id} className="flex h-full flex-col">
            <RecommendationOutline score={project.matchScore} details={project.matchDetails} fallback={project.matchReason} project />
            <DeveloperProjectCard {...project} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PropertyMatch({ property: p }: { property: MatchedProperty }) {
  const propertyModal = usePropertyModal();
  const openProperty = () => {
    track("listing_click", [p.id]);
    propertyModal?.openProperty(p.slug);
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      <button type="button" onClick={openProperty} className="flex flex-1 flex-col text-left">
        <div className="image-zoom-frame relative h-56 overflow-hidden bg-navy-50">
          <img src={p.coverImageUrl || "/placeholder-property.png"} alt={p.title} className="zoomable-image h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold">{p.matchScore}% match</span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-2 min-h-12 font-semibold text-navy-900">{p.title}</h3>
          <p className="mt-2 text-xl font-bold">PHP {p.price.toLocaleString("en-PH")}</p>
          <p className="text-sm text-navy-500">{p.barangay || p.neighborhoodName}, Davao City</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Spec n="Bedrooms" v={shown(p.bedrooms)} />
            <Spec n="Bathrooms" v={shown(p.bathrooms)} />
            <Spec n="Floor area" v={shown(p.floorAreaSqm, " sqm")} />
            <Spec n="Lot area" v={shown(p.lotAreaSqm, " sqm")} />
            <Spec n="Parking" v={shown(p.parkingSpaces, " space(s)")} />
            <Spec n="Availability" v={p.availability} />
          </dl>
          <RecommendationOutline score={p.matchScore} details={p.matchDetails} fallback={p.matchReason} />
        </div>
      </button>
      <div className="mt-auto flex min-h-16 items-center justify-between gap-3 border-t bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div onClick={() => track("compare_click", [p.id])}>
            <CompareButton className="relative" item={{ id: p.id, slug: p.slug, title: p.title, listingIntent: p.listingIntent }} />
          </div>
          <FavoriteButton propertyId={p.id} className="relative" onAction={() => track("save_click", [p.id])} />
        </div>
        <button type="button" onClick={() => { track("contact_click", [p.id]); propertyModal?.openProperty(p.slug); }} className="inline-flex h-10 items-center justify-center rounded-md bg-navy-900 px-5 text-sm font-semibold text-white">
          Contact
        </button>
      </div>
    </article>
  );
}

function RecommendationOutline({ score, details, fallback, project = false }: { score: number; details?: MatchDetails; fallback: string; project?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const frame = score >= 80 ? "border-green-200 bg-green-50/70" : score >= 55 ? "border-yellow-200 bg-yellow-50/80" : "border-red-200 bg-red-50/80";
  const headingColor = score >= 80 ? "text-green-950" : score >= 55 ? "text-yellow-950" : "text-red-950";
  if (!details) {
    return (
      <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${frame} ${headingColor}`}>
        <p className="font-extrabold">{score}% {project ? "project" : "property"} match</p>
        <p className="mt-1 font-medium">{fallback}</p>
      </div>
    );
  }
  const rows = [
    ["Location", details.location],
    ["Budget", details.budget],
    [project ? "Inventory" : "Property fit", details.fit],
    details.lifestyle ? ["Lifestyle", details.lifestyle] : null,
    ["Our take", details.take],
  ].filter(Boolean) as [string, { tone: MatchDetailTone; label: string; text: string }][];
  const expandedText = rows.map(([title, detail]) => `${title}: ${detail.text}`).join(" ");

  return (
    <div className={`mt-5 rounded-xl border p-2.5 text-sm ${frame}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`font-extrabold ${headingColor}`}>{score}% {project ? "project" : "property"} match</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {rows.map(([title, detail]) => (
          <div key={title} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1.5 shadow-sm">
            <span className="shrink-0 text-[10px] font-black uppercase tracking-tight text-navy-500">{title}:</span>
            <span className={`min-w-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-4 ${toneClass(detail.tone)}`}>{detail.label}</span>
          </div>
        ))}
      </div>
      {expanded && <p className="mt-3 rounded-lg bg-white/85 p-3 text-[13px] leading-5 text-navy-800 shadow-sm">{expandedText}</p>}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
        className="mt-3 text-sm font-bold text-navy-800 underline decoration-gold-400 underline-offset-4"
      >
        {expanded ? "See less" : "See more"}
      </button>
    </div>
  );
}

function toneClass(tone: MatchDetailTone) {
  if (tone === "strong") return "bg-green-100 text-green-800";
  if (tone === "ok") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function Choice({ title, values, selected, toggle }: { title: string; values: string[]; selected: string[]; toggle: (value: string) => void }) {
  return (
    <>
      <p className="mt-5 text-sm font-medium">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <button key={value} type="button" onClick={() => toggle(value)} className={`min-h-10 rounded-full border px-3 py-1 text-sm ${selected.includes(value) ? "bg-navy-900 text-white" : "bg-white text-navy-700"}`}>
            {value.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </>
  );
}

function AreaInput({ selected, onChange }: { selected: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/neighborhood-options")
      .then((response) => response.json())
      .then((data) => setPlaces(Array.isArray(data) ? data.map((item: any) => ({ id: item.id || item.name, name: item.name, source: item.source })) : []))
      .catch(() => setPlaces([]));
  }, []);

  const suggestions = useMemo(() => {
    const term = draft.trim().toLowerCase();
    const base = term ? places.filter((place) => place.name.toLowerCase().includes(term)) : places;
    return base.filter((place) => !selected.some((value) => value.toLowerCase() === place.name.toLowerCase())).slice(0, 8);
  }, [draft, places, selected]);

  function add(value = draft) {
    const nextValue = value.trim();
    if (nextValue && !selected.some((item) => item.toLowerCase() === nextValue.toLowerCase())) onChange([...selected, nextValue].slice(0, 6));
    setDraft("");
    setOpen(false);
  }

  function remove(value: string) {
    onChange(selected.filter((item) => item !== value));
  }

  return (
    <div className="mt-5">
      <p className="text-sm font-medium">Preferred areas</p>
      <p className="mt-1 text-xs text-navy-500">Search neighborhoods, barangays, subdivisions, landmarks, or project areas. Add more than one if the buyer is open to nearby places.</p>
      <div className="relative mt-2" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && setOpen(false)}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setDraft(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add();
              }
            }}
            placeholder="Type a location, e.g. Bajada or SM Lanang"
            className="min-h-12 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm shadow-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-100"
            role="combobox"
            aria-expanded={open}
          />
          <button type="button" onClick={() => add()} className="min-h-12 rounded-xl border border-navy-200 px-5 font-semibold text-navy-900 hover:border-gold-400">
            Add
          </button>
        </div>
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl">
            <div className="max-h-72 overflow-y-auto p-2">
              {suggestions.length ? (
                suggestions.map((place) => (
                  <button key={`${place.source}-${place.id}-${place.name}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(place.name)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-gold-50">
                    <span className="truncate text-sm font-bold text-navy-900">{place.name}</span>
                    <span className="shrink-0 rounded-full bg-navy-50 px-2 py-1 text-[10px] font-bold uppercase text-navy-500">{sourceLabel(place.source)}</span>
                  </button>
                ))
              ) : (
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add()} className="min-h-12 w-full rounded-xl px-3 py-2 text-left text-sm text-navy-600 hover:bg-gold-50">
                  Add “{draft.trim()}” as a custom search area
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((value) => (
            <button type="button" key={value} onClick={() => remove(value)} className="min-h-10 rounded-full bg-navy-900 px-3 py-1 text-sm font-semibold text-white">
              {value} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function sourceLabel(source?: string) {
  if (source === "developer_project") return "Project";
  if (source === "neighborhood") return "Area";
  if (source === "barangay") return "Brgy";
  return "Place";
}

function Spec({ n, v }: { n: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-navy-400">{n}</dt>
      <dd className="font-medium capitalize">{v}</dd>
    </div>
  );
}
