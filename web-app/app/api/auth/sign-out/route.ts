import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/data-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isMockMode()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  const redirectUrl = new URL("/login", request.url);
  return NextResponse.redirect(redirectUrl);
}
