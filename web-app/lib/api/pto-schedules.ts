import type { PtoRequestRow, ScheduledShiftRow } from "@/lib/types/domain";

type CreatePtoBody = {
  storeId: string;
  employeeId?: string;
  requestType: PtoRequestRow["requestType"];
  startDate: string;
  endDate: string;
  note?: string | null;
};

type PatchPtoBody = {
  status: "approved" | "denied" | "cancelled";
  managerNote?: string | null;
};

type CreateShiftBody = {
  storeId: string;
  employeeId: string;
  startAt: string;
  endAt: string;
  shiftTemplate: ScheduledShiftRow["shiftTemplate"];
  roleLabel?: string | null;
  notes?: string | null;
};

export async function fetchPtoRequests(): Promise<PtoRequestRow[]> {
  const res = await fetch("/api/pto-requests", { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to load PTO requests");
  }
  const payload = (await res.json()) as { data: PtoRequestRow[] };
  return payload.data;
}

export async function createPtoRequest(body: CreatePtoBody): Promise<PtoRequestRow> {
  const res = await fetch("/api/pto-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errBody?.error ?? "Failed to create request");
  }
  const payload = (await res.json()) as { data: PtoRequestRow };
  return payload.data;
}

export async function updatePtoRequest(id: string, body: PatchPtoBody): Promise<PtoRequestRow> {
  const res = await fetch(`/api/pto-requests/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errBody?.error ?? "Failed to update request");
  }
  const payload = (await res.json()) as { data: PtoRequestRow };
  return payload.data;
}

export async function fetchScheduledShifts(filters: {
  from?: string;
  to?: string;
  storeId?: string;
}): Promise<ScheduledShiftRow[]> {
  const sp = new URLSearchParams();
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (filters.storeId) sp.set("storeId", filters.storeId);
  const q = sp.toString();
  const res = await fetch(`/api/scheduled-shifts${q ? `?${q}` : ""}`, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to load schedules");
  }
  const payload = (await res.json()) as { data: ScheduledShiftRow[] };
  return payload.data;
}

export async function createScheduledShift(body: CreateShiftBody): Promise<ScheduledShiftRow> {
  const res = await fetch("/api/scheduled-shifts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errBody?.error ?? "Failed to create shift");
  }
  const payload = (await res.json()) as { data: ScheduledShiftRow };
  return payload.data;
}

export async function deleteScheduledShift(id: string): Promise<void> {
  const res = await fetch(`/api/scheduled-shifts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errBody?.error ?? "Failed to delete shift");
  }
}
