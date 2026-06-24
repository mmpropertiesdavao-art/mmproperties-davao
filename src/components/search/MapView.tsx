"use client";

import { useEffect, useRef, useState } from "react";

const DAVAO_CENTER: [number, number] = [7.0731, 125.6128];

interface MapPin {
  id: string;
  slug?: string;
  title?: string;
  lng: number;
  lat: number;
  price: number;
  neighborhoodName?: string | null;
  listingIntent?: "sale" | "rent" | "sale_or_rent";
  rentPrice?: number | null;
}

interface MapViewProps {
  properties: MapPin[];
  onAreaSearch?: (polygon: GeoJSON.Polygon) => void;
}

/**
 * Uses one explicitly-owned Leaflet instance instead of react-leaflet's
 * MapContainer. This avoids the "Map container is already initialized"
 * collision caused by React development remounts and fast navigation.
 */
export function MapView({ properties }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const validPins = properties.filter(
    (property) => Number.isFinite(Number(property.lat)) && Number.isFinite(Number(property.lng)),
  );
  const pinSignature = validPins
    .map((property) => `${property.id}:${property.lat}:${property.lng}:${property.price}:${property.rentPrice ?? ""}:${property.listingIntent ?? "sale"}`)
    .join("|");

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    const container = containerRef.current;
    if (!container) return;

    setReady(false);

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      // A stale Leaflet stamp can remain after a React development remount.
      // It is safe to clear here because this component exclusively owns the node.
      const ownedContainer = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (ownedContainer._leaflet_id) delete ownedContainer._leaflet_id;

      map = L.map(ownedContainer, {
        center: DAVAO_CENTER,
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      validPins.forEach((property) => {
        const marker = L.marker([Number(property.lat), Number(property.lng)], {
          icon: createPriceIcon(L, property.listingIntent === "rent" && property.rentPrice ? property.rentPrice : property.price, property.listingIntent),
        }).addTo(map!);
        marker.bindPopup(createPopup(property), { minWidth: 190 });
      });

      if (validPins.length === 1) {
        map.setView([Number(validPins[0].lat), Number(validPins[0].lng)], 15, { animate: false });
      } else if (validPins.length > 1) {
        map.fitBounds(
          L.latLngBounds(validPins.map((property) => [Number(property.lat), Number(property.lng)])),
          { padding: [36, 36], maxZoom: 15, animate: false },
        );
      }

      window.setTimeout(() => map?.invalidateSize(), 80);
      setReady(true);
    });

    return () => {
      disposed = true;
      if (map) {
        map.off();
        map.remove();
        map = null;
      }
      const ownedContainer = container as HTMLDivElement & { _leaflet_id?: number };
      if (ownedContainer._leaflet_id) delete ownedContainer._leaflet_id;
    };
    // pinSignature intentionally captures the complete marker state without
    // rebuilding the map merely because a parent created a new array instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSignature]);

  return (
    <div className="relative h-full min-h-[360px] w-full">
      <div ref={containerRef} className="h-full min-h-[360px] w-full" />
      {ready && validPins.length > 0 && <div className="absolute right-3 top-3 z-[500] rounded-lg border border-navy-100 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm" aria-label="Map pin color legend"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-500">Listing type</p><div className="space-y-1 text-xs font-semibold text-navy-800"><LegendItem color="#047857" label="For sale"/><LegendItem color="#0284c7" label="For rent"/><LegendItem color="#7c3aed" label="Sale or rent"/></div></div>}
      {!ready && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy-50 text-sm text-navy-500">Loading map…</div>}
      {ready && validPins.length === 0 && <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-md bg-white/95 px-3 py-2 text-sm text-navy-600 shadow">No listings have valid pins yet.</div>}
    </div>
  );
}

function createPriceIcon(L: typeof import("leaflet"), price: number, intent: MapPin["listingIntent"] = "sale") {
  const compactPrice = new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }).format(price);
  const lengthClass = compactPrice.length >= 7 ? " property-price-marker__price--extra-long" : compactPrice.length >= 5 ? " property-price-marker__price--long" : "";
  return L.divIcon({
    className: "property-price-marker-wrapper",
    html: `<div class="property-price-marker property-price-marker--${intent}"><span class="property-price-marker__price${lengthClass}">${compactPrice}</span></div>`,
    iconSize: [60, 84],
    iconAnchor: [30, 82],
    popupAnchor: [0, -74],
  });
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} /><span>{label}</span></div>;
}

function createPopup(property: MapPin) {
  const popup = document.createElement("div");
  popup.className = "space-y-1";

  const price = document.createElement("p");
  price.className = "font-semibold text-navy-900";
  const displayPrice = property.listingIntent === "rent" && property.rentPrice ? property.rentPrice : property.price;
  price.textContent = `${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(displayPrice)}${property.listingIntent === "rent" ? "/month" : ""}`;
  popup.appendChild(price);

  if (property.title) {
    const title = document.createElement("p");
    title.className = "text-sm text-navy-700";
    title.textContent = property.title;
    popup.appendChild(title);
  }
  if (property.neighborhoodName) {
    const area = document.createElement("p");
    area.className = "text-xs text-navy-400";
    area.textContent = `${property.neighborhoodName}, Davao City`;
    popup.appendChild(area);
  }
  if (property.slug) {
    const link = document.createElement("a");
    link.href = `/property/${encodeURIComponent(property.slug)}`;
    link.className = "text-sm font-medium text-gold-700 underline";
    link.textContent = "View listing";
    popup.appendChild(link);
  }

  return popup;
}
