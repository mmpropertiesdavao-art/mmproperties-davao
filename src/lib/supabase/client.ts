import { createBrowserClient } from '@supabase/ssr'

function getSupabaseBrowserConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}

/**
 * Standard Supabase browser client factory.
 * Used by login page and client components.
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserConfig()

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Backward-compatible export.
 * Existing files still import:
 * import { supabaseBrowser } from '@/lib/supabase/client'
 */
export const supabaseBrowser = createClient()