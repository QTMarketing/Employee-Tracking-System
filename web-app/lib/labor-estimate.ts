import type { DashboardBarPoint } from "@/lib/types/domain";

/**
 * Weighted hours for a rough labor estimate: regular at 1×, OT at 1.5×, double time at 2×.
 * Matches dashboard chart / labor-by-store logic.
 */
export function weightedHoursForLaborEstimate(regular: number, ot: number, dt: number): number {
  return Number(regular) + Number(ot) * 1.5 + Number(dt) * 2;
}

/**
 * Blended hourly rate (USD) for **estimated** labor on dashboard charts and the labor-by-store report.
 * This is a single default until per-employee or per-store rates are wired in.
 *
 * Set `LABOR_ESTIMATE_BLENDED_RATE` in `.env.local` (server-side) to match your company’s rule of thumb.
 */
export function getLaborEstimateBlendedRateUsd(): number {
  const raw = process.env.LABOR_ESTIMATE_BLENDED_RATE?.trim();
  if (!raw) return 25;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 25;
}

/**
 * Turn per-store labor dollar totals into integer percentages that sum to **100** (largest remainder method).
 */
export function laborCostsToBarPoints(entries: Array<{ store: string; laborCost: number }>): DashboardBarPoint[] {
  const total = entries.reduce((s, e) => s + e.laborCost, 0);
  if (total <= 0) {
    return entries.map((e) => ({ store: e.store, laborCost: e.laborCost, laborPct: 0 }));
  }

  const withRaw = entries.map((e) => ({
    store: e.store,
    laborCost: e.laborCost,
    rawPct: (e.laborCost / total) * 100,
  }));

  const floors = withRaw.map((r) => Math.floor(r.rawPct));
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);

  const order = withRaw
    .map((r, i) => ({ i, frac: r.rawPct - floors[i]! }))
    .sort((a, b) => b.frac - a.frac);

  const pct = [...floors];
  for (let k = 0; k < remainder && k < order.length; k++) {
    pct[order[k]!.i] += 1;
  }

  return withRaw.map((r, i) => ({
    store: r.store,
    laborCost: r.laborCost,
    laborPct: pct[i]!,
  }));
}
