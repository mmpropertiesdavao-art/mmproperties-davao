"use client";

import Image from "next/image";
import { useState } from "react";
import { Bath, BedDouble, Car, MapPin, Ruler, Square } from "lucide-react";
import { FavoriteButton } from "@/components/property/FavoriteButton";
import { CompareButton } from "@/components/compare/CompareButton";
import { PropertyQuickViewModal } from "@/components/property/PropertyQuickViewModal";

interface PropertyCardProps {
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
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  propertyType?: string | null;
  listingIntent?: "sale" | "rent" | "sale_or_rent";
  availability?: string;
  rentPrice?: number | null;
  financingAvailable?: boolean;
  assumeBalanceAvailable?: boolean;
  previousPrice?: number | null;
  agentName?: string | null;
  agencyName?: string | null;
  listedByName?: string | null;
  listedByRole?: string | null;
  carport?: number | null;
  daysListed?: number;
  viewCount?: number;
  saveCount?: number;
}

function formatPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function normalizePropertyType(propertyType?: string | null) {
  return String(propertyType || "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .trim();
}

function isHouseAndLotType(propertyType?: string | null) {
  const normalized = normalizePropertyType(propertyType);

  return (
    normalized.includes("house") ||
    normalized.includes("bungalow") ||
    normalized.includes("townhouse") ||
    normalized.includes("duplex") ||
    normalized.includes("home")
  );
}

function shouldShowPricePerSqm(propertyType?: string | null, title?: string) {
  const normalized = normalizePropertyType(`${propertyType || ""} ${title || ""}`);

  if (isHouseAndLotType(normalized)) {
    return false;
  }

  return (
    normalized === "lot" ||
    normalized === "lot only" ||
    normalized.includes("lot only") ||
    normalized.includes("commercial lot") ||
    normalized.includes("residential lot") ||
    normalized.includes("farm lot") ||
    normalized.includes("beach lot") ||
    normalized.includes("industrial lot") ||
    normalized.includes("land")
  );
}

function getListedByName(params: {
  listedByName?: string | null;
  agentName?: string | null;
  agencyName?: string | null;
}) {
  if (params.listedByName) return params.listedByName;
  if (params.agentName) return params.agentName;
  if (params.agencyName) return params.agencyName;

  return "MM Properties";
}

function SpecItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {icon}
      <span>{children}</span>
    </span>
  );
}

export function PropertyCard({
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
  listedByName,
  listedByRole,
  carport,
  daysListed = 0,
  viewCount = 0,
  saveCount = 0,
}: PropertyCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const pricePerSqm =
    shouldShowPricePerSqm(propertyType, title) && lotAreaSqm && price
      ? price / lotAreaSqm
      : null;

  const displayListedByName = getListedByName({
    listedByName,
    agentName,
    agencyName,
  });

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setQuickViewOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setQuickViewOpen(true);
          }
        }}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-navy-100 bg-white transition-all hover:border-gold-400 hover:shadow-lg"
      >
        <div className="image-zoom-frame relative aspect-[4/3] overflow-hidden">
          <Image
            src={coverImageUrl || "/placeholder-property.png"}
            alt={title}
            fill
            className="zoomable-image object-cover"
          />

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
            <span
              className={`rounded-md px-2 py-1 text-xs font-bold text-white ${
                listingIntent === "rent"
                  ? "bg-sky-600"
                  : listingIntent === "sale_or_rent"
                    ? "bg-violet-600"
                    : "bg-emerald-700"
              }`}
            >
              {listingIntent === "rent"
                ? "FOR RENT"
                : listingIntent === "sale_or_rent"
                  ? "SALE / RENT"
                  : "FOR SALE"}
            </span>

            {availability !== "available" && (
              <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold uppercase text-white">
                {availability}
              </span>
            )}

            {isForeclosed && (
              <span className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-navy-900">
                Foreclosed
              </span>
            )}

            {financingAvailable && (
              <span className="rounded-md bg-cyan-500 px-2 py-1 text-xs font-bold text-navy-950">
                FINANCING
              </span>
            )}

            {assumeBalanceAvailable && (
              <span className="rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white">
                ASSUME
              </span>
            )}
          </div>

          <div onClick={(event) => event.stopPropagation()}>
            <FavoriteButton propertyId={id} />
          </div>

          <div onClick={(event) => event.stopPropagation()}>
            <CompareButton
              item={{ id, slug, title, listingIntent }}
              className="absolute right-3 top-14"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          {previousPrice && previousPrice > price && (
            <p className="text-xs font-medium text-red-600">
              <span className="line-through">{formatPeso(previousPrice)}</span>{" "}
              · PRICE DOWN
            </p>
          )}

          <p className="text-lg font-semibold text-navy-900">
            {formatPeso(price)}
          </p>

          {listingIntent !== "sale" && rentPrice && (
            <p className="text-sm font-semibold text-sky-700">
              {formatPeso(rentPrice)}/month
            </p>
          )}

          {pricePerSqm && (
            <p className="text-xs font-medium text-navy-500">
              {formatPeso(pricePerSqm)}/sqm
            </p>
          )}

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-400">
            <SpecItem icon={<BedDouble size={14} className="text-navy-700" />}>
              {bedrooms ?? "-"} bd
            </SpecItem>

            <SpecItem icon={<Bath size={14} className="text-gold-600" />}>
              {bathrooms ?? "-"} ba
            </SpecItem>

            {lotAreaSqm ? (
              <SpecItem icon={<Square size={14} className="text-navy-600" />}>
                {lotAreaSqm.toLocaleString("en-PH")} sqm lot
              </SpecItem>
            ) : (
              <SpecItem icon={<Square size={14} className="text-navy-600" />}>
                -
              </SpecItem>
            )}

            {floorAreaSqm ? (
              <SpecItem icon={<Ruler size={14} className="text-gold-600" />}>
                {floorAreaSqm.toLocaleString("en-PH")} sqm floor
              </SpecItem>
            ) : null}

            {carport !== undefined && carport !== null ? (
              <SpecItem icon={<Car size={14} className="text-navy-700" />}>
                {carport} carport
              </SpecItem>
            ) : null}
          </p>

          <p className="mt-1 truncate font-medium text-navy-800">
            {title}
          </p>

          <p className="flex items-center gap-1 text-sm text-navy-400">
            <MapPin size={14} className="text-gold-600" />{" "}
            {barangay || neighborhoodName || "Davao City"}, Davao City
          </p>

          <div className="mt-auto border-t border-navy-100 pt-3 text-xs text-navy-500">
            <p className="text-[11px] uppercase tracking-wide text-navy-400">
              Listed by
            </p>

            <p className="font-medium text-navy-700">
              {displayListedByName}
              {listedByRole ? ` · ${listedByRole}` : ""}
            </p>

            <p className="mt-1">
              {daysListed} days on MM Properties · {viewCount} views · {saveCount} saves
            </p>
          </div>
        </div>
      </article>

      <PropertyQuickViewModal
        slug={slug}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        fallbackTitle={title}
        fallbackImageUrl={coverImageUrl}
      />
    </>
  );
}