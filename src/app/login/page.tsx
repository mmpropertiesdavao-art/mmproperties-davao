"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function passwordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email") || "").trim().toLowerCase();
      const password = String(form.get("password") || "");

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
        setError(
          "Your account exists, but partner access is still pending administrator approval."
        );
        setLoading(false);
        return;
      }

      const destination =
        next || (data.role === "buyer" ? "/search" : "/seller");

      window.location.assign(destination);
    } catch {
      setError("Could not reach the login server. Please try again.");
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setGoogleLoading(true);
    setError("");

    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/bridge`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-14">
      <div className="rounded-xl border border-navy-100 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy-900">Sign in</h1>

        <p className="mt-2 text-sm text-navy-500">
          Access your saved properties, seller tools, or admin dashboard.
        </p>

        <button
          type="button"
          onClick={googleSignIn}
          disabled={googleLoading || loading}
          className="mt-6 w-full rounded-md border border-navy-200 px-4 py-3 font-medium text-navy-800 disabled:opacity-50"
        >
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-navy-400">
          <span className="h-px flex-1 bg-navy-100" />
          or use email
          <span className="h-px flex-1 bg-navy-100" />
        </div>

        <form onSubmit={passwordLogin} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-md border border-navy-200 px-3 py-2"
          />

          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-md border border-navy-200 px-3 py-2"
          />

          {error && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={loading || googleLoading}
            className="w-full rounded-md bg-gold-500 px-4 py-3 font-semibold text-navy-900 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-navy-500">
          Need partner access?{" "}
          <Link href="/apply" className="font-medium text-gold-700 underline">
            Apply as a seller or collaborator
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-navy-500">
          Buying property?{" "}
          <Link
            href="/account/signup"
            className="font-medium text-gold-700 underline"
          >
            Create a buyer account
          </Link>
        </p>
      </div>
    </div>
  );
}
