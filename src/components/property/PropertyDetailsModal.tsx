"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bath,
  BedDouble,
  Car,
  ChevronLeft,
  ChevronRight,
  Copy,
  Home,
  MapPin,
  Maximize2,
  Ruler,
  Square,
  X,
} from "lucide-react";
import type { Property } from "@/types/property";
import { InquiryForm } from "@/components/property/InquiryForm";
import { FavoriteButton } from "@/components/property/FavoriteButton";
import { CompareButton } from "@/components/compare/CompareButton";

type GalleryImage = { url: string; altText: string | null };
type Video = { id: string; url: string; thumbnailUrl?: string | null; videoType?: string };
type Amenity = { name: string; category: string; distance_m?: number; distanceM?: number };

export type PropertyDetailPayload = {
  property: Property;
  images: GalleryImage[];
  videos: Video[];
  features: string[];
  amenities: Amenity[];
};

function formatPeso(value: number | null | undefined) {
  if (!value) return "Price on request";
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function formatSqm(value: number | null | undefined) {
  if (!value) return "—";
  return `${Number(value).toLocaleString("en-PH")} sqm`;
}

function locationOf(property: Property) {
  return [property.address, property.barangay, "Davao City"].filter(Boolean).join(", ");
}

function intentLabel(intent: Property["listingIntent"]) {
  if (intent === "rent") return "For rent";
  if (intent === "sale_or_rent") return "For sale or rent";
  return "For sale";
}

function intentClass(intent: Property["listingIntent"]) {
  if (intent === "rent") return "bg-sky-600";
  if (intent === "sale_or_rent") return "bg-violet-600";
  return "bg-emerald-700";
}

export function PropertyDetailsModal({ payload }: { payload: PropertyDetailPayload }) {
  const { property, features, videos, amenities } = payload;
  const images = payload.images.length
    ? payload.images
    : [{ url: property.coverImageUrl || "/placeholder-property.png", altText: property.title }];

  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const description = property.description || "Full property description will be added soon.";
  const hasLongDescription = description.length > 260;
  const displayedDescription = expanded || !hasLongDescription ? description : `${description.slice(0, 260).trim()}…`;
  const listedByName = property.agentName || "MM Properties";
  const listedBySubtext = property.agencyName || "Davao Real Estate";
  const propertyLocation = locationOf(property);

  const stats = useMemo(
    () => [
      { icon: <BedDouble size={18} />, label: "Bedrooms", value: property.bedrooms ?? "—" },
      { icon: <Bath size={18} />, label: "Bathrooms", value: property.bathrooms ?? "—" },
      { icon: <Car size={18} />, label: "Parking", value: property.parkingSpaces ?? "Not provided" },
      { icon: <Square size={18} />, label: "Lot area", value: formatSqm(property.lotAreaSqm) },
      { icon: <Ruler size={18} />, label: "Floor area", value: formatSqm(property.floorAreaSqm) },
      { icon: <Home size={18} />, label: "Type", value: property.propertyTypeLabel || property.propertyType },
    ],
    [property],
  );

  function previous() {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }

  function next() {
    setActiveIndex((current) => (current + 1) % images.length);
  }

  async function share() {
    const url = `${window.location.origin}/property/${property.slug}`;
    if (navigator.share) {
      await navigator.share({ title: property.title, text: property.title, url }).catch(() => {});
      return;
    }

    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => {
    if (!inquiryOpen) return;

    document.body.dataset.mmNestedModal = "true";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setInquiryOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      delete document.body.dataset.mmNestedModal;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inquiryOpen]);

  return (
    <>
      <div className="grid flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.08fr)_420px]">
        <section className="border-r border-navy-100 bg-slate-950 p-3 text-white md:p-5">
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black md:aspect-[16/10]"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null) return;
              const delta = event.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(delta) > 45) {
                delta > 0 ? previous() : next();
              }
              touchStartX.current = null;
            }}
          >
            <img
              src={images[activeIndex].url}
              alt={images[activeIndex].altText || `${property.title} photo ${activeIndex + 1}`}
              className="h-full w-full object-contain transition-opacity duration-300"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = "/placeholder-property.png";
              }}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={previous}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-lg transition hover:bg-gold-300"
                  aria-label="Previous property photo"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-lg transition hover:bg-gold-300"
                  aria-label="Next property photo"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold">
              {activeIndex + 1} / {images.length}
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`image-zoom-frame h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 bg-white/10 ${
                    index === activeIndex ? "border-gold-400" : "border-transparent"
                  }`}
                  aria-label={`Show property photo ${index + 1}`}
                >
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    className="zoomable-image h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = "/placeholder-property.png";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="bg-white p-5 md:p-7">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-3 py-1 text-xs font-bold uppercase text-white ${intentClass(property.listingIntent)}`}>
                {intentLabel(property.listingIntent)}
              </span>

              {property.availability !== "available" && (
                <span className="rounded-md bg-slate-800 px-3 py-1 text-xs font-bold uppercase text-white">
                  {property.availability}
                </span>
              )}

              {property.financingAvailable && (
                <span className="rounded-md bg-cyan-500 px-3 py-1 text-xs font-bold text-navy-950">
                  Financing
                </span>
              )}

              {property.assumeBalanceAvailable && (
                <span className="rounded-md bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                  Assume balance
                </span>
              )}
            </div>

            <FavoriteButton propertyId={property.id} className="relative right-auto top-auto shrink-0" />
          </div>

          {property.previousPrice && property.previousPrice > property.price && (
            <p className="text-sm font-semibold text-red-600">
              <span className="line-through">{formatPeso(property.previousPrice)}</span> · PRICE DOWN
            </p>
          )}

          <h1 className="mt-1 text-2xl font-bold leading-tight text-navy-950">
            {formatPeso(property.price)}
          </h1>

          {property.listingIntent !== "sale" && property.rentPrice && (
            <p className="mt-1 text-lg font-bold text-sky-700">
              {formatPeso(property.rentPrice)}/month
            </p>
          )}

          <h2 className="mt-3 text-xl font-bold text-navy-900">{property.title}</h2>

          <p className="mt-2 flex gap-2 text-sm leading-6 text-navy-500">
            <MapPin size={17} className="mt-1 shrink-0 text-gold-600" />
            <span>{propertyLocation}</span>
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-xl border border-navy-100 bg-navy-50 p-3">
                <div className="flex items-center gap-2 text-navy-500">
                  {item.icon}
                  <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
                </div>
                <p className="mt-1 font-bold text-navy-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <CompareButton
              item={{
                id: property.id,
                slug: property.slug,
                title: property.title,
                listingIntent: property.listingIntent,
              }}
              className="relative right-auto top-auto"
            />
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-800 hover:border-gold-400"
            >
              <Copy size={16} />
              {copied ? "Copied" : "Share"}
            </button>
            <a
              href={`/property/${property.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-800 hover:border-gold-400"
            >
              <Maximize2 size={16} />
              Open page
            </a>
          </div>

          <section className="mt-6">
            <h3 className="font-bold text-navy-900">Description</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-navy-600">
              {displayedDescription}
            </p>
            {hasLongDescription && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mt-2 text-sm font-bold text-gold-700 hover:text-gold-800"
              >
                {expanded ? "See Less" : "See More"}
              </button>
            )}
          </section>

          {features.length > 0 && (
            <section className="mt-6">
              <h3 className="font-bold text-navy-900">Property features</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {features.map((feature) => (
                  <span key={feature} className="rounded-full bg-gold-50 px-3 py-1 text-sm font-semibold text-navy-800">
                    {feature}
                  </span>
                ))}
              </div>
            </section>
          )}

          {(property.financingAvailable || property.assumeBalanceAvailable || property.paymentTerms) && (
            <section className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-navy-700">
              <h3 className="font-bold text-navy-900">Financing information</h3>
              {property.paymentTerms && <p className="mt-2">{property.paymentTerms}</p>}
              <p className="mt-2">
                {property.financingAvailable ? "Open to financing. " : ""}
                {property.assumeBalanceAvailable ? "Assume balance option available." : ""}
              </p>
            </section>
          )}

          {videos.length > 0 && (
            <section className="mt-6">
              <h3 className="font-bold text-navy-900">Videos</h3>
              <div className="mt-3 space-y-2">
                {videos.map((video) => (
                  <a key={video.id} href={video.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-navy-100 px-3 py-2 text-sm font-semibold text-navy-700 hover:border-gold-400">
                    View {video.videoType || "property"} video
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-navy-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Listed by</p>
            <h3 className="mt-1 text-lg font-bold text-navy-900">{listedByName}</h3>
            {listedBySubtext && <p className="text-sm text-navy-500">{listedBySubtext}</p>}
            <p className="mt-2 text-xs text-navy-500">
              {property.daysListed} days on MM Properties · {property.viewCount} views · {property.saveCount} saves
            </p>
          </section>

          {amenities.length > 0 && (
            <section className="mt-6">
              <h3 className="font-bold text-navy-900">Nearby places</h3>
              <div className="mt-3 space-y-2">
                {amenities.map((amenity) => (
                  <div key={`${amenity.name}-${amenity.category}`} className="flex justify-between rounded-lg bg-navy-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-navy-800">{amenity.name}</span>
                    <span className="text-navy-500">
                      {Math.round((amenity.distance_m ?? amenity.distanceM ?? 0) / 1000 * 10) / 10} km
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={() => setInquiryOpen(true)}
            className="sticky bottom-4 mt-7 w-full rounded-xl bg-gold-500 px-5 py-3 text-center font-bold text-navy-950 shadow-lg transition hover:bg-gold-400"
          >
            Inquire Now
          </button>
        </aside>
      </div>

      {inquiryOpen && (
        <div className="fixed inset-0 z-[9100] flex items-center justify-center bg-navy-950/75 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setInquiryOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Property inquiry form" className="w-full max-w-lg animate-[modalPop_.18s_ease-out] rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Inquiry</p>
                <h2 className="font-bold text-navy-900">{property.title}</h2>
              </div>
              <button type="button" onClick={() => setInquiryOpen(false)} className="rounded-full border border-navy-200 p-2 text-navy-700 hover:bg-navy-50" aria-label="Close inquiry form">
                <X size={18} />
              </button>
            </div>
            <InquiryForm propertyId={property.id} />
          </div>
        </div>
      )}
    </>
  );
}
