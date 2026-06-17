import type { Entry, EntryInput, MergeGroup } from "@/types";

const BASE = "/api";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const json = (await res.json()) as ApiResponse<T>;
      if (json.error) message = json.error;
    } catch {
      // ignore parse error, keep default message
    }
    throw new Error(message);
  }
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error || "请求失败");
  return json.data;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchEntries(): Promise<Entry[]> {
  const res = await fetch(`${BASE}/entries`);
  return handle<Entry[]>(res);
}

export async function createEntries(entries: EntryInput[]): Promise<Entry[]> {
  const res = await fetch(`${BASE}/entries/batch`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ entries }),
  });
  return handle<Entry[]>(res);
}

export async function patchEntry(id: number, body: Partial<Entry>): Promise<Entry> {
  const res = await fetch(`${BASE}/entries/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  return handle<Entry>(res);
}

export async function deleteEntry(id: number): Promise<void> {
  const res = await fetch(`${BASE}/entries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("删除失败");
}

export async function fetchGroups(): Promise<MergeGroup[]> {
  const res = await fetch(`${BASE}/merge/groups`);
  return handle<MergeGroup[]>(res);
}

export async function runMerge(): Promise<unknown> {
  const res = await fetch(`${BASE}/merge/run`, { method: "POST" });
  return handle<unknown>(res);
}

export async function patchGroup(
  id: number,
  body: { merged_name?: string; merged_latitude?: number; merged_longitude?: number; remark?: string },
): Promise<unknown> {
  const res = await fetch(`${BASE}/merge/groups/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  return handle<unknown>(res);
}

export async function ungroupEntry(entryId: number): Promise<unknown> {
  const res = await fetch(`${BASE}/merge/ungroup`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ entryId }),
  });
  return handle<unknown>(res);
}

export async function groupEntry(entryId: number, groupId: number): Promise<unknown> {
  const res = await fetch(`${BASE}/merge/group`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ entryId, groupId }),
  });
  return handle<unknown>(res);
}

export async function seedData(): Promise<Entry[]> {
  const res = await fetch(`${BASE}/seed`, { method: "POST" });
  return handle<Entry[]>(res);
}

export async function exportCsv(): Promise<void> {
  const res = await fetch(`${BASE}/export/csv`);
  if (!res.ok) throw new Error("导出失败");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "merge_export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
