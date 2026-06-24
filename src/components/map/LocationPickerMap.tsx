"use client";

import { useEffect, useRef, useState } from "react";
import type { LocationValue } from "@/components/map/LocationPicker";

const DAVAO_CENTER: LocationValue = { lat: 7.0731, lng: 125.6128 };

/**
 * An explicitly managed Leaflet map for exact listing placement.
 * Avoiding react-leaflet's MapContainer prevents duplicate initialization
 * during React development remounts and client-side route transitions.
 */
export function LocationPickerMap({ value, onChange }: { value: LocationValue | null; onChange: (value: LocationValue) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const valueRef = useRef<LocationValue | null>(value);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    let marker: import("leaflet").Marker | null = null;
    const container = containerRef.current;
    if (!container) return;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      const ownedContainer = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (ownedContainer._leaflet_id) delete ownedContainer._leaflet_id;

      const initial = valueRef.current ?? DAVAO_CENTER;
      map = L.map(ownedContainer, {
        center: [initial.lat, initial.lng],
        zoom: valueRef.current ? 16 : 13,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "",
        html: '<div class="listing-location-pin"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      marker = L.marker([initial.lat, initial.lng], { draggable: true, icon: pinIcon }).addTo(map);
      marker.bindPopup("Drag or click the map to set the exact property pin.");

      map.on("click", (event: import("leaflet").LeafletMouseEvent) => {
        marker?.setLatLng(event.latlng);
        onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      marker.on("dragend", () => {
        const next = marker?.getLatLng();
        if (next) onChangeRef.current({ lat: next.lat, lng: next.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => map?.invalidateSize(), 60);
      setReady(true);
    });

    return () => {
      disposed = true;
      mapRef.current = null;
      markerRef.current = null;
      if (map) {
        map.off();
        map.remove();
        map = null;
      }
      const ownedContainer = container as HTMLDivElement & { _leaflet_id?: number };
      if (ownedContainer._leaflet_id) delete ownedContainer._leaflet_id;
    };
  }, []);

  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([value.lat, value.lng]);
    mapRef.current.setView([value.lat, value.lng], Math.max(mapRef.current.getZoom(), 16), { animate: false });
  }, [value?.lat, value?.lng]);

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-navy-100">
      <div ref={containerRef} className="h-72 w-full" />
      {!ready && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy-50 text-sm text-navy-500">Loading map…</div>}
    </div>
  );
}
