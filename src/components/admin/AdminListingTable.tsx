"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type AdminListingRow = {
  id: string;
  title: string;
  address: string;
  price: number;
  status: string;
  listingIntent: string;
  availability: string;
  updatedAt: string;
  coverImageUrl: string | null;
};

type Sort = "newest" | "oldest" | "title_asc" | "title_desc" | "price_asc" | "price_desc" | "status" | "type";

export function AdminListingTable({
  listings,
  selectedId,
  onSelect,
  editLinks = false,
}: {
  listings: AdminListingRow[];
  selectedId?: string;
  onSelect?: (listing: AdminListingRow) => void;
  editLinks?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const rows = useMemo(
    () =>
      listings
        .filter((row) => `${row.title} ${row.address} ${row.price}`.toLowerCase().includes(query.toLowerCase().trim()))
        .sort((a, b) => {
          if (sort === "oldest") return +new Date(a.updatedAt) - +new Date(b.updatedAt);
          if (sort === "title_asc") return a.title.localeCompare(b.title);
          if (sort === "title_desc") return b.title.localeCompare(a.title);
          if (sort === "price_asc") return a.price - b.price;
          if (sort === "price_desc") return b.price - a.price;
          if (sort === "status") return a.availability.localeCompare(b.availability);
          if (sort === "type") return a.listingIntent.localeCompare(b.listingIntent);
          return +new Date(b.updatedAt) - +new Date(a.updatedAt);
        }),
    [listings, query, sort],
  );

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, address, or price"
          className="w-full min-w-0 flex-1 rounded-md border border-navy-200 px-3 py-2 text-sm sm:min-w-64"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="w-full rounded-md border border-navy-200 px-3 py-2 text-sm sm:w-auto"
        >
          <option value="newest">Recently updated</option>
          <option value="oldest">Oldest updated</option>
          <option value="title_asc">Title A-Z</option>
          <option value="title_desc">Title Z-A</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
          <option value="status">Availability</option>
          <option value="type">Listing type</option>
        </select>
      </div>

      <div className="responsive-card-table overflow-x-auto rounded-xl border border-navy-100 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
            <tr>
              <th className="p-3">Property</th>
              <th className="p-3">Price</th>
              <th className="p-3">Type</th>
              <th className="p-3">Availability</th>
              <th className="p-3">Updated</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`border-t border-navy-100 ${selectedId === row.id ? "bg-gold-50" : "hover:bg-navy-50/60"}`}>
                <td data-label="Property" className="p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="admin-thumbnail-frame h-12 w-16 shrink-0 overflow-hidden rounded-md bg-navy-50">
                      <img src={row.coverImageUrl || "/placeholder-property.png"} alt="" className="admin-thumbnail-image h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-md truncate font-semibold text-navy-900">{row.title}</p>
                      <p className="max-w-md truncate text-xs text-navy-400">{row.address}</p>
                    </div>
                  </div>
                </td>
                <td data-label="Price" className="p-3 font-medium">PHP {Number(row.price).toLocaleString("en-PH")}</td>
                <td data-label="Type" className="p-3 capitalize">{row.listingIntent.replace(/_/g, " ")}</td>
                <td data-label="Availability" className="p-3 capitalize">{row.availability || row.status}</td>
                <td data-label="Updated" className="p-3 text-xs text-navy-500">{new Date(row.updatedAt).toLocaleDateString("en-PH")}</td>
                <td data-label="Action" className="p-3 text-right">
                  {editLinks ? (
                    <Link href={`/admin/listings/${row.id}/edit`} className="inline-flex items-center rounded-md px-2 py-2 font-semibold text-gold-700 underline">
                      Edit
                    </Link>
                  ) : (
                    <button type="button" onClick={() => onSelect?.(row)} className="font-semibold text-gold-700 underline">
                      {selectedId === row.id ? "Selected" : "Manage photos"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-navy-400">No matching properties.</p>}
      </div>
    </div>
  );
}
