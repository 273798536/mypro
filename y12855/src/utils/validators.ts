import type { TrajectoryPoint, WaterQualitySample } from "@/types";

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  errors: string[];
}

export function validateLatitude(lat: number): ValidationResult<number> {
  if (Number.isNaN(lat)) return { valid: false, errors: ["纬度必须是数字"] };
  if (lat < -90 || lat > 90)
    return { valid: false, errors: ["纬度必须在 -90° 至 90° 之间"] };
  return { valid: true, value: lat, errors: [] };
}

export function validateLongitude(lng: number): ValidationResult<number> {
  if (Number.isNaN(lng)) return { valid: false, errors: ["经度必须是数字"] };
  if (lng < -180 || lng > 180)
    return { valid: false, errors: ["经度必须在 -180° 至 180° 之间"] };
  return { valid: true, value: lng, errors: [] };
}

export function validateTrajectoryPoint(p: TrajectoryPoint): ValidationResult<TrajectoryPoint> {
  const errors: string[] = [];
  const latRes = validateLatitude(p.lat);
  const lngRes = validateLongitude(p.lng);
  errors.push(...latRes.errors, ...lngRes.errors);
  if (p.speedKnots < 0) errors.push("航速不能为负数");
  if (p.speedKnots > 60) errors.push("航速超过 60 节，疑似异常");
  if (!p.timestamp) errors.push("轨迹点缺少时间戳");
  return { valid: errors.length === 0, value: p, errors };
}

export function validateWaterQuality(s: WaterQualitySample): ValidationResult<WaterQualitySample> {
  const errors: string[] = [];
  if (s.ph < 0 || s.ph > 14) errors.push("pH 值应在 0-14 之间（海水正常 7.8-8.5）");
  if (s.dissolvedOxygen < 0 || s.dissolvedOxygen > 20)
    errors.push("溶解氧应在 0-20 mg/L 范围内（海水正常 5-10）");
  if (s.turbidityNtu < 0) errors.push("浊度不能为负数");
  if (s.temperatureC < -5 || s.temperatureC > 40)
    errors.push("水温异常（建议范围 -2°C 至 35°C）");
  return { valid: errors.length === 0, value: s, errors };
}

export function validateDateString(date: string): ValidationResult<string> {
  const d = new Date(date);
  if (Number.isNaN(d.getTime()))
    return { valid: false, errors: [`日期格式不合法: ${date}`] };
  return { valid: true, value: date, errors: [] };
}

export function validateNotEmpty(value: string, fieldName: string): ValidationResult<string> {
  if (!value || value.trim().length === 0) {
    return { valid: false, errors: [`${fieldName}不能为空`] };
  }
  return { valid: true, value, errors: [] };
}
