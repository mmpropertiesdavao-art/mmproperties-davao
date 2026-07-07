"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

type InsightTab = {
  key: string;
  label: string;
  value: string;
};

type NeighborhoodInsightCardProps = {
  id: string;
  name: string;
  slug: string;
  overview?: string | null;
  listingCount: number;
  avgPricePerSqm?: number | null;
  characterText?: string | null;
  whoBuysHere?: string | null;
  marketReality?: string | null;
  bestFor?: string | null;
  cautionText?: string | null;
  advantages?: string[] | null;
  disadvantages?: string[] | null;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

function listText(values?: string[] | null) {
  return (values || []).filter(Boolean).join(" ");
}

export function NeighborhoodInsightCard({
  id,
  name,
  slug,
  overview,
  listingCount,
  avgPricePerSqm,
  characterText,
  whoBuysHere,
  marketReality,
  bestFor,
  cautionText,
  advantages,
  disadvantages,
}: NeighborhoodInsightCardProps) {
  const tabs = useMemo<InsightTab[]>(() => {
    return [
      ["character", "Character", clean(characterText) || clean(overview)],
      ["buyers", "Who buys here", clean(whoBuysHere)],
      ["market", "Market reality", clean(marketReality)],
      ["best", "Best for", clean(bestFor) || listText(advantages)],
      ["caution", "Caution", clean(cautionText) || listText(disadvantages)],
    ]
      .filter((item): item is [string, string, string] => Boolean(item[2]))
      .map(([key, label, value]) => ({ key, label, value }));
  }, [advantages, bestFor, cautionText, disadvantages, marketReality, overview, characterText, whoBuysHere]);

  const [activeKey, setActiveKey] = useState(tabs[0]?.key || "");
  const active = tabs.find((tab) => tab.key === activeKey) || tabs[0];
  const searchHref = `/search?neighborhoodId=${encodeURIComponent(id)}`;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-navy-100 bg-navy-50/70 p-5 shadow-sm transition hover:border-gold-400 hover:shadow-lg">
      <div className="border-l-4 border-gold-500 pl-4">
        <h2 className="text-xl font-black leading-7 text-navy-950">{name}</h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-gold-700">Davao area insight</p>
      </div>

      {tabs.length > 0 ? (
        <>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveKey(tab.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  active?.key === tab.key
                    ? "border-gold-500 bg-gold-500 text-navy-950"
                    : "border-navy-200 bg-white text-navy-700 hover:border-gold-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-32 rounded-xl border border-white bg-white/80 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-navy-500">{active?.label}</p>
            <p className="mt-2 line-clamp-6 text-sm leading-7 text-navy-800">{active?.value}</p>
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-navy-200 bg-white/70 p-4 text-sm leading-7 text-navy-500">
          Neighborhood insight is being prepared. You can still view current listings in this area.
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-navy-500">
          <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-navy-100">
            {listingCount} listing{listingCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-navy-100">
            {avgPricePerSqm ? `Avg PHP ${Math.round(avgPricePerSqm).toLocaleString("en-PH")}/sqm` : "Price data collecting"}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={searchHref} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-bold text-white hover:bg-navy-800">
            Check our listings <ArrowRight size={16} />
          </Link>
          <Link href={`/neighborhoods/${slug}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-navy-200 bg-white px-4 text-sm font-bold text-navy-800 hover:border-gold-400">
            Full guide
          </Link>
        </div>
      </div>
    </article>
  );
}
