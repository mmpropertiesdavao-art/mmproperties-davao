"use client";

import { useState } from "react";

type ListingStatusAction = "active" | "sold" | "reserved" | "rented" | "inactive";

type ListingStatusActionsProps = {
  propertyId: string;
  status?: string | null;
  availability?: string | null;
  onChange?: (next: { status: string; availability: string }) => void;
  compact?: boolean;
};

const ACTIONS: {
  action: ListingStatusAction;
  label: string;
  confirm?: string;
  className: string;
}[] = [
  {
    action: "active",
    label: "Mark Active",
    className: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100",
  },
  {
    action: "reserved",
    label: "Reserved",
    className: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
  {
    action: "rented",
    label: "Rented",
    className: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  },
  {
    action: "sold",
    label: "Mark Sold",
    confirm: "Mark this listing as sold? It will be removed from public search and map pins but remain in your dashboard.",
    className: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100",
  },
  {
    action: "inactive",
    label: "Archive",
    confirm: "Archive this listing? It will disappear from public search and can be reactivated later.",
    className: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  },
];

async function readJson(response: Response) {
  return response.json().catch(() => ({
    error: response.ok ? "The server returned an empty response." : "The server returned an invalid response.",
  }));
}

export function ListingStatusActions({
  propertyId,
  status,
  availability,
  onChange,
  compact = false,
}: ListingStatusActionsProps) {
  const [savingAction, setSavingAction] = useState<ListingStatusAction | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function updateStatus(action: ListingStatusAction, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setSavingAction(action);
    setMessage(null);

    const response = await fetch(`/api/admin/properties/${propertyId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    const data = await readJson(response);

    if (!response.ok) {
      setMessage({ ok: false, text: data.error || "Could not update listing status." });
      setSavingAction(null);
      return;
    }

    const next = data.property as { status: string; availability: string };
    onChange?.(next);
    setMessage({ ok: true, text: `Listing is now ${next.availability}.` });
    setSavingAction(null);
  }

  return (
    <section className={compact ? "space-y-3" : "rounded-xl border border-navy-100 bg-white p-4 shadow-sm"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">Listing status</p>
          <p className="text-xs capitalize text-navy-500">
            Current: {status || "draft"} / {availability || "not set"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        {ACTIONS.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => void updateStatus(item.action, item.confirm)}
            disabled={Boolean(savingAction)}
            className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${item.className}`}
          >
            {savingAction === item.action ? "Saving..." : item.label}
          </button>
        ))}
      </div>

      {message && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
