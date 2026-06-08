import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LengthUnit, WidthUnit, DepthUnit } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toMm(value: number, unit: LengthUnit | WidthUnit | DepthUnit): number {
  switch (unit) {
    case "mm": return value
    case "cm": return value * 10
    case "m": return value * 1000
    default: return value
  }
}

export function formatTime(iso: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleString("zh-CN", { hour12: false })
  } catch {
    return iso
  }
}

export function detectTimezoneIssue(t1: string, t2: string): boolean {
  if (!t1 || !t2) return false
  return t1.includes("Z") !== t2.includes("Z") || t1.includes("+08") !== t2.includes("+08")
}

