"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthBridgePage() {
  const [message, setMessage] = useState("Completing Google sign in...");

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));

        const { data, error } = await supabaseBrowser.auth.getSession();

        if (error) {
          if (!cancelled) setMessage(error.message);
          return;
        }

        if (!data.session) {
          if (!cancelled) {
            setMessage(
              "Google sign in finished, but no browser session was found. Check Supabase redirect URL settings."
            );
          }
          return;
        }

        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!cancelled) {
            setMessage(result.error || "Could not save server login session.");
          }
          return;
        }

        window.location.assign(result.destination || "/search");
      } catch {
        if (!cancelled) {
          setMessage("Could not complete Google sign in. Please try again.");
        }
      }
    }

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-6 py-16">
      <div className="w-full rounded-xl border border-navy-100 bg-white p-7 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-navy-900">Signing you in</h1>
        <p className="mt-3 text-sm text-navy-500">{message}</p>
      </div>
    </main>
  );
}
