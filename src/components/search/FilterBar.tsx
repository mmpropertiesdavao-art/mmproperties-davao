// src/components/search/FilterBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { PropertySearchFilters, PropertyTypeSlug } from "@/types/property";

const PROPERTY_TYPES: { slug: PropertyTypeSlug; label: string }[] = [
  { slug: "house-and-lot", label: "House and Lot" },
  { slug: "condominium", label: "Condominium" },
  { slug: "lot-only", label: "Lot Only" },
  { slug: "commercial", label: "Commercial Property" },
  { slug: "townhouse", label: "Townhouse" },
  { slug: "foreclosed", label: "Foreclosed Property" },
];

const PRICE_BANDS = [
  { label: "PHP 1M - 3M", min: 1_000_000, max: 3_000_000 },
  { label: "PHP 3M - 5M", min: 3_000_000, max: 5_000_000 },
  { label: "PHP 5M - 10M", min: 5_000_000, max: 10_000_000 },
  { label: "PHP 10M+", min: 10_000_000, max: undefined },
];

const AMORTIZATION_TIERS = [10_000, 20_000, 30_000, 50_000];
const DOWNPAYMENT_TIERS = [10, 20, 30];
const filterSelect =
  "min-h-11 w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-800 shadow-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-100 md:w-auto";

interface FilterBarProps {
  onChange: (filters: PropertySearchFilters) => void;
}

type NeighborhoodOption = {
  id: string | null;
  name: string;
  source: "neighborhood" | "barangay" | "place" | "developer_project";
  kind?: string;
  listingCount?: number;
  projectCount?: number;
  aliases?: string[];
};

