"use client";

import Link from "next/link";
import { Bath, BedDouble, Building2, Home, MapPin, Ruler, Square } from "lucide-react";
import { useDeveloperProjectModal } from "@/components/developer/DeveloperProjectModalProvider";

type DeveloperProjectCardProps = {
  slug: string;
  projectName: string;
  developerName: string;
  status: string;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  heroImage?: string | null;
  startingPrice?: number | null;
  modelCount: number;
  availableUnits: number;
  bedroomsMin?: number | null;
  bedroomsMax?: number | null;
  bathroomsMin?: number | null;
  bathroomsMax?: number | null;
  floorAreaMin?: number | null;
  floorAreaMax?: number | null;
  lotAreaMin?: number | null;
  lotAreaMax?: number | null;
};

function formatPeso(value: number | null | undefined) {
  if (!value) return "Price on request";
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function formatRange(min?: number | null, max?: number | null, suffix = "") {
  if (min == null && max == null) return "—";
  if (min === max || max == null) return `${min}${suffix}`;
  if (min == null) return `${max}${suffix}`;
  return `${min} - ${max}${suffix}`;
}

export function DeveloperProjectCard({
  slug,
  projectName,
  developerName,
  status,
  barangay,
  city = "Davao City",
  province,
  heroImage,
  startingPrice,
  modelCount,
  availableUnits,
  bedroomsMin,
  bedroomsMax,
  bathroomsMin,
  bathroomsMax,
  floorAreaMin,
  floorAreaMax,
  lotAreaMin,
  lotAreaMax,
}: DeveloperProjectCardProps) {
  const modal = useDeveloperProjectModal();

  return (
    <Link
      href={`/projects/${slug}`}
      onClick={(event) => {
        if (!modal) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("button, input, select, textarea, [role='button']")) return;
        event.preventDefault();
        modal.openProject(slug);
      }}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-violet-100 bg-white transition-all hover:border-violet-400 hover:shadow-lg"
    >
      <div className="image-zoom-frame relative aspect-[4/3] overflow-hidden bg-navy-50">
        <img src={heroImage || "/placeholder-property.png"} alt={projectName} className="zoomable-image h-full w-full object-cover" loading="lazy" />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
          <span className="rounded-md bg-violet-600 px-2 py-1 text-xs font-bold uppercase text-white">New Development</span>
          <span className="rounded-md bg-gold-500 px-2 py-1 text-xs font-bold uppercase text-navy-950">{status.replace(/_/g, " ")}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{developerName}</p>
        <p className="text-lg font-semibold text-navy-900">Starting from {formatPeso(startingPrice)}</p>
        <p className="mt-1 font-medium text-navy-800">{projectName}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-navy-400">
          <MapPin size={14} className="text-gold-600" />
          {[barangay, city, province].filter(Boolean).join(", ")}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-navy-600">
          <Spec icon={<Home size={14} />}>{modelCount} models</Spec>
          <Spec icon={<Building2 size={14} />}>{availableUnits} units</Spec>
          <Spec icon={<BedDouble size={14} />}>{formatRange(bedroomsMin, bedroomsMax)} bd</Spec>
          <Spec icon={<Bath size={14} />}>{formatRange(bathroomsMin, bathroomsMax)} ba</Spec>
          <Spec icon={<Ruler size={14} />}>{formatRange(floorAreaMin, floorAreaMax, " sqm")} floor</Spec>
          <Spec icon={<Square size={14} />}>{formatRange(lotAreaMin, lotAreaMax, " sqm")} lot</Spec>
        </div>

        <p className="mt-auto border-t border-navy-100 pt-3 text-xs font-semibold text-violet-700">
          Click photo/card to view inventory details
        </p>
      </div>
    </Link>
  );
}

function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 font-semibold">{icon}{children}</span>;
}
