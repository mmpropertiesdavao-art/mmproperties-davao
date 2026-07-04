"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

export function BlogShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-navy-500 shadow-sm transition hover:border-gold-400 hover:text-navy-900"
      aria-label="Share this article"
    >
      {copied ? "Copied" : "Share"} <Share2 size={16} />
    </button>
  );
}
