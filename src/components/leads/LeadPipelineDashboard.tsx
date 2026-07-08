"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeadPipelineRow, LeadStage } from "@/lib/leads/pipeline";

const STAGES: { label: string; value: LeadStage; className: string }[] = [
  { label: "Total Leads", value: "all", className: "border-navy-200 bg-navy-900 text-white" },
  { label: "New", value: "new", className: "border-blue-200 bg-blue-50 text-blue-800" },
  { label: "Contacted", value: "contacted", className: "border-cyan-200 bg-cyan-50 text-cyan-800" },
  { label: "Qualified", value: "qualified" as LeadStage, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { label: "Follow Up", value: "follow_up", className: "border-amber-200 bg-amber-50 text-amber-800" },
  { label: "Interested", value: "interested", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { label: "Lost", value: "lost", className: "border-red-200 bg-red-50 text-red-800" },
  { label: "Under Contract", value: "under_contract", className: "border-violet-200 bg-violet-50 text-violet-800" },
  { label: "Closed", value: "closed", className: "border-slate-300 bg-slate-100 text-slate-800" },
];

const EDITABLE_STAGES = STAGES.filter((stage) => stage.value !== "all");

type LeadPipelineDashboardProps = {
  leads: LeadPipelineRow[];
  title: string;
  subtitle: string;
  viewerRole: "admin" | "seller" | "agent";
  initialQuery?: string;
  supportsNotes: boolean;
  supportsFollowUp: boolean;
  supportsCrmFields: boolean;
};

function stageLabel(value: string | null | undefined) {
  return STAGES.find((stage) => stage.value === value)?.label || "New";
}

function countFor(leads: LeadPipelineRow[], stage: LeadStage) {
  if (stage === "all") return leads.length;
  return leads.filter((lead) => (lead.status || "new") === stage).length;
}

function normalizePhone(phone: string | null) {
  return (phone || "").replace(/[^\d+]/g, "");
}

function addressOf(lead: LeadPipelineRow) {
  return [lead.propertyAddress, lead.barangay, "Davao City"].filter(Boolean).join(", ");
}

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function propertyTypeParam(value?: string | null) {
  const clean = String(value || "").toLowerCase();
  if (clean.includes("condo")) return "condominium";
  if (clean.includes("lot") && !clean.includes("house")) return "lot-only";
  if (clean.includes("commercial")) return "commercial";
  if (clean.includes("town")) return "townhouse";
  if (clean.includes("house")) return "house-and-lot";
  return "";
}

function budgetParam(value?: string | null) {
  const clean = String(value || "").toLowerCase();
  const millionMatches = [...clean.matchAll(/(\d+(?:\.\d+)?)\s*m/g)].map((match) => Number(match[1]) * 1_000_000);
  if (millionMatches.length) return Math.max(...millionMatches);
  const digits = clean.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function mmPulseUrl(lead: LeadPipelineRow) {
  const params = new URLSearchParams();
  const area = lead.preferredLocation || lead.barangay || "";
  const type = propertyTypeParam(lead.propertyType);
  const budget = budgetParam(lead.budget);
  if (area) params.set("area", area);
  if (type) params.set("type", type);
  if (budget) params.set("budget", String(budget));
  params.set("run", "1");
  return `/matcher?${params.toString()}`;
}

function shortSource(value?: string | null) {
  if (!value) return "";
  try {
    const paramsText = value.includes("?") ? value.split("?")[1] : value;
    const params = new URLSearchParams(paramsText);
    const source = params.get("utm_source");
    const campaign = params.get("utm_campaign");
    const medium = params.get("utm_medium");
    if (source || campaign) return [source, campaign, medium].filter(Boolean).join(" / ");
  } catch {}
  return value.length > 72 ? `${value.slice(0, 72).trim()}...` : value;
}

export function LeadPipelineDashboard({
  leads,
  title,
  subtitle,
  viewerRole,
  initialQuery = "",
  supportsNotes,
  supportsFollowUp,
  supportsCrmFields,
}: LeadPipelineDashboardProps) {
  const [activeStage, setActiveStage] = useState<LeadStage>("all");
  const filtered = useMemo(
    () => activeStage === "all" ? leads : leads.filter((lead) => (lead.status || "new") === activeStage),
    [activeStage, leads],
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-700">Lead pipeline</p>
            <h1 className="mt-1 text-2xl font-bold text-navy-950">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-navy-500">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewerRole === "admin" ? (
              <>
                <a href="/api/admin/leads/export?format=csv" className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-700 hover:border-gold-400">Export CSV</a>
                <a href="/api/admin/leads/export?format=xls" className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-700 hover:border-gold-400">Export Excel</a>
                <Link href="/admin/properties" className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-700 hover:border-gold-400">
                  Manage listings
                </Link>
              </>
            ) : (
              <Link href="/seller" className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-700 hover:border-gold-400">
                Seller dashboard
              </Link>
            )}
          </div>
        </div>

        {(!supportsNotes || !supportsFollowUp) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Notes, follow-up dates, and CRM-ready fields need the database migration before they can be saved.
            Run <span className="font-mono font-semibold">database/inquiry_light_crm.sql</span> in Supabase.
          </div>
        )}

        <form className="mb-4 flex flex-col gap-2 rounded-2xl border border-navy-100 bg-white p-3 shadow-sm sm:flex-row" action={viewerRole === "admin" ? "/admin/inquiries" : "/seller/leads"}>
          <label className="sr-only" htmlFor="lead-search">Search leads</label>
          <input
            id="lead-search"
            name="q"
            defaultValue={initialQuery}
            placeholder="Search customer, phone, email, property, seller, or agent..."
            className="min-w-0 flex-1 rounded-xl border border-navy-200 px-4 py-3 text-sm outline-none focus:border-gold-400"
          />
          <button className="rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white">Search</button>
          {initialQuery && (
            <Link href={viewerRole === "admin" ? "/admin/inquiries" : "/seller/leads"} className="inline-flex items-center justify-center rounded-xl border border-navy-200 px-4 py-3 text-sm font-semibold text-navy-700">
              Reset
            </Link>
          )}
        </form>

        <div className="mb-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {STAGES.map((stage) => {
              const active = activeStage === stage.value;
              return (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => setActiveStage(stage.value)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition sm:text-sm ${stage.className} ${active ? "ring-2 ring-gold-400 ring-offset-2" : "opacity-90 hover:opacity-100"}`}
                >
                  {stage.label}
                  <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-navy-900">
                    {countFor(leads, stage.value)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="border-b border-navy-100 bg-navy-50 px-4 py-3 text-sm font-semibold text-navy-700">
            Showing {filtered.length} {activeStage === "all" ? "lead" : stageLabel(activeStage).toLowerCase()} record{filtered.length === 1 ? "" : "s"}
            {supportsCrmFields && <span className="ml-2 text-xs font-normal text-navy-400">CRM sync-ready</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-navy-800">No leads in this stage.</p>
              <p className="mt-2 text-sm text-navy-500">New inquiries will appear in the New tab first.</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-100">
              {filtered.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  viewerRole={viewerRole}
                  supportsNotes={supportsNotes}
                  supportsFollowUp={supportsFollowUp}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function LeadCard({
  lead,
  viewerRole,
  supportsNotes,
  supportsFollowUp,
}: {
  lead: LeadPipelineRow;
  viewerRole: "admin" | "seller" | "agent";
  supportsNotes: boolean;
  supportsFollowUp: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [messageExpanded, setMessageExpanded] = useState(false);
  const [status, setStatus] = useState(lead.status || "new");
  const [notes, setNotes] = useState(lead.internalNotes || "");
  const [followUp, setFollowUp] = useState(toLocalInputValue(lead.followUpAt));
  const [notice, setNotice] = useState<string | null>(null);
  const [pulseNotice, setPulseNotice] = useState("");
  const cleanPhone = normalizePhone(lead.phone);
  const pulseUrl = mmPulseUrl(lead);
  const address = addressOf(lead);
  const hasPreferences = Boolean(lead.preferredLocation || lead.propertyType || lead.budget || lead.buyingTimeline);
  const shortAddress = address.length > 96 && !expanded ? `${address.slice(0, 96).trim()}...` : address;
  const shortMessage = lead.message && lead.message.length > 150 && !messageExpanded ? `${lead.message.slice(0, 150).trim()}...` : lead.message;
  const subject = `MM Properties inquiry${lead.propertyTitle ? `: ${lead.propertyTitle}` : ""}`;
  const mailto = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Hi ${lead.name || ""},\n\nThank you for your inquiry${lead.propertyTitle ? ` about ${lead.propertyTitle}` : ""}.\n\n`)}`
    : "";

  async function save() {
    setNotice(null);
    const response = await fetch(`/api/admin/inquiries/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, internalNotes: notes, followUpAt: followUp }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(data.error || `Could not update lead (${response.status}).`);
      return;
    }
    setNotice("Saved.");
    startTransition(() => router.refresh());
  }

  async function deleteLead() {
    if (viewerRole !== "admin" || !window.confirm("Delete this lead record?")) return;
    setNotice(null);
    const response = await fetch(`/api/admin/leads/${lead.id}?type=${lead.recordType || "inquiry"}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(data.error || "Could not delete lead.");
      return;
    }
    setNotice("Deleted.");
    startTransition(() => router.refresh());
  }

  async function copyPulseLink() {
    const absolute = `${window.location.origin}${pulseUrl}`;
    await navigator.clipboard.writeText(absolute);
    setPulseNotice("MM Pulse link copied.");
    setTimeout(() => setPulseNotice(""), 1800);
  }

  return (
    <article className="group relative grid gap-4 p-4 transition hover:bg-navy-50/60 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.85fr)_220px]">
      <div className="min-w-0">
        <div className="flex gap-3">
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-navy-100 sm:hidden">
            <img src={lead.coverImageUrl || "/placeholder-property.png"} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase text-navy-500 ring-1 ring-navy-100">
                {stageLabel(status)}
              </span>
              {lead.source && <span className="rounded-full bg-gold-50 px-2 py-1 text-[11px] font-semibold text-gold-800">{lead.source}</span>}
              {lead.trafficSource && <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800">{shortSource(lead.trafficSource)}</span>}
            </div>
            <h2 className="mt-2 line-clamp-1 font-bold text-navy-950">{lead.propertyTitle || "No property linked"}</h2>
            <p className="mt-1 text-sm leading-6 text-navy-600">
              {shortAddress || "No address provided"}
              {address.length > 96 && (
                <button type="button" onClick={() => setExpanded((value) => !value)} className="ml-1 font-bold text-gold-700">
                  {expanded ? "See less" : "See more"}
                </button>
              )}
            </p>
            {lead.propertySlug && (
              <Link href={`/property/${lead.propertySlug}`} className="mt-1 inline-block text-xs font-bold text-navy-700 underline">
                View listing
              </Link>
            )}
            {hasPreferences && (
              <div className="mt-3 grid gap-2 rounded-xl border border-navy-100 bg-white p-3 text-xs text-navy-700 sm:grid-cols-2">
                {lead.preferredLocation && (
                  <p><span className="font-bold uppercase text-navy-500">Location:</span> {lead.preferredLocation}</p>
                )}
                {lead.propertyType && (
                  <p><span className="font-bold uppercase text-navy-500">Type:</span> {lead.propertyType}</p>
                )}
                {lead.budget && (
                  <p><span className="font-bold uppercase text-navy-500">Budget:</span> {lead.budget}</p>
                )}
                {lead.buyingTimeline && (
                  <p><span className="font-bold uppercase text-navy-500">Timeline:</span> {lead.buyingTimeline}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {lead.coverImageUrl && (
          <div className="pointer-events-none absolute left-5 top-20 z-20 hidden w-56 overflow-hidden rounded-xl border border-white bg-white p-1 opacity-0 shadow-2xl transition group-hover:opacity-100 sm:block">
            <img src={lead.coverImageUrl} alt="" className="h-36 w-full rounded-lg object-cover" />
          </div>
        )}
      </div>

      <div className="min-w-0 text-sm">
        <p className="font-bold text-navy-900">{lead.name || "Unnamed lead"}</p>
        <p className="mt-1 break-words text-navy-600">{lead.email || "No email"} · {lead.phone || "No phone"}</p>
        {lead.message && (
          <p className="mt-2 whitespace-pre-line leading-6 text-navy-600">
            {shortMessage}
            {lead.message.length > 150 && (
              <button type="button" onClick={() => setMessageExpanded((value) => !value)} className="ml-1 font-bold text-gold-700">
                {messageExpanded ? "See less" : "See more"}
              </button>
            )}
          </p>
        )}
        <p className="mt-2 text-xs text-navy-400">
          {lead.createdAt ? `Submitted ${new Date(lead.createdAt).toLocaleString()}` : "Submission date unavailable"}
        </p>
        {viewerRole === "admin" && (
          <p className="mt-1 text-xs text-navy-400">
            Seller: {lead.sellerName || lead.sellerEmail || "Unassigned"} · Agent: {lead.agentName || lead.agentEmail || "Unassigned"}
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-900">
          {EDITABLE_STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
        </select>
        <input
          type="datetime-local"
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          disabled={!supportsFollowUp}
          className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm disabled:bg-navy-50 disabled:text-navy-400"
        />
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={!supportsNotes}
          rows={3}
          placeholder={supportsNotes ? "Seller/admin/agent notes..." : "Run CRM migration to enable notes."}
          className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm disabled:bg-navy-50 disabled:text-navy-400"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={isPending} className="rounded-lg bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950 disabled:opacity-50">
            {isPending ? "Saving" : "Save"}
          </button>
          {mailto && <a href={mailto} className="rounded-lg border border-navy-200 px-3 py-2 text-xs font-bold text-navy-700">Email</a>}
          <a href={pulseUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-gold-300 px-3 py-2 text-xs font-bold text-navy-800">MM Pulse</a>
          <button type="button" onClick={() => void copyPulseLink()} className="rounded-lg border border-gold-300 px-3 py-2 text-xs font-bold text-navy-800">Copy Pulse link</button>
          {cleanPhone && <a href={`tel:${cleanPhone}`} className="rounded-lg border border-navy-200 px-3 py-2 text-xs font-bold text-navy-700">Call</a>}
          {cleanPhone && <a href={`https://wa.me/${cleanPhone.replace(/^\+/, "")}`} target="_blank" rel="noreferrer" className="rounded-lg border border-navy-200 px-3 py-2 text-xs font-bold text-navy-700">WhatsApp</a>}
          {viewerRole === "admin" && <button type="button" onClick={() => void deleteLead()} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete</button>}
        </div>
        {(notice || pulseNotice) && <p className="text-xs text-navy-500">{pulseNotice || notice}</p>}
      </div>
    </article>
  );
}
