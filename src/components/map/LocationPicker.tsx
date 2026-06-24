"use client";

import dynamic from "next/dynamic";

export interface LocationValue { lat: number; lng: number }

const LocationPickerMap = dynamic(
  () => import("@/components/map/LocationPickerMap").then((module) => module.LocationPickerMap),
  {
    ssr: false,
    loading: () => <div className="flex h-72 w-full items-center justify-center rounded-lg border border-navy-100 bg-navy-50 text-sm text-navy-500">Loading map…</div>,
  },
);

export function LocationPicker({ value, onChange }: { value: LocationValue | null; onChange: (value: LocationValue) => void }) {
  return <LocationPickerMap value={value} onChange={onChange} />;
}
