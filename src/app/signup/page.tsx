"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function PartnerSignupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const form = new FormData(event.currentTarget);

    const fullName = String(form.get("fullName") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!fullName || !phone || !email || !password) {
      setResult({ ok: false, text: "Please complete all required fields." });
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setResult({ ok: false, text: "Password must be at least 8 characters." });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setResult({ ok: false, text: "Passwords do not match." });
      setLoading(false);
      return;
    }

    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    if (error) {
      setResult({ ok: false, text: error.message });
      setLoading(false);
      return;
    }

    if (!data.session) {
      setResult({
        ok: true,
        text:
          "Account created. Please check your email to confirm your account, then log in using the same email you used in your approved application.",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/sync-approved-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const syncData = await response.json().catch(() => ({}));

      if (response.ok && syncData.synced && syncData.role !== "buyer") {
        setResult({
          ok: true,
          text: "Account created and partner access activated. Redirecting to your dashboard...",
        });

        window.location.assign("/seller");
        return;
      }

      setResult({
        ok: true,
        text:
          "Account created, but no approved seller/agent application was found for this email yet. If you already applied, wait for admin approval or make sure you used the same email address.",
      });
    } catch {
      setResult({
        ok: true,
        text:
          "Account created. Please log in again to complete partner access activation.",
      });
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-14">
      <div className="rounded-xl border border-navy-100 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">
          MM Properties partner access
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-navy-900">
          Create your seller/agent account
        </h1>

        <p className="mt-2 text-sm leading-6 text-navy-500">
          Use the same email address from your approved application. Your access
          will activate automatically after signup or login.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field name="fullName" label="Full name" required />
          <Field name="phone" label="Phone number" required />
          <Field name="email" label="Email" type="email" required />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="password"
              label="Password"
              type="password"
              required
              minLength={8}
            />
            <Field
              name="confirmPassword"
              label="Confirm password"
              type="password"
              required
              minLength={8}
            />
          </div>

          {result && (
            <p
              className={`rounded-md p-3 text-sm ${
                result.ok
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {result.text}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-900 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create partner account"}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm text-navy-500">
          <p>
            Not approved yet?{" "}
            <Link href="/apply" className="font-medium text-gold-700 underline">
              Apply first
            </Link>
          </p>

          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-gold-700 underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  minLength,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-navy-800">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="w-full rounded-md border border-navy-200 px-3 py-2"
      />
    </div>
  );
}