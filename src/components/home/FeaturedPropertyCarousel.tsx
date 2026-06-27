"use client";

import { MapPin } from "lucide-react";
import type { Property } from "@/types/property";
import { usePropertyModal } from "@/components/property/PropertyModalProvider";

function formatPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function locationOf(property: Property) {
  return [property.barangay || property.primaryPlace || property.neighborhoodName, "Davao City"]
    .filter(Boolean)
    .join(", ");
}

export function FeaturedPropertyCarousel({ properties }: { properties: Property[] }) {
  const propertyModal = usePropertyModal();

  if (properties.length === 0) return null;

  const rail = properties.length >= 4 ? properties : [...properties, ...properties];
  const items = [...rail, ...rail];

  return (
    <section className="border-b border-navy-100 bg-white py-7">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-700">
              Featured carousel
            </p>
            <h2 className="text-2xl font-bold text-navy-900">
              Spotlight Davao listings
            </h2>
          </div>
          <p className="hidden text-sm text-navy-500 sm:block">
            Hover to pause · swipe on mobile
          </p>
        </div>

        <div className="group max-w-full overflow-hidden [contain:layout_paint]">
          <div className="flex w-full max-w-full gap-4 overflow-x-auto pb-2 [scrollbar-width:none] group-hover:[animation-play-state:paused] md:w-max md:max-w-none md:animate-[featuredCarousel_38s_linear_infinite] md:overflow-visible">
            {items.map((property, index) => (
              <button
                key={`${property.id}-${index}`}
                type="button"
                onClick={() => propertyModal?.openProperty(property.slug)}
                className="image-zoom-frame w-[270px] max-w-[270px] shrink-0 basis-[270px] overflow-hidden rounded-2xl border border-navy-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-gold-400 hover:shadow-lg sm:w-[310px] sm:max-w-[310px] sm:basis-[310px]"
              >
                <div className="relative h-40 overflow-hidden bg-navy-50">
                  <img
                    src={property.coverImageUrl || "/placeholder-property.png"}
                    alt={property.title}
                    loading="lazy"
                    className="zoomable-image h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = "/placeholder-property.png";
                    }}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-navy-950">
                    Featured
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-lg font-bold text-navy-950">{formatPeso(property.price)}</p>
                  {property.listingIntent !== "sale" && property.rentPrice && (
                    <p className="text-sm font-semibold text-sky-700">
                      {formatPeso(property.rentPrice)}/month
                    </p>
                  )}
                  <p className="mt-1 line-clamp-1 font-semibold text-navy-800">{property.title}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-navy-500">
                    <MapPin size={14} className="text-gold-600" />
                    <span className="line-clamp-1">{locationOf(property)}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
