import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function transformKeys<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map((item) => transformKeys<unknown>(item)) as T
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value)
    }
    return result as T
  }
  return obj as T
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const json = await res.json()
  if (json.success && json.data !== undefined) {
    return transformKeys<T>(json.data)
  }
  return transformKeys<T>(json)
}
