"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";

interface PropertyContactModalProps {
  propertyTitle: string;
  propertyPrice: string;
  propertyLocation: string;
  propertyDescription: string | null;
  listedByName: string;
  listedBySubtext?: string | null;
  children: ReactNode;
}

export function PropertyContactModal({
  propertyTitle,
  propertyPrice,
  propertyLocation,
  propertyDescription,
  listedByName,
  listedBySubtext,
  children,
}: PropertyContactModalProps) {
  const [open, setOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const cleanDescription = String(propertyDescription || "").trim();
  const maxLength = 220;
  const shouldTruncate = cleanDescription.length > maxLength;

  const visibleDescription = useMemo(() => {
    if (!cleanDescription) {
      return "No description has been added for this listing yet.";
    }

    if (!shouldTruncate || descriptionExpanded) {
      return cleanDescription;
    }

    return `${cleanDescription.slice(0, maxLength).trim()}...`;
  }, [cleanDescription, descriptionExpanded, shouldTruncate]);

  function closeModal() {
    setOpen(false);
    setDescriptionExpanded(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        <MessageCircle size={17} />
        Contact / Inquire
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
                  Property Inquiry
                </p>

                <h2 className="mt-1 text-lg font-bold text-navy-900">
                  {propertyTitle}
                </h2>

                <p className="mt-1 text-sm text-navy-500">
                  Listed by{" "}
                  <span className="font-semibold text-navy-800">
                    {listedByName}
                  </span>
                  {listedBySubtext ? ` · ${listedBySubtext}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border p-2 text-navy-500 transition hover:bg-navy-50 hover:text-navy-900"
                aria-label="Close inquiry modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="rounded-xl border border-navy-100 bg-navy-50/40 p-4">
                <p className="text-xl font-bold text-navy-950">
                  {propertyPrice}
                </p>

                <p className="mt-1 text-sm text-navy-500">
                  {propertyLocation}
                </p>

                <div className="mt-4 border-t border-navy-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    Property summary
                  </p>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-navy-700">
                    {visibleDescription}
                  </p>

                  {shouldTruncate && (
                    <button
                      type="button"
                      onClick={() =>
                        setDescriptionExpanded((current) => !current)
                      }
                      className="mt-2 text-sm font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4"
                    >
                      {descriptionExpanded ? "See less" : "See more"}
                    </button>
                  )}
                </div>
              </section>

              <section>
                {children}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}