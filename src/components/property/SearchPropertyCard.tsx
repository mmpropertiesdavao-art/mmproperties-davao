"use client";

import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, CarFront, LandPlot, MapPin, Ruler } from "lucide-react";
import { CompareButton } from "@/components/compare/CompareButton";
import { FavoriteButton } from "@/components/property/FavoriteButton";
import { usePropertyModal } from "@/components/property/PropertyModalProvider";

type SearchPropertyCardProps = {
  id: string;
  slug: string;
  title: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  floorAreaSqm: number | null;
  lotAreaSqm?: number | null;
  coverImageUrl: string | null;
  neighborhoodName: string | null;
  barangay?: string | null;
  isForeclosed?: boolean;
  propertyType?: string | null;
  listingIntent?: "sale" | "rent" | "sale_or_rent";
  availability?: string;
  rentPrice?: number | null;
  financingAvailable?: boolean;
  assumeBalanceAvailable?: boolean;
  previousPrice?: number | null;
  agentName?: string | null;
  agencyName?: string | null;
  parkingSpaces?: number | null;
  daysListed?: number;
  viewCount?: number;
  saveCount?: number;
};

function formatPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function compactTitle(value: string) {
  return value.length > 76 ? `${value.slice(0, 76).trim()}...` : value;
}

function intentLabel(value: SearchPropertyCardProps["listingIntent"]) {
  if (value === "rent") return "FOR RENT";
  if (value === "sale_or_rent") return "SALE / RENT";
  return "FOR SALE";
}

function intentClass(value: SearchPropertyCardProps["listingIntent"]) {
  if (value === "rent") return "bg-sky-600";
  if (value === "sale_or_rent") return "bg-violet-600";
  return "bg-emerald-700";
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-1 text-[11px] font-semibold text-navy-700">
      <span className="text-gold-700">{icon}</span>
      {children}
    </span>
  );
}

export function SearchPropertyCard({
  id,
  slug,
  title,
  price,
  bedrooms,
  bathrooms,
  floorAreaSqm,
  lotAreaSqm,
  coverImageUrl,
  neighborhoodName,
  barangay,
  isForeclosed,
  propertyType,
  listingIntent = "sale",
  availability = "available",
  rentPrice,
  financingAvailable,
  assumeBalanceAvailable,
  previousPrice,
  agentName,
  agencyName,
  parkingSpaces,
  daysListed = 0,
  viewCount = 0,
  saveCount = 0,
}: SearchPropertyCardProps) {
  const propertyModal = usePropertyModal();
  const isLotOnly = String(propertyType || "").toLowerCase().includes("lot");
  const pricePerSqm = isLotOnly && lotAreaSqm && price ? price / lotAreaSqm : null;
  const listedBy = agentName || agencyName || "MM Properties";

  return (
    <Link
      href={`/property/${slug}`}
      onClick={(event) => {
        if (!propertyModal) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("button, input, select, textarea, [role='button']")) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        propertyModal.openProperty(slug);
      }}
      className="group overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm transition hover:border-gold-400 hover:shadow-lg"
    >
      <div className="image-zoom-frame relative aspect-[16/10] overflow-hidden bg-navy-50">
        <Image
          src={coverImageUrl || "/placeholder-property.png"}
          alt={title}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 38vw, 100vw"
          className="zoomable-image object-cover"
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          <span className={`rounded-md px-2 py-1 text-[10px] font-black text-white ${intentClass(listingIntent)}`}>
            {intentLabel(listingIntent)}
          </span>
          {financingAvailable && <span className="rounded-md bg-cyan-500 px-2 py-1 text-[10px] font-black text-navy-950">FINANCING</span>}
          {assumeBalanceAvailable && <span className="rounded-md bg-orange-500 px-2 py-1 text-[10px] font-black text-white">ASSUME</span>}
          {isForeclosed && <span className="rounded-md bg-gold-500 px-2 py-1 text-[10px] font-black text-navy-950">FORECLOSED</span>}
          {availability !== "available" && <span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-black uppercase text-white">{availability}</span>}
        </div>
        <FavoriteButton propertyId={id} />
        <CompareButton item={{ id, slug, title, listingIntent }} className="absolute right-2 top-12" />
      </div>

      <div className="p-3">
        {previousPrice && previousPrice > price && (
          <p className="mb-1 text-[11px] font-bold text-red-600">
            <span className="line-through">{formatPeso(previousPrice)}</span> · PRICE DOWN
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-black leading-tight text-navy-950">{formatPeso(price)}</p>
            {listingIntent !== "sale" && rentPrice && <p className="text-xs font-bold text-sky-700">{formatPeso(rentPrice)}/month</p>}
            {pricePerSqm && <p className="text-[11px] font-semibold text-navy-500">{formatPeso(pricePerSqm)}/sqm</p>}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Stat icon={<BedDouble size={13} />}>{bedrooms ?? "-"} bd</Stat>
          <Stat icon={<Bath size={13} />}>{bathrooms ?? "-"} ba</Stat>
          {lotAreaSqm ? <Stat icon={<LandPlot size={13} />}>{lotAreaSqm.toLocaleString("en-PH")} sqm lot</Stat> : null}
          {floorAreaSqm ? <Stat icon={<Ruler size={13} />}>{floorAreaSqm.toLocaleString("en-PH")} sqm floor</Stat> : null}
          {parkingSpaces != null ? <Stat icon={<CarFront size={13} />}>{parkingSpaces} parking</Stat> : null}
        </div>

        <h2 className="mt-2 min-h-[2.5rem] text-sm font-bold leading-5 text-navy-950">{compactTitle(title)}</h2>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-navy-500">
          <MapPin size={13} className="shrink-0 text-gold-600" />
          {barangay || neighborhoodName || "Davao City"}, Davao City
        </p>
        <div className="mt-3 border-t border-navy-100 pt-2 text-[11px] leading-5 text-navy-500">
          <p className="truncate font-semibold text-navy-700">Listed by {listedBy}</p>
          <p>{daysListed} days · {viewCount} views · {saveCount} saves</p>
        </div>
      </div>
    </Link>
  );
}
