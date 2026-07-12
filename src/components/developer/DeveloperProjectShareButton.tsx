"use client";

import { Forward } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

type DeveloperProjectShareButtonProps = {
  slug: string;
  title: string;
  projectId?: string;
  className?: string;
  label?: boolean;
};

export function DeveloperProjectShareButton({
  slug,
  title,
  projectId,
  className = "",
  label = false,
}: DeveloperProjectShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const sizeClass = label ? "min-h-11 px-4" : "min-h-11 min-w-11";

  async function share(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}/projects/${slug}`;
    trackEvent("share_developer_project", { project_id: projectId || "", project_slug: slug });

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
      className={`${className} inline-flex ${sizeClass} items-center justify-center gap-2 rounded-full border border-navy-200 bg-white/95 text-navy-900 shadow-lg transition hover:border-gold-400 hover:bg-gold-50 active:scale-95`}
      aria-label="Share this project"
      title={copied ? "Project link copied" : "Share project"}
    >
      <Forward className="fill-navy-900 text-navy-900" size={20} strokeWidth={2.7} />
      {label && <span className="text-sm font-semibold">{copied ? "Copied" : "Share"}</span>}
    </button>
  );
}
