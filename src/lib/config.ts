/// <reference types="vite/client" />

export const APP_VERSION = '0.2.0'

/** Where "Send by email" posts a bug report. Empty = button hidden. */
export const FEEDBACK_EMAIL = (import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined) ?? ''

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

/**
 * With both Supabase variables set the app talks to the real backend: real
 * accounts, data shared between the two partners. Without them it falls back to
 * a browser-only store — useful for local UI work, useless for two people.
 */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
