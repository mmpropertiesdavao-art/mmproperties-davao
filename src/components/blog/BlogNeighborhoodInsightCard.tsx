"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type InsightTab = {
  key: string;
  label: string;
  value: string;
};

function safeHref(value?: string) {
  if (!value) return "#";
  if (value.startsWith("#") || value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : "#";
  } catch {
    return "#";
  }
}

function searchHrefForNeighborhood(name?: string, explicit?: string) {
  if (explicit?.trim()) return safeHref(explicit.trim());
  const area = String(name || "").split("/")[0]?.trim() || String(name || "").trim();
  return area ? `/search?barangay=${encodeURIComponent(area)}` : "/search";
}

function InlineMarkdown({ text = "" }: { text?: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] && match[3]) {
      nodes.push(
        <a key={nodes.length} href={safeHref(match[3])} className="font-semibold text-gold-700 underline underline-offset-4 hover:text-navy-900">
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(
        <strong key={nodes.length} className="font-black text-navy-950">
          {match[4]}
        </strong>,
      );
    } else if (match[5]) {
      nodes.push(<em key={nodes.length}>{match[5]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return <>{nodes}</>;
}

export function BlogNeighborhoodInsightCard({
  title,
  character,
  buyers,
  market,
  bestFor,
  caution,
  ctaUrl,
  ctaLabel,
}: {
  title: string;
  character?: string;
  buyers?: string;
  market?: string;
  bestFor?: string;
  caution?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}) {
  const tabs = useMemo<InsightTab[]>(() => {
    return [
      { key: "character", label: "Character", value: character || "" },
      { key: "buyers", label: "Who buys here", value: buyers || "" },
      { key: "market", label: "Market reality", value: market || "" },
      { key: "best", label: "Best for", value: bestFor || "" },
      { key: "caution", label: "Caution", value: caution || "" },
    ].filter((tab) => tab.value.trim());
  }, [bestFor, buyers, caution, character, market]);
  const [activeKey, setActiveKey] = useState(tabs[0]?.key || "");
  const active = tabs.find((tab) => tab.key === activeKey) || tabs[0];
  const href = searchHrefForNeighborhood(title, ctaUrl);

  return (
    <section className="rounded-2xl border border-navy-100 bg-navy-50/70 p-5 shadow-sm sm:p-6">
      <div className="border-l-4 border-gold-500 pl-4">
        <h2 className="text-xl font-black leading-7 text-navy-950">{title || "Neighborhood insight"}</h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-gold-700">Davao area insight</p>
      </div>

      {tabs.length > 0 && (
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
                    : "border-navy-200 bg-white text-navy-700 hover:border-gold-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white bg-white/85 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-navy-500">{active?.label}</p>
            <p className="mt-2 whitespace-pre-wrap text-base leading-8 text-navy-800"><InlineMarkdown text={active?.value} /></p>
          </div>
        </>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <a href={href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy-900 px-5 text-sm font-bold text-white hover:bg-navy-800">
          {ctaLabel || "Check our listings"} →
        </a>
        {title && (
          <a href={searchHrefForNeighborhood(title, "")} className="text-sm font-bold text-gold-700 underline underline-offset-4 hover:text-navy-900">
            Search {title}
          </a>
        )}
      </div>
    </section>
  );
}
