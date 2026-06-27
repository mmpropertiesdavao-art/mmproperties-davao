// src/components/search/FilterBar.tsx
"use client";
import { useEffect, useState } from "react";
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
  { label: "₱1M – ₱3M", min: 1_000_000, max: 3_000_000 },
  { label: "₱3M – ₱5M", min: 3_000_000, max: 5_000_000 },
  { label: "₱5M – ₱10M", min: 5_000_000, max: 10_000_000 },
  { label: "₱10M+", min: 10_000_000, max: undefined },
];

const AMORTIZATION_TIERS = [10_000, 20_000, 30_000, 50_000];
const DOWNPAYMENT_TIERS = [10, 20, 30];

interface FilterBarProps {
  onChange: (filters: PropertySearchFilters) => void;
}

export function FilterBar({ onChange }: FilterBarProps) {
  const [filters, setFilters] = useState<PropertySearchFilters>({});
  const [developers,setDevelopers]=useState<{id:string;name:string}[]>([]);
  const [open,setOpen]=useState(false);
  useEffect(()=>{fetch("/api/developers").then(r=>r.json()).then(setDevelopers).catch(()=>{})},[]);

  function update(partial: Partial<PropertySearchFilters>) {
    const next = { ...filters, ...partial };
    setFilters(next);
    onChange(next);
  }

  return (
    <div className="border-b bg-white p-4">
      <button type="button" onClick={()=>setOpen(value=>!value)} className="mb-3 flex w-full items-center justify-between rounded-lg border border-navy-200 px-4 py-3 text-sm font-semibold text-navy-900 md:hidden" aria-expanded={open}>
        Filters
        <span>{open ? "Hide" : "Show"}</span>
      </button>
      <div className={`${open ? "grid" : "hidden"} gap-3 md:flex md:flex-wrap`}>
      <select className="w-full rounded-md border px-3 py-2 text-sm md:w-auto" onChange={(e) => update({ listingIntent: (e.target.value || undefined) as PropertySearchFilters["listingIntent"] })}>
        <option value="">For sale or rent</option><option value="sale">For sale</option><option value="rent">For rent</option><option value="sale_or_rent">Sale or rent</option>
      </select>
      <select
        className="w-full rounded-md border px-3 py-2 text-sm md:w-auto"
        onChange={(e) => {
          const band = PRICE_BANDS[Number(e.target.value)];
          update({ minPrice: band?.min, maxPrice: band?.max });
        }}
      >
        <option value="">Price range</option>
        {PRICE_BANDS.map((band, i) => (
          <option key={band.label} value={i}>
            {band.label}
          </option>
        ))}
      </select>

      <select
        className="w-full rounded-md border px-3 py-2 text-sm md:w-auto"
        onChange={(e) => update({ propertyType: (e.target.value || undefined) as PropertyTypeSlug | undefined })}
      >
        <option value="">Property type</option>
        {PROPERTY_TYPES.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.label}
          </option>
        ))}
      </select>

      <select className="w-full rounded-md border px-3 py-2 text-sm md:w-auto" onChange={(e) => update({ minBedrooms: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">Bedrooms</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}+ bd
          </option>
        ))}
      </select>

      <select
        className="w-full rounded-md border px-3 py-2 text-sm md:w-auto"
        onChange={(e) => update({ maxMonthlyAmortization: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">Monthly amortization</option>
        {AMORTIZATION_TIERS.map((v) => (
          <option key={v} value={v}>
            up to ₱{v.toLocaleString()}
          </option>
        ))}
      </select>

      <select
        className="w-full rounded-md border px-3 py-2 text-sm md:w-auto"
        onChange={(e) => update({ minDownpaymentPercent: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">Downpayment</option>
        {DOWNPAYMENT_TIERS.map((v) => (
          <option key={v} value={v}>
            {v}%
          </option>
        ))}
      </select>

      <select className="w-full rounded-md border px-3 py-2 text-sm md:w-auto" onChange={(e) => update({ developerName: e.target.value || undefined })}>
        <option value="">Developer</option>
        {developers.map((d) => (
          <option key={d.id} value={d.name}>
            {d.name}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2 rounded-lg bg-navy-50 p-3 md:bg-transparent md:p-0">
      <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
        <input type="checkbox" checked={Boolean(filters.financingAvailable)} onChange={(e) => update({ financingAvailable: e.target.checked || undefined })} />
        Financing available
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
        <input type="checkbox" checked={Boolean(filters.assumeBalanceAvailable)} onChange={(e) => update({ assumeBalanceAvailable: e.target.checked || undefined })} />
        Assume balance
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
        <input type="checkbox" onChange={(e) => update({ isForeclosed: e.target.checked || undefined })} />
        Foreclosed only
      </label>
      </div>
      {(filters.financingAvailable || filters.assumeBalanceAvailable || filters.isForeclosed) && <div className="flex flex-wrap items-center gap-1.5 text-xs"><span className="font-medium text-navy-500">Active:</span>{filters.financingAvailable&&<span className="rounded-full bg-cyan-100 px-2 py-1 font-semibold text-cyan-800">Financing</span>}{filters.assumeBalanceAvailable&&<span className="rounded-full bg-orange-100 px-2 py-1 font-semibold text-orange-800">Assume balance</span>}{filters.isForeclosed&&<span className="rounded-full bg-gold-100 px-2 py-1 font-semibold text-gold-800">Foreclosed</span>}</div>}
      </div>
    </div>
  );
}
