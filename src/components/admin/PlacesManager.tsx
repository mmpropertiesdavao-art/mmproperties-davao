"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { LocationPicker, type LocationValue } from "@/components/map/LocationPicker";

type Place = {
  id: string;
  name: string;
  kind: string;
  status: string;
  lat: number | null;
  lng: number | null;
  aliases: string[];
  propertyCount: number;
};

const KIND_OPTIONS = ["barangay", "neighborhood", "subdivision", "landmark", "district", "other"];
const STATUS_OPTIONS = ["active", "pending", "archived"];

export function PlacesManager() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const [pin, setPin] = useState<LocationValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/places", { cache: "no-store" });
    const data = await response.json();
    setPlaces(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    const term = query.toLowerCase().trim();
    return places.filter((place) => {
      const haystack = `${place.name} ${place.kind} ${place.status} ${(place.aliases || []).join(" ")}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [places, query]);

  const withPins = places.filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))).length;

  function choose(place: Place) {
    setSelected(place);
    setPin(Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)) ? { lat: Number(place.lat), lng: Number(place.lng) } : null);
    setMessage(null);
  }

  async function savePlace(patch: Partial<Place> & { alias?: string }) {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    const body = { ...selected, ...patch, id: selected.id, lat: pin?.lat, lng: pin?.lng };
    const response = await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || "Could not save place.");
      return;
    }

    setMessage("Place updated.");
    await load();
    setSelected((current) => current ? { ...current, ...patch, lat: pin?.lat ?? current.lat, lng: pin?.lng ?? current.lng } : current);
  }

  async function addPlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return;

    const response = await fetch("/api/admin/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind: form.get("kind") || "other" }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Could not add place.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Place added. Select it below to pin it on the map.");
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Total places" value={places.length} />
        <Metric label="With pins" value={withPins} />
        <Metric label="Missing pins" value={Math.max(0, places.length - withPins)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <form onSubmit={addPlace} className="grid gap-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_auto]">
            <input name="name" required placeholder="Add new barangay, subdivision, landmark, school, mall..." className="rounded-lg border border-navy-200 px-3 py-2 text-sm" />
            <select name="kind" defaultValue="other" className="rounded-lg border border-navy-200 px-3 py-2 text-sm">
              {KIND_OPTIONS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
            <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white">Add place</button>
          </form>

          <div className="rounded-2xl border border-navy-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-navy-100 p-4">
              <Search size={18} className="text-navy-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, kind, aliases, status..." className="w-full bg-transparent text-sm outline-none" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
                  <tr>
                    <th className="p-3">Place</th>
                    <th className="p-3">Kind</th>
                    <th className="p-3">Used by</th>
                    <th className="p-3">Pin</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((place) => {
                    const hasPin = Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng));
                    return (
                      <tr key={place.id} className={`border-t border-navy-100 ${selected?.id === place.id ? "bg-gold-50" : "hover:bg-navy-50/60"}`}>
                        <td className="p-3">
                          <p className="font-bold text-navy-900">{place.name}</p>
                          <p className="text-xs text-navy-400">{place.status}{place.aliases?.length ? ` · aliases: ${place.aliases.join(", ")}` : ""}</p>
                        </td>
                        <td className="p-3 capitalize">{place.kind}</td>
                        <td className="p-3">{place.propertyCount} listing{place.propertyCount === 1 ? "" : "s"}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${hasPin ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                            <MapPin size={13} />
                            {hasPin ? `${Number(place.lat).toFixed(5)}, ${Number(place.lng).toFixed(5)}` : "Needs pin"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button type="button" onClick={() => choose(place)} className="rounded-lg border border-gold-300 px-3 py-2 text-xs font-bold text-navy-800 hover:bg-gold-50">
                            Pin / edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && rows.length === 0 && <p className="p-8 text-center text-sm text-navy-400">No places found.</p>}
              {loading && <p className="p-8 text-center text-sm text-navy-400">Loading places…</p>}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-navy-900">Manual map pin</h2>
          <p className="mt-1 text-sm leading-6 text-navy-500">
            Select a place, then click the map or drag the pin. These curated coordinates can improve neighborhood pages, nearby-place matching, and MM Pulse scoring over time.
          </p>

          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3">
                <label className="text-sm font-semibold text-navy-700">
                  Place name
                  <input value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-semibold text-navy-700">
                    Kind
                    <select value={selected.kind} onChange={(event) => setSelected({ ...selected, kind: event.target.value })} className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                      {KIND_OPTIONS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-navy-700">
                    Status
                    <select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value })} className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                      {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <LocationPicker value={pin} onChange={setPin} />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-navy-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-navy-400">Latitude</p>
                  <p className="font-bold text-navy-900">{pin ? pin.lat.toFixed(6) : "Not pinned"}</p>
                </div>
                <div className="rounded-lg bg-navy-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-navy-400">Longitude</p>
                  <p className="font-bold text-navy-900">{pin ? pin.lng.toFixed(6) : "Not pinned"}</p>
                </div>
              </div>

              <button type="button" onClick={() => void savePlace({ name: selected.name, kind: selected.kind, status: selected.status })} disabled={saving} className="w-full rounded-xl bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-50">
                {saving ? "Saving…" : "Save place and pin"}
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-navy-200 bg-navy-50 p-6 text-center text-sm text-navy-500">
              Choose a place from the table to map it manually.
            </div>
          )}

          {message && <p className="mt-4 rounded-lg bg-navy-50 p-3 text-sm font-semibold text-navy-700">{message}</p>}
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-navy-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
    </div>
  );
}
