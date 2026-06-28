"use client";

import Image from "next/image";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

const MESSENGER_URL = "https://m.me/MMPropertiesDavao";

export function MessengerButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Message MM Properties on Messenger"
        className="fixed bottom-24 right-4 z-[8500] inline-flex h-13 w-13 items-center justify-center rounded-full border border-gold-400 bg-navy-900 text-white shadow-2xl ring-4 ring-white/80 transition hover:-translate-y-0.5 hover:bg-navy-800 hover:text-gold-300 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      >
        <MessageCircle size={26} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9200] flex items-end justify-center bg-navy-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Message MM Properties on Messenger"
            className="w-full max-w-md animate-[modalPop_.18s_ease-out] rounded-t-3xl border border-gold-300 bg-white p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-gold-400">
                  <Image src="/mmprologo_new.png" alt="MM Properties" width={52} height={52} className="object-contain" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-700">Messenger</p>
                  <h2 className="text-lg font-extrabold text-navy-950">Message MM Properties</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-navy-200 p-2 text-navy-700 hover:bg-navy-50"
                aria-label="Close Messenger prompt"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-navy-600">
              Continue to Messenger to chat with MM Properties Davao. This will open Messenger in a new tab so you can return to this page anytime.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                href={MESSENGER_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-bold text-white hover:bg-navy-800"
              >
                <MessageCircle size={18} />
                Continue to Messenger
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-navy-200 px-4 py-3 text-sm font-bold text-navy-700 hover:border-gold-400"
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
