"use client";

// src/app/auth/bridge/page.tsx
//
// Client-side OAuth bridge.
// Reads the browser Supabase session and sends it to the server
// so server-side pages like /seller can authenticate correctly.

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthBridgePage() {
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    async function completeLogin() {
      try {
        const { data, error } = await supabaseBrowser.auth.getSession();

        if (error || !data.session) {
          setMessage("Could not find your login session. Please try signing in again.");
          return;
        }

        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          setMessage(result.error || "Could not complete server login.");
          return;
        }

        window.location.assign(result.destination || "/search");
      } catch {
        setMessage("Could not complete sign in. Please try again.");
      }
    }

    completeLogin();
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