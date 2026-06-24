"use client";

import { useEffect } from "react";

export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const key = "mm-properties-visitor-id";
    let visitorId = localStorage.getItem(key);
    if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem(key, visitorId); }
    void fetch(`/api/properties/${propertyId}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, source: document.referrer ? "referral" : "direct" }) });
  }, [propertyId]);
  return null;
}
