import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { isMockMode } from "@/lib/data-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (isMockMode()) {
    return (
      <div className="flex min-h-screen items-start bg-[var(--board-bg)]">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--surface)]">
          <Topbar />
          <main className="flex-1 px-8 py-6">{children}</main>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-start bg-[var(--board-bg)]">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--surface)]">
        <Topbar />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
