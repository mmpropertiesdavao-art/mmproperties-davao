"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { trackEvent, trackLead } from "@/lib/analytics";

const LOCATIONS = ["Bajada", "Buhangin", "Catalunan Grande", "Ecoland", "Lanang", "Matina", "Mintal", "Puan", "Toril", "Other / Not sure"];
const BUDGETS = ["Below PHP 2M", "PHP 2M - 4M", "PHP 4M - 7M", "PHP 7M - 12M", "PHP 12M - 20M", "PHP 20M+", "Not sure yet"];
const PROPERTY_TYPES = ["House & Lot", "Condominium", "Lot Only", "Commercial"];
const TIMELINES = ["Ready Now", "Within 3 Months", "3-12 Months", "Just Researching"];

type LeadFormKind = "buyer" | "seller";

type MultiStepLeadFormProps = {
  kind: LeadFormKind;
  compact?: boolean;
  sourcePage?: string;
};

const inputClass = "min-h-11 w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-100";

export function MultiStepLeadForm({ kind, compact = false, sourcePage }: MultiStepLeadFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({
    leadType: kind,
    sourcePage: sourcePage || "",
    fullName: "",
    email: "",
    mobile: "",
    preferredLocation: "",
    budget: "",
    propertyType: "",
    buyingTimeline: "",
    propertyAddress: "",
    lotArea: "",
    floorArea: "",
    reasonForSelling: "",
    message: "",
    website: "",
  });

  const steps = useMemo(() => kind === "buyer"
    ? ["Contact Info", "Preferences", "Timeline"]
    : ["Contact Info", "Property Details", "Selling Plans"], [kind]);

  function update(name: string, value: string) {
    if (!started) {
      setStarted(true);
      trackEvent("lead_form_start", { lead_type: kind, source_page: sourcePage || location.pathname });
    }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function requiredForStep() {
    if (step === 0) return ["fullName", "email", "mobile"];
    if (kind === "buyer" && step === 1) return ["preferredLocation", "budget", "propertyType"];
    if (kind === "buyer" && step === 2) return ["buyingTimeline"];
    if (kind === "seller" && step === 1) return ["propertyAddress", "propertyType"];
    return [];
  }

  function canContinue() {
    return requiredForStep().every((field) => form[field]?.trim());
  }

  async function submit() {
    setError("");
    if (!canContinue()) {
      setError("Please complete the required fields before continuing.");
      return;
    }
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sourcePage: form.sourcePage || window.location.pathname,
          trafficSource: document.referrer || "direct",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not submit your request.");
      trackLead({ lead_type: kind, source_page: form.sourcePage || window.location.pathname });
      router.push(`/thank-you?type=${kind}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit your request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`rounded-3xl border border-white/20 bg-white p-4 text-left shadow-2xl sm:p-5 ${compact ? "" : "mx-auto max-w-2xl"}`}>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-700">{kind === "buyer" ? "Free buyer matching" : "Free property valuation"}</p>
        <h2 className="mt-1 text-xl font-bold text-navy-950">{kind === "buyer" ? "Find Your Perfect Property in Davao" : "Get a Free Property Valuation"}</h2>
        <p className="mt-1 text-sm leading-6 text-navy-500">
          {kind === "buyer"
            ? "Tell us what you're looking for and we'll recommend properties that match your budget and preferences."
            : "Share a few property details and we'll help you understand your selling options."}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-semibold text-navy-500">
          <span>Step {step + 1} of {steps.length}</span>
          <span>{steps[step]}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100">
          <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} className="hidden" aria-hidden="true" />

      {step === 0 && (
        <div className="grid gap-3">
          <Field label="Full Name" name="fullName" value={form.fullName} onChange={update} required />
          <Field label="Email Address" name="email" type="email" value={form.email} onChange={update} required />
          <Field label="Mobile Number" name="mobile" value={form.mobile} onChange={update} required />
        </div>
      )}

      {kind === "buyer" && step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Preferred Location" name="preferredLocation" value={form.preferredLocation} onChange={update} options={LOCATIONS} required />
          <Select label="Budget" name="budget" value={form.budget} onChange={update} options={BUDGETS} required />
          <Select label="Property Type" name="propertyType" value={form.propertyType} onChange={update} options={PROPERTY_TYPES} required className="sm:col-span-2" />
        </div>
      )}

      {kind === "buyer" && step === 2 && (
        <div className="grid gap-3">
          <Select label="Buying Timeline" name="buyingTimeline" value={form.buyingTimeline} onChange={update} options={TIMELINES} required />
          <label className="text-sm font-semibold text-navy-800">Notes / must-haves
            <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={3} className={`${inputClass} mt-1`} placeholder="Example: near schools, financing available, parking, preferred barangay..." />
          </label>
        </div>
      )}

      {kind === "seller" && step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-navy-800 sm:col-span-2">Property Address
            <textarea value={form.propertyAddress} onChange={(event) => update("propertyAddress", event.target.value)} rows={3} className={`${inputClass} mt-1`} required />
          </label>
          <Select label="Property Type" name="propertyType" value={form.propertyType} onChange={update} options={PROPERTY_TYPES} required />
          <Field label="Lot Area" name="lotArea" value={form.lotArea} onChange={update} placeholder="sqm" />
          <Field label="Floor Area" name="floorArea" value={form.floorArea} onChange={update} placeholder="sqm" />
        </div>
      )}

      {kind === "seller" && step === 2 && (
        <div className="grid gap-3">
          <label className="text-sm font-semibold text-navy-800">Reason for Selling
            <textarea value={form.reasonForSelling} onChange={(event) => update("reasonForSelling", event.target.value)} rows={3} className={`${inputClass} mt-1`} placeholder="Upsizing, relocating, investment exit, urgent sale, exploring value..." />
          </label>
          <label className="text-sm font-semibold text-navy-800">Additional notes
            <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={3} className={`${inputClass} mt-1`} />
          </label>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-5 flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((value) => value - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-navy-200 px-4 text-sm font-bold text-navy-700">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button type="button" onClick={submit} disabled={loading} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 text-sm font-bold text-navy-950 hover:bg-gold-400 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={16} /> : step === steps.length - 1 ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
          {step === steps.length - 1 ? (kind === "buyer" ? "Get Property Recommendations" : "Request Free Valuation") : "Continue"}
        </button>
      </div>
    </section>
  );
}

function Field({ label, name, value, onChange, type = "text", required, placeholder, className = "" }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; type?: string; required?: boolean; placeholder?: string; className?: string }) {
  return <label className={`text-sm font-semibold text-navy-800 ${className}`}>{label}{required && " *"}<input name={name} type={type} required={required} value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} className={`${inputClass} mt-1`} /></label>;
}

function Select({ label, name, value, onChange, options, required, className = "" }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; options: string[]; required?: boolean; className?: string }) {
  return <label className={`text-sm font-semibold text-navy-800 ${className}`}>{label}{required && " *"}<select name={name} required={required} value={value} onChange={(event) => onChange(name, event.target.value)} className={`${inputClass} mt-1`}><option value="">Select...</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
