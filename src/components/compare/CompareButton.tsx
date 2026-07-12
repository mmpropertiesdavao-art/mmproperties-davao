"use client";

import { Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { COMPARE_EVENT, MAX_COMPARE, readCompare, writeCompare, type CompareItem } from "@/lib/compare";
import { trackEvent } from "@/lib/analytics";

type CompareButtonProps = {
  item: CompareItem;
  className?: string;
  tooltipPlacement?: "left" | "top";
};

export function CompareButton({ item, className = "", tooltipPlacement = "left" }: CompareButtonProps) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () => setActive(readCompare().some((entry) => entry.id === item.id));
    sync();
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
  }, [item.id]);

  function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const current = readCompare();
    if (active) writeCompare(current.filter((entry) => entry.id !== item.id));
    else if (current.length >= MAX_COMPARE) {
      setMessage(`Maximum ${MAX_COMPARE}`);
      setTimeout(() => setMessage(""), 1800);
    } else {
      writeCompare([...current, item]);
      trackEvent("compare_add", { property_id: item.id, property_slug: item.slug, content_ids: [item.id] });
    }
  }

  const tooltip = active
    ? "Remove this listing from compare."
    : "Add this listing to compare side-by-side with other saved choices.";
  const tooltipClass =
    tooltipPlacement === "top"
      ? "bottom-full left-0 mb-2 w-56"
      : "right-full top-1/2 mr-2 w-48 -translate-y-1/2";

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={toggle}
        className={`peer inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border bg-white/95 text-navy-800 shadow-lg transition hover:border-gold-400 hover:bg-gold-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 ${active ? "border-violet-400 text-violet-700" : "border-navy-200"}`}
        aria-label={active ? "Remove from comparison" : "Add to comparison"}
      >
        <Scale size={20} strokeWidth={2.2} />
      </button>
      <span className={`pointer-events-none absolute z-[9200] hidden rounded-lg bg-blue-700 px-3 py-2 text-left text-[11px] font-semibold leading-snug text-white shadow-xl peer-hover:block peer-focus-visible:block ${tooltipClass}`}>
        {tooltip}
      </span>
      {message && <span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-navy-900 px-2 py-1 text-[10px] text-white">{message}</span>}
    </div>
  );
}
