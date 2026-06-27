"use client";

import { TrendingDown } from "lucide-react";
import type { Property } from "@/types/property";
import { usePropertyModal } from "@/components/property/PropertyModalProvider";

function formatPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

export function PropertyMiniModalCard({ property, priceDown = false }: { property: Property; priceDown?: boolean }) {
  const propertyModal = usePropertyModal();

  return (
    <button
      type="button"
      onClick={() => propertyModal?.openProperty(property.slug)}
      className="group flex w-full gap-4 p-3 text-left hover:bg-navy-50"
    >
      <div className="image-zoom-frame relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-navy-100">
        <img
          src={property.coverImageUrl || "/placeholder-property.png"}
          alt={property.title}
          loading="lazy"
          className="zoomable-image h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = "/placeholder-property.png";
          }}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-navy-900 group-hover:text-gold-700">
          {property.title}
        </p>
        <p className="text-sm font-bold text-navy-800">{formatPeso(property.price)}</p>
        <p className="truncate text-xs text-navy-500">
          {property.barangay || property.primaryPlace || property.neighborhoodName}, Davao City
        </p>
        {priceDown && property.previousPrice && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <TrendingDown size={13} />
            <span className="line-through">{formatPeso(property.previousPrice)}</span> · Price down
          </p>
        )}
      </div>
    </button>
  );
}
