"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bath,
  BedDouble,
  Car,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Ruler,
  Square,
  X,
} from "lucide-react";

import { InquiryForm } from "@/components/property/InquiryForm";
import type { Property } from "@/types/property";

type QuickViewImage = {
  url: string;
  altText: string | null;
};

type QuickViewResponse = {
  property: Property;
  images: QuickViewImage[];
};

interface PropertyQuickViewModalProps {
  slug: string;
  open: boolean;
  onClose: () => void;
  fallbackTitle: string;
  fallbackImageUrl: string | null;
}

function formatPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function normalizePropertyType(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .trim();
}

function isHouseType(value?: string | null) {
  const normalized = normalizePropertyType(value);

  return (
    normalized.includes("house") ||
    normalized.includes("bungalow") ||
    normalized.includes("townhouse") ||
    normalized.includes("duplex") ||
    normalized.includes("home")
  );
}

function shouldShowPricePerSqm(property: Property) {
  const joined = normalizePropertyType(
    `${property.propertyType || ""} ${property.propertyTypeLabel || ""} ${property.title || ""}`
  );

  if (isHouseType(joined)) return false;

  return (
    property.propertyType === "lot-only" ||
    joined.includes("lot only") ||
    joined.includes("commercial lot") ||
    joined.includes("residential lot") ||
    joined.includes("farm lot") ||
    joined.includes("beach lot") ||
    joined.includes("industrial lot") ||
    joined.includes("land")
  );
}

function getListedByName(property: Property) {
  if (property.listedByName) return property.listedByName;
  if (property.agentName) return property.agentName;
  if (property.agencyName) return property.agencyName;

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
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-navy-500">
      {icon}
      <span>{children}</span>
    </span>
  );
}

