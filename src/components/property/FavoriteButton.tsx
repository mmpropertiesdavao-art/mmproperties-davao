"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

export function FavoriteButton({ propertyId,className="absolute right-3 top-3 z-30",onAction }: { propertyId: string;className?:string;onAction?:()=>void }) {
  const [favorited, setFavorited] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/favorites/${propertyId}`).then((response) => response.ok ? response.json() : null).then((data) => data && setFavorited(Boolean(data.favorited))).catch(() => undefined);
  }, [propertyId]);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault(); event.stopPropagation();
    onAction?.();
    setError(null);
    setWorking(true);
    try {
      const response = await fetch(`/api/favorites/${propertyId}`, { method: favorited ? "DELETE" : "POST" });
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not update saved property.");
      setFavorited(Boolean(data.favorited));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update saved property.");
    } finally {
      setWorking(false);
    }
  }

  return <button type="button" onPointerDown={(event)=>event.stopPropagation()} onMouseDown={(event)=>event.stopPropagation()} onTouchStart={(event)=>event.stopPropagation()} onClick={toggle} disabled={working} title={error || (favorited ? "Remove saved property" : "Save property")} aria-pressed={favorited} className={`${className} inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 shadow-lg transition active:scale-95 disabled:opacity-60 ${favorited ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-white/95 text-red-600 hover:border-red-500 hover:bg-red-50"}`} aria-label={favorited ? "Remove saved property" : "Save property"}><Heart className={favorited ? "fill-white text-white" : "text-red-600"} size={21} /></button>;
}
