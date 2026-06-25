"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");

      if (data.role === "buyer" && next?.startsWith("/seller")) {
        setError("Your account exists, but partner access is still pending administrator approval.");
        setLoading(false);
        return;
      }

      const destination = next || (data.role === "buyer" ? "/search" : "/seller");
      window.location.assign(destination);
    } catch {
      setError("Could not reach the login server. Please try again.");
      setLoading(false);
    }
  }

  async function googleSignIn() {
    const next = new URLSearchParams(window.location.search).get("next") || "/search";
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border border-navy-100 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Partner portal</p>
        <h1 className="mt-2 text-2xl font-semibold text-navy-900">Seller and agent login</h1>
        <p className="mt-2 text-sm text-navy-500">
          Approved collaborators can manage listings and photos here. Accounts are issued by MM Properties.
        </p>

        <button
          type="button"
          onClick={googleSignIn}
          className="mt-5 w-full rounded-md border border-navy-200 px-4 py-3 font-medium text-navy-800"
        >
          Continue with Google
        </button>

        <form onSubmit={signIn} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-800">Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-navy-200 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy-800">Password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-navy-200 px-3 py-2"
            />
          </div>

          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-md bg-gold-500 px-4 py-3 font-semibold text-navy-900 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-navy-500">
          Need partner access?{" "}
          <Link href="/signup" className="font-medium text-gold-700 underline">
            Apply as a seller or collaborator
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-navy-500">
          Buying property?{" "}
          <Link href="/account/signup" className="font-medium text-gold-700 underline">
            Create a buyer account
          </Link>
        </p>
      </div>
    </div>
  );
}
