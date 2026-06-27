"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  title: string;
  address: string | null;
  price: number;
  status: string;
  listingIntent: string;
  availability: string;
  coverImageUrl: string | null;
  carouselEnabled: boolean;
  carouselOrder: number;
};

function formatPrice(price: number) {
  return `PHP ${Math.round(price).toLocaleString("en-PH")}`;
}

export default function AdminHomepageCarouselPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/properties/list", { cache: "no-store" });
    const data = await response.json();
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => {
    const term = query.toLowerCase().trim();
    return rows
      .filter((row) => `${row.title} ${row.address} ${row.price}`.toLowerCase().includes(term))
      .sort((a, b) => {
        if (a.carouselEnabled !== b.carouselEnabled) return a.carouselEnabled ? -1 : 1;
        if (a.carouselOrder !== b.carouselOrder) return a.carouselOrder - b.carouselOrder;
        return a.title.localeCompare(b.title);
      });
  }, [query, rows]);

  async function save(row: Row, patch: Partial<Row>) {
    const next = { ...row, ...patch };
    setRows((current) => current.map((item) => (item.id === row.id ? next : item)));
    setSavingId(row.id);
    setMessage(null);

    const response = await fetch("/api/admin/homepage-carousel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        carouselEnabled: next.carouselEnabled,
        carouselOrder: next.carouselOrder,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setSavingId(null);

    if (response.ok) {
      setMessage("Homepage carousel updated.");
    } else {
      setMessage(data.error || "Could not update carousel.");
      await load();
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-gold-700">
            Homepage
          </p>
          <h1 className="text-3xl font-bold text-navy-900">
            Featured carousel
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-navy-500">
            Choose the listings that auto-scroll below the hero section. Lower order numbers appear first. If no listings are enabled, the homepage falls back to featured properties.
          </p>
        </div>
      </div>

      {message && (
        <p className="mt-5 rounded-lg bg-navy-50 p-3 text-sm font-semibold text-navy-700">
          {message}
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, address, or price..."
          className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
        />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th className="p-3">Property</th>
                <th className="p-3">Price</th>
                <th className="p-3">Availability</th>
                <th className="p-3">Show</th>
                <th className="p-3">Order</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-t border-navy-100 hover:bg-navy-50/60">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="image-zoom-frame h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-navy-50">
                        <img
                          src={row.coverImageUrl || "/placeholder-property.png"}
                          alt=""
                          className="zoomable-image h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-navy-900">{row.title}</p>
                        <p className="line-clamp-1 text-xs text-navy-500">{row.address || "No address"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-navy-900">{formatPrice(row.price)}</td>
                  <td className="p-3 capitalize">
                    {row.listingIntent.replace(/_/g, " ")} · {row.availability}
                  </td>
                  <td className="p-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.carouselEnabled}
                        onChange={(event) => void save(row, { carouselEnabled: event.target.checked })}
                      />
                      <span>{row.carouselEnabled ? "Visible" : "Hidden"}</span>
                    </label>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      value={row.carouselOrder}
                      onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, carouselOrder: Number(event.target.value) } : item))}
                      onBlur={(event) => void save(row, { carouselOrder: Number(event.target.value) })}
                      className="w-24 rounded-md border border-navy-200 px-2 py-1"
                    />
                  </td>
                  <td className="p-3 text-xs text-navy-500">
                    {savingId === row.id ? "Saving…" : row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sorted.length === 0 && (
            <p className="p-8 text-center text-sm text-navy-400">
              No matching listings.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
