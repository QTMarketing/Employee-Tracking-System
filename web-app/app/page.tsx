import { redirect } from "next/navigation";

import { isMockMode } from "@/lib/data-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page() {
  if (isMockMode()) {
    redirect("/overview");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/overview" : "/login");
}
