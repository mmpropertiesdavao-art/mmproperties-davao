"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function PartnerSignupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [profession,setProfession]=useState("seller");
  useEffect(()=>{const p=new URLSearchParams(window.location.search).get("profession");if(["seller","agent","broker","appraiser"].includes(p||""))setProfession(p!)},[]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setResult(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (password !== confirmPassword) {
      setResult({ ok: false, text: "Passwords do not match." }); setLoading(false); return;
    }

    const { data, error } = await supabaseBrowser.auth.signUp({
      email: String(form.get("email")),
      password,
      options: {
        data: {
          full_name: String(form.get("fullName")),
          phone: String(form.get("phone")),
          requested_role: profession === "seller" ? "seller" : "agent",
          profession,
          service_area: String(form.get("serviceArea") || "Davao City"),
          consent_confirmed: form.get("consent") === "on",
          business_name: String(form.get("businessName") || ""),
          prc_license_number: String(form.get("prcLicenseNumber") || ""),
          application_message: String(form.get("message") || ""),
        },
      },
    });

    if (error) setResult({ ok: false, text: error.message });
    else {
      formElement.reset();
      setResult({ ok: true, text: data.session ? "Application submitted. Your account is pending administrator approval." : "Application submitted. Check your email to confirm the account; administrator approval is still required before listing access is enabled." });
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-xl border border-navy-100 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">MM Properties partner network</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy-900">Apply as a seller or collaborator</h1>
        <p className="mt-2 text-sm text-navy-500">Create your account and submit your details. MM Properties reviews every application before listing tools are unlocked.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><Field name="fullName" label="Full name" required /><Field name="phone" label="Phone number" required /></div>
          <div><label className="mb-1 block text-sm font-medium text-navy-800">Apply as</label><select name="profession" value={profession} onChange={e=>setProfession(e.target.value)} required className="w-full rounded-md border border-navy-200 px-3 py-2"><option value="seller">Property seller</option><option value="agent">Real estate agent / collaborator</option><option value="broker">Licensed real estate broker</option><option value="appraiser">Licensed real estate appraiser</option></select></div>
          <div className="grid gap-4 sm:grid-cols-3"><Field name="businessName" label="Agency or business (optional)" /><Field name="prcLicenseNumber" label="PRC license (if applicable)" /><Field name="serviceArea" label="Service area" /></div>
          <div><label className="mb-1 block text-sm font-medium text-navy-800">About your properties or collaboration</label><textarea name="message" rows={4} required className="w-full rounded-md border border-navy-200 px-3 py-2" /></div>
          <Field name="email" label="Email" type="email" required />
          <div className="grid gap-4 sm:grid-cols-2"><Field name="password" label="Password" type="password" required minLength={8} /><Field name="confirmPassword" label="Confirm password" type="password" required minLength={8} /></div>
          <label className="flex items-start gap-2 text-sm text-navy-600"><input name="consent" type="checkbox" required className="mt-1"/> I confirm these details are accurate and consent to MM Properties reviewing my application and contacting me about collaboration.</label>
          {result && <p className={`rounded-md p-3 text-sm ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{result.text}</p>}
          <button disabled={loading} className="w-full rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-900 disabled:opacity-50">{loading ? "Submitting..." : "Submit application"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-navy-500">Already approved? <Link href="/login" className="font-medium text-gold-700 underline">Sign in</Link></p>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", required, minLength }: { name: string; label: string; type?: string; required?: boolean; minLength?: number }) {
  return <div><label className="mb-1 block text-sm font-medium text-navy-800">{label}</label><input name={name} type={type} required={required} minLength={minLength} className="w-full rounded-md border border-navy-200 px-3 py-2" /></div>;
}
