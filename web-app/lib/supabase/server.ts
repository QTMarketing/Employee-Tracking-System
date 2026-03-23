import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getEnv } from "@/lib/env";
import { Database } from "@/lib/types/supabase";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
    },
  );
}
