import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.0001 && value !== 0) {
    return value.toExponential(decimals);
  }
  if (Math.abs(value) >= 1000000) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals);
}
