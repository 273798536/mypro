const NS = "steel_coil_balance";

export function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${NS}/${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeKey<T>(key: string, value: T) {
  localStorage.setItem(`${NS}/${key}`, JSON.stringify(value));
}

export function removeKey(key: string) {
  localStorage.removeItem(`${NS}/${key}`);
}

export function makeAuditId(): string {
  return `A_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
