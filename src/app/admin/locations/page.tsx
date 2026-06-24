"use client";

import { useEffect, useMemo, useState } from "react";
import { LocationPicker } from "@/components/map/LocationPicker";

interface PropertyLocation { id: string; title: string; address: string; lat: number; lng: number }

export default function ListingLocationsPage() {
  const [properties, setProperties] = useState<PropertyLocation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selected = useMemo(() => properties.find((property) => property.id === selectedId), [properties, selectedId]);

  useEffect(() => { fetch("/api/admin/properties/list").then((response) => response.json()).then((data) => setProperties(Array.isArray(data) ? data : [])); }, []);

  function choose(id: string) {
    setSelectedId(id); setMessage(null);
    const property = properties.find((item) => item.id === id);
    setPin(property ? { lat: Number(property.lat), lng: Number(property.lng) } : null);
  }

  async function save() {
    if (!selectedId || !pin) return;
    setSaving(true); setMessage(null);
    const response = await fetch(`/api/admin/properties/${selectedId}/location`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pin) });
    const data = await response.json();
    if (response.ok) {
      setProperties((current) => current.map((item) => item.id === selectedId ? { ...item, ...pin } : item));
      setMessage("Exact location saved. The public search map now uses this pin.");
    } else setMessage(data.error ?? "Could not save the pin.");
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-navy-900">Existing listing locations</h1>
      <p className="mt-2 text-sm text-navy-500">Choose a listing and move its pin to the exact property entrance. This is especially important for older imports that used the Davao city-center fallback.</p>
      <select value={selectedId} onChange={(event) => choose(event.target.value)} className="mt-6 w-full rounded-md border border-navy-200 bg-white px-3 py-3">
        <option value="">Choose a listing</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title} — {property.address}</option>)}
      </select>
      {selected && pin && <div className="mt-5"><LocationPicker value={pin} onChange={setPin} /><p className="mt-2 text-xs text-navy-500">{pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</p><button onClick={save} disabled={saving} className="mt-4 rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-900 disabled:opacity-50">{saving ? "Saving…" : "Save exact pin"}</button></div>}
      {message && <p className="mt-4 rounded-md bg-navy-50 p-3 text-sm text-navy-700">{message}</p>}
    </div>
  );
}
