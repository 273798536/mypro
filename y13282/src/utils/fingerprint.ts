import type { ComplaintRecord } from "../types";

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

function fnv1a32(str: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * FNV_PRIME) >>> 0;
  }
  return hash;
}

function normalizeTime(timeStr: string): string {
  if (!timeStr) return "";
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return timeStr.slice(0, 16);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function generateFingerprint(
  record: Partial<ComplaintRecord>
): string {
  const reporter = (record.reporter || "").trim().toLowerCase();
  const reportTime = normalizeTime(record.report_time || "");
  const location = (record.location_name || "").trim().toLowerCase();
  const desc = (record.description || "").trim().slice(0, 20).toLowerCase();

  const raw = `${reporter}|${reportTime}|${location}|${desc}`;
  const hash = fnv1a32(raw);
  return hash.toString(16).padStart(8, "0");
}

export function similarityScore(
  a: Partial<ComplaintRecord>,
  b: Partial<ComplaintRecord>
): number {
  const fpA = generateFingerprint(a);
  const fpB = generateFingerprint(b);
  if (fpA === fpB) return 1.0;

  let match = 0;
  let total = 0;

  const fields = [
    ["reporter", 2],
    ["location_name", 3],
    ["intersection", 2],
  ] as const;

  for (const [key, weight] of fields) {
    const va = (a[key] || "").trim().toLowerCase();
    const vb = (b[key] || "").trim().toLowerCase();
    total += weight;
    if (va && vb && va === vb) match += weight;
  }

  const ta = normalizeTime(a.report_time || "");
  const tb = normalizeTime(b.report_time || "");
  total += 2;
  if (ta && tb && ta === tb) match += 2;

  const da = (a.description || "").slice(0, 10).toLowerCase();
  const db = (b.description || "").slice(0, 10).toLowerCase();
  total += 1;
  if (da && db && da === db) match += 1;

  return total > 0 ? match / total : 0;
}
