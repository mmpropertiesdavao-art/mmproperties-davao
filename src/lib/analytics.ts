"use client";

type AnalyticsValue = string | number | boolean | null | undefined | AnalyticsValue[] | { [key: string]: AnalyticsValue };

declare global {
  interface Window {
    dataLayer?: Record<string, AnalyticsValue>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, params: Record<string, AnalyticsValue> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  window.gtag?.("event", event, params);
  window.fbq?.("trackCustom", event, params);
}

export function trackLead(params: Record<string, AnalyticsValue> = {}) {
  trackEvent("lead_submitted", params);
  if (typeof window !== "undefined") window.fbq?.("track", "Lead", params);
}

export function trackViewContent(params: Record<string, AnalyticsValue> = {}) {
  trackEvent("view_content", params);
  if (typeof window !== "undefined") window.fbq?.("track", "ViewContent", params);
}
