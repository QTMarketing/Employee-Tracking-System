import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DevDataBanner } from "@/components/dashboard/dev-data-banner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { allowsDashboardWithoutAuth } from "@/lib/auth-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!allowsDashboardWithoutAuth()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--board-bg)]">
      <DevDataBanner />
      <div className="flex min-h-0 flex-1 items-stretch">
        <Sidebar showLogout={!allowsDashboardWithoutAuth()} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--surface)]">
          <Topbar />
          <main className="mx-auto w-full max-w-[1920px] flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
