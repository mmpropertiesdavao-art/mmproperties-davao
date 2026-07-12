"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

type PropertyShareButtonProps = {
  slug: string;
  title: string;
  propertyId?: string;
  className?: string;
  label?: boolean;
};

export function PropertyShareButton({
  slug,
  title,
  propertyId,
  className = "absolute right-3 top-[6.5rem] z-30",
  label = false,
}: PropertyShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function share(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}/property/${slug}`;
    trackEvent("share_listing", { property_id: propertyId || "", property_slug: slug });

    if (navigator.share) {
      await navigator.share({ title, text: title, url }).catch(() => {});
      return;
    }

    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onClick={share}
      className={`${className} inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-navy-200 bg-white/95 px-3 text-navy-800 shadow-lg transition hover:border-gold-400 hover:bg-gold-50 active:scale-95`}
      aria-label="Share this listing"
      title={copied ? "Listing link copied" : "Share listing"}
    >
      <Share2 size={18} />
      {label && <span className="text-sm font-semibold">{copied ? "Copied" : "Share"}</span>}
    </button>
  );
}
