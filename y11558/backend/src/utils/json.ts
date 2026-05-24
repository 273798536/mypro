export function toJson(value: any): string {
  return JSON.stringify(value);
}

export function fromJson<T = any>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function safeParse<T = any>(value: string | null | undefined, defaultValue: T): T {
  const parsed = fromJson<T>(value);
  return parsed ?? defaultValue;
}