export function PropertyQuickViewModal({
  slug,
  open,
  onClose,
  fallbackTitle,
  fallbackImageUrl,
}: PropertyQuickViewModalProps) {
  const [data, setData] = useState<QuickViewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setLoading(true);
    setError(null);
    setDescriptionExpanded(false);
    setActiveImageIndex(0);

    fetch(`/api/properties/${encodeURIComponent(slug)}/quick-view`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load property preview.");
        return response.json();
      })
      .then((responseData: QuickViewResponse) => {
        if (cancelled) return;
        setData(responseData);
      })
      .catch((caughtError) => {
        if (cancelled) return;

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load property preview."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const property = data?.property;

  const images = useMemo(() => {
    if (data?.images?.length) return data.images;

    if (fallbackImageUrl) {
      return [
        {
          url: fallbackImageUrl,
          altText: fallbackTitle,
        },
      ];
    }

    return [
      {
        url: "/placeholder-property.png",
        altText: fallbackTitle,
      },
    ];
  }, [data?.images, fallbackImageUrl, fallbackTitle]);

  const activeImage = images[activeImageIndex] || images[0];

  const cleanDescription = String(property?.description || "").trim();
  const descriptionLimit = 360;
  const shouldTruncateDescription = cleanDescription.length > descriptionLimit;

  const visibleDescription = useMemo(() => {
    if (!cleanDescription) return "No description has been added for this listing yet.";

    if (!shouldTruncateDescription || descriptionExpanded) {
      return cleanDescription;
    }

    return `${cleanDescription.slice(0, descriptionLimit).trim()}...`;
  }, [cleanDescription, descriptionExpanded, shouldTruncateDescription]);

  if (!open) return null;

  function showPreviousImage() {
    setActiveImageIndex((current) =>
      current <= 0 ? images.length - 1 : current - 1
    );
  }

  function showNextImage() {
    setActiveImageIndex((current) =>
      current >= images.length - 1 ? 0 : current + 1
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 px-3 py-4"
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-[1.2fr_0.8fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/95 p-2 text-navy-700 shadow transition hover:bg-white hover:text-navy-950"
          aria-label="Close quick view"
        >
          <X size={20} />
        </button>

        <section className="flex min-h-[360px] flex-col bg-black lg:min-h-[720px]">
          <div className="relative flex-1">
            <Image
              src={activeImage?.url || "/placeholder-property.png"}
              alt={activeImage?.altText || property?.title || fallbackTitle}
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 60vw, 100vw"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-800 shadow transition hover:bg-white"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-800 shadow transition hover:bg-white"
                  aria-label="Next photo"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              {activeImageIndex + 1} / {images.length}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-black p-3">
              {images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border ${
                    index === activeImageIndex
                      ? "border-gold-500"
                      : "border-white/20"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.altText || property?.title || fallbackTitle}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="max-h-[94vh] overflow-y-auto">
          {loading && (
            <div className="flex min-h-[420px] items-center justify-center p-8 text-navy-600">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Loading property details...
            </div>
          )}

          {!loading && error && (
            <div className="p-8">
              <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>

              <Link
                href={`/property/${slug}`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
              >
                View full details
                <ExternalLink size={15} />
              </Link>
            </div>
          )}

          {!loading && property && (
            <div className="p-5 lg:p-6">
              <div className="mb-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-md px-3 py-1 text-xs font-bold text-white ${
                    property.listingIntent === "rent"
                      ? "bg-sky-600"
                      : property.listingIntent === "sale_or_rent"
                        ? "bg-violet-600"
                        : "bg-emerald-700"
                  }`}
                >
                  {property.listingIntent === "rent"
                    ? "FOR RENT"
                    : property.listingIntent === "sale_or_rent"
                      ? "SALE / RENT"
                      : "FOR SALE"}
                </span>

                {property.availability !== "available" && (
                  <span className="rounded-md bg-slate-800 px-3 py-1 text-xs font-bold uppercase text-white">
                    {property.availability}
                  </span>
                )}

                {property.financingAvailable && (
                  <span className="rounded-md bg-cyan-500 px-3 py-1 text-xs font-bold text-navy-950">
                    FINANCING
                  </span>
                )}

                {property.assumeBalanceAvailable && (
                  <span className="rounded-md bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                    ASSUME
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold leading-tight text-navy-950">
                {property.title}
              </h2>

              <p className="mt-2 flex items-center gap-1 text-sm text-navy-500">
                <MapPin size={15} className="text-gold-600" />
                {property.barangay || property.neighborhoodName || "Davao City"}, Davao City
              </p>

              {property.previousPrice && property.previousPrice > property.price && (
                <p className="mt-4 text-sm font-semibold text-red-600">
                  <span className="line-through">
                    {formatPeso(property.previousPrice)}
                  </span>{" "}
                  · PRICE DOWN
                </p>
              )}

              <p className="mt-2 text-3xl font-bold text-navy-950">
                {formatPeso(property.price)}
              </p>

              {property.listingIntent !== "sale" && property.rentPrice && (
                <p className="mt-1 text-lg font-semibold text-sky-700">
                  {formatPeso(property.rentPrice)}/month
                </p>
              )}

              {shouldShowPricePerSqm(property) && property.lotAreaSqm && (
                <p className="mt-1 text-sm font-medium text-navy-500">
                  {formatPeso(property.price / property.lotAreaSqm)}/sqm
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-y border-navy-100 py-4">
                <SpecItem icon={<BedDouble size={15} className="text-navy-700" />}>
                  {property.bedrooms ?? "-"} bd
                </SpecItem>

                <SpecItem icon={<Bath size={15} className="text-gold-600" />}>
                  {property.bathrooms ?? "-"} ba
                </SpecItem>

                {property.lotAreaSqm !== null && property.lotAreaSqm !== undefined && (
                  <SpecItem icon={<Square size={15} className="text-navy-600" />}>
                    {property.lotAreaSqm.toLocaleString("en-PH")} sqm lot
                  </SpecItem>
                )}

                {property.floorAreaSqm !== null && property.floorAreaSqm !== undefined && (
                  <SpecItem icon={<Ruler size={15} className="text-gold-600" />}>
                    {property.floorAreaSqm.toLocaleString("en-PH")} sqm floor
                  </SpecItem>
                )}

                {property.carport !== null && property.carport !== undefined && (
                  <SpecItem icon={<Car size={15} className="text-navy-700" />}>
                    {property.carport} carport
                  </SpecItem>
                )}
              </div>

              <section className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-navy-700">
                  {visibleDescription}
                </p>

                {shouldTruncateDescription && (
                  <button
                    type="button"
                    onClick={() =>
                      setDescriptionExpanded((current) => !current)
                    }
                    className="mt-2 text-sm font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4"
                  >
                    {descriptionExpanded ? "See less" : "See more"}
                  </button>
                )}
              </section>

              <section className="mt-5 rounded-xl border border-navy-100 bg-navy-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Listed by
                </p>

                <p className="mt-1 font-semibold text-navy-900">
                  {getListedByName(property)}
                </p>

                {property.agencyName && property.agentName && (
                  <p className="text-sm text-navy-500">
                    {property.agencyName}
                  </p>
                )}

                <p className="mt-2 text-xs text-navy-500">
                  {property.daysListed} days on MM Properties · {property.viewCount} views · {property.saveCount} saves
                </p>
              </section>

              <section className="mt-5 rounded-xl border border-navy-100 bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-navy-900">
                  Ask about this property
                </p>

                <InquiryForm propertyId={property.id} />
              </section>

              <Link
                href={`/property/${property.slug}`}
                className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                View full details
                <ExternalLink size={16} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}