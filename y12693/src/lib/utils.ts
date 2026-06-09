import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UnitType } from "../../shared/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const UNIT_LABELS: Record<UnitType, string> = {
  meter: "米 (m)",
  feet: "英尺 (ft)",
  lumen: "流明 (lm)",
  candela: "坎德拉 (cd)",
  kelvin: "开尔文 (K)",
};

export function convertUnit(value: number, from: UnitType, to: UnitType): number {
  const metersToFeet = 3.28084;
  switch (`${from}-${to}`) {
    case "meter-feet":
      return value * metersToFeet;
    case "feet-meter":
      return value / metersToFeet;
    case "lumen-candela":
      return value / 12.566;
    case "candela-lumen":
      return value * 12.566;
    default:
      return value;
  }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