export function FilterBar({ onChange }: FilterBarProps) {
  const [filters, setFilters] = useState<PropertySearchFilters>({});
  const [developers, setDevelopers] = useState<{ id: string; name: string }[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/developers")
      .then((response) => response.json())
      .then((data) => setDevelopers(Array.isArray(data) ? data : []))
      .catch(() => setDevelopers([]));
  }, []);

  useEffect(() => {
    fetch("/api/neighborhood-options")
      .then((response) => response.json())
      .then((data) => setNeighborhoods(Array.isArray(data) ? data : []))
      .catch(() => setNeighborhoods([]));
  }, []);

  function update(partial: Partial<PropertySearchFilters>) {
    const next = { ...filters, ...partial };
    setFilters(next);
    onChange(next);
  }

  function updateNeighborhood(value: string, option?: NeighborhoodOption | null) {
    const exact = option || neighborhoods.find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
    update({
      neighborhoodId: exact?.source === "neighborhood" && exact.id ? exact.id : undefined,
      barangay: value.trim() || undefined,
    });
  }

  return (
    <div className="sticky top-20 z-[2000] border-b bg-white p-3 shadow-sm md:p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-navy-800 bg-navy-950 px-4 py-3 text-sm font-bold text-white md:hidden"
        aria-expanded={open}
      >
        Filters
        <span className="rounded-full bg-gold-500 px-3 py-1 text-xs text-navy-950">{open ? "Hide" : "Show"}</span>
      </button>

      <div className={`${open ? "grid" : "hidden"} gap-2.5 md:flex md:flex-wrap md:items-start`}>
        <select className={filterSelect} onChange={(event) => update({ listingIntent: (event.target.value || undefined) as PropertySearchFilters["listingIntent"] })}>
          <option value="">For sale or rent</option>
          <option value="sale">For sale</option>
          <option value="rent">For rent</option>
          <option value="sale_or_rent">Sale or rent</option>
        </select>

        <select
          className={filterSelect}
          onChange={(event) => {
            const band = PRICE_BANDS[Number(event.target.value)];
            update({ minPrice: band?.min, maxPrice: band?.max });
          }}
        >
          <option value="">Price range</option>
          {PRICE_BANDS.map((band, index) => (
            <option key={band.label} value={index}>
              {band.label}
            </option>
          ))}
        </select>

        <select className={filterSelect} onChange={(event) => update({ propertyType: (event.target.value || undefined) as PropertyTypeSlug | undefined })}>
          <option value="">Property type</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type.slug} value={type.slug}>
              {type.label}
            </option>
          ))}
        </select>

        <NeighborhoodCombobox options={neighborhoods} onChange={updateNeighborhood} />

        <select className={filterSelect} onChange={(event) => update({ minBedrooms: event.target.value ? Number(event.target.value) : undefined })}>
          <option value="">Bedrooms</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value === 5 ? "5+" : value}
            </option>
          ))}
        </select>

        <select className={filterSelect} onChange={(event) => update({ maxMonthlyAmortization: event.target.value ? Number(event.target.value) : undefined })}>
          <option value="">Monthly amortization</option>
          {AMORTIZATION_TIERS.map((value) => (
            <option key={value} value={value}>
              up to PHP {value.toLocaleString("en-PH")}
            </option>
          ))}
        </select>

        <select className={filterSelect} onChange={(event) => update({ minDownpaymentPercent: event.target.value ? Number(event.target.value) : undefined })}>
          <option value="">Downpayment</option>
          {DOWNPAYMENT_TIERS.map((value) => (
            <option key={value} value={value}>
              {value}%
            </option>
          ))}
        </select>

        <select className={filterSelect} onChange={(event) => update({ developerName: event.target.value || undefined })}>
          <option value="">Developer</option>
          {developers.map((developer) => (
            <option key={developer.id} value={developer.name}>
              {developer.name}
            </option>
          ))}
        </select>

        <div className="grid gap-2 rounded-xl bg-navy-50 p-3 md:flex md:flex-row md:items-center md:bg-transparent md:p-0">
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
            <input type="checkbox" checked={Boolean(filters.financingAvailable)} onChange={(event) => update({ financingAvailable: event.target.checked || undefined })} />
            Financing available
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
            <input type="checkbox" checked={Boolean(filters.assumeBalanceAvailable)} onChange={(event) => update({ assumeBalanceAvailable: event.target.checked || undefined })} />
            Assume balance
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
            <input type="checkbox" checked={Boolean(filters.isForeclosed)} onChange={(event) => update({ isForeclosed: event.target.checked || undefined })} />
            Foreclosed only
          </label>
        </div>

        {(filters.financingAvailable || filters.assumeBalanceAvailable || filters.isForeclosed) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-navy-500">Active:</span>
            {filters.financingAvailable && <span className="rounded-full bg-cyan-100 px-2 py-1 font-semibold text-cyan-800">Financing</span>}
            {filters.assumeBalanceAvailable && <span className="rounded-full bg-orange-100 px-2 py-1 font-semibold text-orange-800">Assume balance</span>}
            {filters.isForeclosed && <span className="rounded-full bg-gold-100 px-2 py-1 font-semibold text-gold-800">Foreclosed</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function NeighborhoodCombobox({ options, onChange }: { options: NeighborhoodOption[]; onChange: (value: string, option?: NeighborhoodOption | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? options.filter((option) => [option.name, ...(option.aliases || [])].some((value) => value.toLowerCase().includes(term)))
      : options;
    return filtered.slice(0, 12);
  }, [options, query]);

  function select(option: NeighborhoodOption) {
    setQuery(option.name);
    setOpen(false);
    onChange(option.name, option);
  }

  function clear() {
    setQuery("");
    setOpen(false);
    onChange("", null);
  }

  return (
    <div
      className="relative w-full md:w-60"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="relative">
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            onChange(event.target.value);
          }}
          className={`${filterSelect} pr-16 md:w-full`}
          placeholder="Neighborhood"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="neighborhood-filter-options"
        />
        <button
          type="button"
          onClick={() => (query ? clear() : setOpen((value) => !value))}
          className="absolute right-2 top-1/2 min-h-8 -translate-y-1/2 rounded-full bg-navy-50 px-2.5 text-xs font-bold text-navy-600 hover:bg-gold-100"
          aria-label={query ? "Clear neighborhood" : "Open neighborhood options"}
        >
          {query ? "×" : "⌄"}
        </button>
      </div>
      {open && (
        <div id="neighborhood-filter-options" className="absolute left-0 right-0 top-[calc(100%+6px)] z-[2100] overflow-hidden rounded-xl border border-navy-200 bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto py-1">
            {results.length > 0 ? (
              results.map((option) => (
                <button
                  key={`${option.source}-${option.id || option.name}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-navy-800 hover:bg-gold-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.name}</span>
                    {option.aliases?.length ? <span className="block truncate text-[10px] font-medium text-navy-400">Also known as {option.aliases.slice(0, 2).join(", ")}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {optionCount(option) ? <span className="text-[10px] font-bold text-navy-400">{optionCount(option)}</span> : null}
                    <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-navy-500">{sourceLabel(option)}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-navy-500">No matching neighborhood yet. We will still search what you typed.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function sourceLabel(option: NeighborhoodOption) {
  if (option.source === "developer_project") return option.kind === "project" ? "Project" : "Project area";
  if (option.source === "neighborhood") return "Area";
  if (option.source === "barangay") return "Brgy";
  if (option.kind === "subdivision") return "Subdivision";
  if (option.kind === "landmark") return "Landmark";
  if (option.kind === "district") return "District";
  return "Place";
}

function optionCount(option: NeighborhoodOption) {
  const listings = Number(option.listingCount || 0);
  const projects = Number(option.projectCount || 0);
  if (listings && projects) return `${listings} + ${projects}`;
  if (listings) return `${listings} listing${listings === 1 ? "" : "s"}`;
  if (projects) return `${projects} project${projects === 1 ? "" : "s"}`;
  return "";
}
