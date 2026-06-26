"use client";

import { useState } from "react";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyQuickViewModal } from "@/components/property/PropertyQuickViewModal";

type ListingIntent = "sale" | "rent" | "sale_or_rent";

interface PropertyQuickViewCardProps {
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
  listingIntent?: ListingIntent;
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

export function PropertyQuickViewCard(props: PropertyQuickViewCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClickCapture={(event) => {
          const target = event.target as HTMLElement | null;

          if (
            target?.closest("button") ||
            target?.closest('[role="button"]') ||
            target?.closest("[data-no-quick-view]")
          ) {
            return;
          }

          const anchor = target?.closest("a");

          if (anchor) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <PropertyCard {...props} />
      </div>

      <PropertyQuickViewModal
        slug={props.slug}
        open={open}
        onClose={() => setOpen(false)}
        fallbackTitle={props.title}
        fallbackImageUrl={props.coverImageUrl}
      />
    </>
  );
}