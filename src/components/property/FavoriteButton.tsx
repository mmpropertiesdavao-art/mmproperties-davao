"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

export function FavoriteButton({ propertyId,className="absolute right-3 top-3",onAction }: { propertyId: string;className?:string;onAction?:()=>void }) {
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

  return <button type="button" onClick={toggle} disabled={working} title={error || (favorited ? "Remove saved property" : "Save property")} className={`${className} rounded-full bg-white/95 p-2 shadow disabled:opacity-60`} aria-label={favorited ? "Remove saved property" : "Save property"}><Heart className={favorited ? "fill-gold-500 text-gold-500" : "text-navy-700"} size={18} /></button>;
}
