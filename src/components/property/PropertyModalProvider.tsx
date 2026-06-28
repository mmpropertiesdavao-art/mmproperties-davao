"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { PropertyDetailsModal, type PropertyDetailPayload } from "@/components/property/PropertyDetailsModal";

type PropertyModalContextValue = {
  openProperty: (slug: string) => void;
};

const PropertyModalContext = createContext<PropertyModalContextValue | null>(null);

export function usePropertyModal() {
  return useContext(PropertyModalContext);
}

export function PropertyModalProvider({ children }: { children: React.ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [payload, setPayload] = useState<PropertyDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setSlug(null);
    setPayload(null);
    setError(null);
    setLoading(false);
  }, []);

  const openProperty = useCallback((nextSlug: string) => {
    setSlug(nextSlug);
    setPayload(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/property-details/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Could not load this property.");
        }
        return data as PropertyDetailPayload;
      })
      .then((data) => {
        if (!cancelled) setPayload(data);
        if (data.property?.id) {
          void fetch(`/api/properties/${data.property.id}/view`, { method: "POST" });
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load this property.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    function onOpen(event: Event) {
      const custom = event as CustomEvent<{ slug?: string }>;
      if (custom.detail?.slug) openProperty(custom.detail.slug);
    }

    window.addEventListener("mm:open-property", onOpen);
    return () => window.removeEventListener("mm:open-property", onOpen);
  }, [openProperty]);

  useEffect(() => {
    if (!slug) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (document.body.dataset.mmNestedModal === "true") return;
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, slug]);

  const value = useMemo(() => ({ openProperty }), [openProperty]);

  return (
    <PropertyModalContext.Provider value={value}>
      {children}

      {slug && (
        <div
          className="fixed inset-0 z-[9000] bg-navy-950/70 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Property details"
            className="fixed inset-0 mx-auto flex h-[100dvh] max-w-6xl animate-[modalSlideUp_.22s_ease-out] flex-col overflow-hidden rounded-none bg-white shadow-2xl md:inset-x-4 md:inset-y-4 md:h-auto md:rounded-3xl xl:inset-x-6"
          >
            <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
              <p className="text-sm font-semibold text-navy-500">
                MM Properties listing details
              </p>

              <button
                type="button"
                onClick={close}
                className="rounded-full border border-navy-200 p-2 text-navy-700 transition hover:border-gold-400 hover:bg-gold-50"
                aria-label="Close property details"
              >
                <X size={20} />
              </button>
            </div>

            {loading && (
              <div className="flex flex-1 items-center justify-center">
                <p className="rounded-full bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-600">
                  Loading property details…
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-1 items-center justify-center p-6 text-center">
                <div>
                  <p className="font-semibold text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-4 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {payload && !loading && !error && <PropertyDetailsModal payload={payload} />}
          </div>
        </div>
      )}
    </PropertyModalContext.Provider>
  );
}
