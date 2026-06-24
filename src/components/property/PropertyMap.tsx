"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/search/MapView").then((module) => module.MapView), { ssr: false });

export function PropertyMap({ property }: { property: { id: string; slug: string; title: string; price: number; lat: number; lng: number; neighborhoodName: string; listingIntent?: "sale" | "rent" | "sale_or_rent"; rentPrice?: number | null } }) {
  return <div className="h-72 overflow-hidden rounded-xl border border-navy-100"><MapView properties={[property]} /></div>;
}
