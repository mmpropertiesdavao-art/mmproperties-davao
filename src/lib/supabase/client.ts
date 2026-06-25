// src/lib/supabase/client.ts
//
// Browser Supabase client using @supabase/ssr.
// This is required so OAuth login can work with server-readable auth cookies.

import { createBrowserClient } from "@supabase/ssr";

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);