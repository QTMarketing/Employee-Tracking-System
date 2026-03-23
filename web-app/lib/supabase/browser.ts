"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getEnv } from "@/lib/env";
import { Database } from "@/lib/types/supabase";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
