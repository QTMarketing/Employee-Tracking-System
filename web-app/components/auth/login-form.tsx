"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed in successfully");
    router.replace("/overview");
    router.refresh();
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Email</label>
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Password</label>
        <Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing In..." : "Sign In"}
      </Button>
    </form>
  );
}
