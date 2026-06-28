"use client";

import { useState } from "react";
import type { SitePage } from "@/lib/sitePages";

export function LegalPageEditor({ pages }: { pages: SitePage[] }) {
  const [items, setItems] = useState(pages);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function update(slug: string, field: "title" | "content", value: string) {
    setItems((current) => current.map((page) => page.slug === slug ? { ...page, [field]: value } : page));
  }

  async function save(page: SitePage) {
    setSavingSlug(page.slug);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/legal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: page.slug, title: page.title, content: page.content }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? `${page.title} updated.` : data.error || `Could not save (${response.status}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save page.");
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <div className="space-y-6">
      {message && <p className="rounded-xl bg-navy-50 p-3 text-sm text-navy-700">{message}</p>}
      {items.map((page) => (
        <section key={page.slug} className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-700">{page.slug.replace(/-/g, " ")}</p>
              <h2 className="mt-1 text-xl font-bold text-navy-950">{page.title}</h2>
            </div>
            <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-700 hover:border-gold-400">
              View page
            </a>
          </div>

          <label className="mt-4 block text-sm font-semibold text-navy-700">
            Page title
            <input
              value={page.title}
              onChange={(event) => update(page.slug, "title", event.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-navy-700">
            Page content
            <textarea
              value={page.content}
              onChange={(event) => update(page.slug, "content", event.target.value)}
              rows={12}
              className="mt-1 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm leading-6"
            />
          </label>

          <button
            type="button"
            onClick={() => void save(page)}
            disabled={savingSlug === page.slug}
            className="mt-4 rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 disabled:opacity-50"
          >
            {savingSlug === page.slug ? "Saving..." : `Save ${page.title}`}
          </button>
        </section>
      ))}
    </div>
  );
}
