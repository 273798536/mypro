import { DriftCalculationResult } from './types';

const EARTH_RADIUS_KM = 6371.0088;
const NAUTICAL_MILE_PER_KM = 0.539957;

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateDrift(
  reportedLat: number,
  reportedLng: number,
  actualLat: number,
  actualLng: number
): DriftCalculationResult {
  const input = { lat1: reportedLat, lng1: reportedLng, lat2: actualLat, lng2: actualLng };
  const formula =
    'd = 2R · arcsin(√[sin²((φ₂-φ₁)/2) + cosφ₁·cosφ₂·sin²((λ₂-λ₁)/2)])，其中 R=6371.0088km（地球平均半径），φ为纬度，λ为经度';
  const scope =
    '适用范围：港口锚地近距离漂移计算（0~200海里），基于WGS-84坐标系。对于跨时区或远距离航线，需考虑椭球体修正及大地水准面差异。输入值需为十进制度数格式（如 22.3056°N 记作 22.3056）。';

  const checkLat = (v: number) => v >= -90 && v <= 90;
  const checkLng = (v: number) => v >= -180 && v <= 180;

  if (
    [reportedLat, reportedLng, actualLat, actualLng].some(
      (v) => typeof v !== 'number' || isNaN(v)
    )
  ) {
    return {
      distance: 0,
      unit: '海里',
      formula,
      applicable: false,
      failReason: '失败原因：存在非数值坐标，无法计算。请确认上报经纬度和实际经纬度字段均为数字。',
      scope,
      input,
    };
  }

  if (!checkLat(reportedLat) || !checkLat(actualLat)) {
    return {
      distance: 0,
      unit: '海里',
      formula,
      applicable: false,
      failReason: '失败原因：纬度超出有效范围（-90°~+90°）。请检查坐标数据是否颠倒了经纬度。',
      scope,
      input,
    };
  }

  if (!checkLng(reportedLng) || !checkLng(actualLng)) {
    return {
      distance: 0,
      unit: '海里',
      formula,
      applicable: false,
      failReason: '失败原因：经度超出有效范围（-180°~+180°）。请检查坐标数据格式。',
      scope,
      input,
    };
  }

  if (reportedLat === actualLat && reportedLng === actualLng) {
    return {
      distance: 0,
      unit: '海里',
      formula,
      applicable: true,
      failReason: null,
      scope,
      input,
    };
  }

  const km = haversineDistance(reportedLat, reportedLng, actualLat, actualLng);
  const nm = km * NAUTICAL_MILE_PER_KM;

  if (nm > 200) {
    return {
      distance: Number(nm.toFixed(3)),
      unit: '海里',
      formula,
      applicable: false,
      failReason:
        '失败原因：计算距离超过200海里，超出锚地漂移合理范围。可能是经纬度填反或数据源错误，请人工复核坐标。',
      scope,
      input,
    };
  }

  return {
    distance: Number(nm.toFixed(3)),
    unit: '海里',
    formula,
    applicable: true,
    failReason: null,
    scope,
    input,
  };
}
