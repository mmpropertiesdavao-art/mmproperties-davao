"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function VisitorSignupPage() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function emailSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const { data, error } = await supabaseBrowser.auth.signUp({ email: String(form.get("email")), password: String(form.get("password")), options: { data: { full_name: String(form.get("fullName")) } } });
    setMessage(error ? { ok: false, text: error.message } : { ok: true, text: data.session ? "Account created." : "Check your email to confirm your account." });
    setLoading(false);
  }

  async function googleSignup() {
  await supabaseBrowser.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

  return <div className="mx-auto max-w-md px-6 py-14"><div className="rounded-xl border border-navy-100 bg-white p-7 shadow-sm"><h1 className="text-2xl font-semibold text-navy-900">Create a buyer account</h1><p className="mt-2 text-sm text-navy-500">Save properties and keep your inquiries connected to one account.</p><button type="button" onClick={googleSignup} className="mt-6 w-full rounded-md border border-navy-200 px-4 py-3 font-medium text-navy-800">Continue with Google</button><div className="my-5 flex items-center gap-3 text-xs text-navy-400"><span className="h-px flex-1 bg-navy-100" />or use email<span className="h-px flex-1 bg-navy-100" /></div><form onSubmit={emailSignup} className="space-y-4"><input name="fullName" required placeholder="Full name" className="w-full rounded-md border border-navy-200 px-3 py-2" /><input name="email" type="email" required placeholder="Email" className="w-full rounded-md border border-navy-200 px-3 py-2" /><input name="password" type="password" minLength={8} required placeholder="Password (8+ characters)" className="w-full rounded-md border border-navy-200 px-3 py-2" />{message && <p className={`rounded-md p-3 text-sm ${message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}<button disabled={loading} className="w-full rounded-md bg-gold-500 px-4 py-3 font-semibold text-navy-900">{loading ? "Creating..." : "Create account"}</button></form><p className="mt-5 text-center text-sm text-navy-500">Already registered? <Link href="/login" className="text-gold-700 underline">Sign in</Link></p></div></div>;
}
