"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(async ({ data }) => { setSignedIn(Boolean(data.user)); if (data.user) { const profile = await supabaseBrowser.from("users").select("role").eq("id", data.user.id).single(); setRole(profile.data?.role ?? "buyer"); } });
    const { data } = supabaseBrowser.auth.onAuthStateChange(async (_event, session) => { setSignedIn(Boolean(session?.user)); if (session?.user) { const profile = await supabaseBrowser.from("users").select("role").eq("id", session.user.id).single(); setRole(profile.data?.role ?? "buyer"); } else setRole(null); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!signedIn) {
    return <Link href="/login" className="rounded-md border border-gold-400 px-3 py-2 transition hover:bg-navy-800">Log in</Link>;
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={role === "buyer" ? "/account/favorites" : "/seller"} className="transition hover:text-gold-400">{role === "buyer" ? "Saved" : "Dashboard"}</Link>
      <button type="button" onClick={() => supabaseBrowser.auth.signOut()} className="text-slate-300 transition hover:text-white">Log out</button>
    </div>
  );
}
