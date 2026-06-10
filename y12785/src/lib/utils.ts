import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

export function convertKeys<T = any>(obj: any, fn: (s: string) => string): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((x) => convertKeys(x, fn)) as any
  const result: Record<string, any> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[fn(key)] = convertKeys(obj[key], fn)
    }
  }
  return result as T
}

export async function fetchApi<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = body.error || body || { message: '请求失败' }
    throw err
  }
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T
  }
  return body as T
}

export function toSnakeBody(obj: any): any {
  return convertKeys(obj, camelToSnake)
}

export function fromSnakeData<T = any>(data: any): T {
  return convertKeys<T>(data, snakeToCamel)
}
