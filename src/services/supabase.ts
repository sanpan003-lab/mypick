/**
 * Supabase client configured for the self-hosted NAS instance.
 *
 * The Supabase-compatible API (PostgREST + GoTrue) runs behind Nginx on the NAS.
 * VITE_SUPABASE_URL  → http://192.168.5.195:5435  (local Postgres/PostgREST)
 * VITE_SUPABASE_ANON_KEY → anon JWT for the local instance
 *
 * These values are set in .env and injected at build time by Vite.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
