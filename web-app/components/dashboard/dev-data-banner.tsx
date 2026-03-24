/**
 * Server-only banner when API mode is on but unauthenticated requests still get mock data (local dev).
 * Set `SHOW_DEV_DATA_BANNER=false` to hide without changing DATA_MODE / auth behavior. See docs/dev.md.
 */
function isDevBannerExplicitlyDisabled(): boolean {
  const v = process.env.SHOW_DEV_DATA_BANNER?.trim().toLowerCase();
  return v === "false" || v === "0" || v === "off" || v === "no";
}

export function DevDataBanner() {
  if (isDevBannerExplicitlyDisabled()) {
    return null;
  }

  const isApi = process.env.DATA_MODE === "api";
  const authRequired = process.env.REQUIRE_SUPABASE_AUTH === "true";
  const allowUnauthFlag = process.env.ALLOW_UNAUTHENTICATED_DEV === "true";

  if (!isApi || (authRequired && !allowUnauthFlag)) {
    return null;
  }

  const reason =
    !authRequired ? (
      <>
        <code className="rounded bg-[var(--surface-soft)] px-1 py-0.5 font-mono text-[11px]">REQUIRE_SUPABASE_AUTH</code>{" "}
        is not <span className="font-semibold">true</span> (default for local dev)
      </>
    ) : (
      <>
        <code className="rounded bg-[var(--surface-soft)] px-1 py-0.5 font-mono text-[11px]">
          ALLOW_UNAUTHENTICATED_DEV=true
        </code>
      </>
    );

  return (
    <div
      role="status"
      className="border-b border-[color-mix(in_oklab,var(--warning)_35%,var(--border))] bg-[color-mix(in_oklab,var(--warning)_12%,var(--surface))] px-4 py-2 text-center text-xs font-medium text-[var(--text-primary)]"
    >
      <strong className="font-semibold">You are viewing sample data</strong> (developers only) —{" "}
      <code className="rounded bg-[var(--surface-soft)] px-1 py-0.5 font-mono text-[11px]">DATA_MODE=api</code> +{" "}
      {reason}. API routes return mock responses when there is no Supabase session.
      For real data, set <code className="rounded bg-[var(--surface-soft)] px-1 py-0.5 font-mono text-[11px]">
        REQUIRE_SUPABASE_AUTH=true
      </code>{" "}
      and sign in.
    </div>
  );
}
