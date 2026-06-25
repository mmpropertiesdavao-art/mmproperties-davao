import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Pool, type QueryResult } from 'pg'

function getSupabaseServerConfig() {
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

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

type DbQueryInput =
  | string
  | {
      text?: string
      sql?: string
      query?: string
      values?: unknown[]
      params?: unknown[]
    }

/**
 * Supabase SSR client.
 * Use this for authenticated server-side Supabase Auth reads.
 *
 * This is what fixes:
 * - /auth/callback
 * - /api/debug/me
 * - requireRole()
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseServerConfig()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // This can happen in Server Components.
          // Route handlers and server actions can write cookies.
        }
      },
    },
  })
}

/**
 * Backward-compatible Postgres db export.
 *
 * Existing app files use:
 *   import { db } from '@/lib/supabase/server'
 *   await db.query(...)
 *
 * Some files pass plain SQL strings.
 * Other files pass a custom SqlQuery object from postgis/queries.
 * This wrapper supports both.
 *
 * Important:
 * The default row type is intentionally `any`.
 * The existing app already passes db.query().rows directly into typed UI components.
 */
const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error(
    'Missing database connection string. Add DATABASE_URL or SUPABASE_DATABASE_URL to .env.local and Vercel.'
  )
}

declare global {
  // eslint-disable-next-line no-var
  var __mmPropertiesPgPool: Pool | undefined
}

const pool =
  globalThis.__mmPropertiesPgPool ||
  new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__mmPropertiesPgPool = pool
}

function normalizeQuery(input: DbQueryInput, params?: unknown[]) {
  if (typeof input === 'string') {
    return {
      text: input,
      values: params || [],
    }
  }

  const text = input.text || input.sql || input.query
  const values = input.values || input.params || params || []

  if (!text) {
    throw new Error('Invalid db.query input: missing text/sql/query property')
  }

  return {
    text,
    values,
  }
}

export const db = {
  query: <T extends Record<string, any> = any>(
    input: DbQueryInput,
    params?: unknown[]
  ): Promise<QueryResult<T>> => {
    const query = normalizeQuery(input, params)
    return pool.query(query.text, query.values)
  },
}