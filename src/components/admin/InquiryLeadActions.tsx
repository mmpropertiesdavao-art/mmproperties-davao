"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Follow Up", value: "follow_up" },
  { label: "Interested", value: "interested" },
  { label: "Under Contract", value: "under_contract" },
  { label: "Closed", value: "closed" },
  { label: "Lost", value: "lost" },
];

type InquiryLeadActionsProps = {
  id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  propertyTitle: string | null;
  status: string | null;
  internalNotes: string | null;
  followUpAt: string | null;
  supportsNotes: boolean;
  supportsFollowUp: boolean;
};

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function normalizePhone(phone: string | null) {
  return (phone || "").replace(/[^\d+]/g, "");
}

export function InquiryLeadActions({
  id,
  name,
  email,
  phone,
  propertyTitle,
  status,
  internalNotes,
  followUpAt,
  supportsNotes,
  supportsFollowUp,
}: InquiryLeadActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status || "new");
  const [notes, setNotes] = useState(internalNotes || "");
  const [followUp, setFollowUp] = useState(toLocalInputValue(followUpAt));

  const cleanPhone = normalizePhone(phone);
  const mailto = useMemo(() => {
    if (!email) return "";
    const subject = `MM Properties inquiry${propertyTitle ? `: ${propertyTitle}` : ""}`;
    const body = `Hi ${name || ""},%0D%0A%0D%0AThank you for your inquiry${propertyTitle ? ` about ${propertyTitle}` : ""}.%0D%0A%0D%0A`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }, [email, name, propertyTitle]);

  const whatsapp = cleanPhone ? `https://wa.me/${cleanPhone.replace(/^\+/, "")}` : "";

  async function save() {
    if (!id) {
      setMessage("This inquiry has no ID, so it cannot be updated.");
      return;
    }

    setMessage(null);
    const response = await fetch(`/api/admin/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: currentStatus,
        internalNotes: notes,
        followUpAt: followUp,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || `Could not update lead (${response.status}).`);
      return;
    }

    setMessage("Lead updated.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-4 rounded-xl border border-navy-100 bg-white p-4">
      {(!supportsNotes || !supportsFollowUp) && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Notes and follow-up dates need the CRM database migration before they can be saved.
          Run <span className="font-mono font-semibold">database/inquiry_light_crm.sql</span> in Supabase.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-navy-500">
          Lead status
          <select
            value={currentStatus}
            onChange={(event) => setCurrentStatus(event.target.value)}
            className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm font-normal normal-case text-navy-900"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-navy-500">
          Follow-up
          <input
            type="datetime-local"
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
            disabled={!supportsFollowUp}
            className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm font-normal normal-case text-navy-900 disabled:bg-navy-50 disabled:text-navy-400"
          />
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-navy-500">
        Internal notes {supportsNotes ? <span className="normal-case text-green-700">(private)</span> : <span className="normal-case text-amber-700">(setup needed)</span>}
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={!supportsNotes}
          rows={3}
          placeholder={supportsNotes ? "Add private lead notes..." : "Run database/inquiry_light_crm.sql to enable notes."}
          className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm font-normal normal-case text-navy-900 disabled:bg-navy-50 disabled:text-navy-400"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={isPending}
          className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save lead"}
        </button>

        {mailto && (
          <a href={mailto} className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-800 hover:border-gold-400">
            Reply by email
          </a>
        )}

        {cleanPhone && (
          <a href={`tel:${cleanPhone}`} className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-800 hover:border-gold-400">
            Call
          </a>
        )}

        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-800 hover:border-gold-400">
            WhatsApp
          </a>
        )}
      </div>

      {message && <p className="mt-2 text-xs text-navy-500">{message}</p>}
    </div>
  );
}
