import type { TrajectoryPoint, PlannedWaypoint, DriftCalculation } from "@/types";

const EARTH_RADIUS_M = 6371000;
const NAUTICAL_MILE_TO_METER = 1852;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface HaversineResult {
  distanceM: number;
  distanceNM: number;
}

export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): HaversineResult {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceM = EARTH_RADIUS_M * c;
  return {
    distanceM,
    distanceNM: distanceM / NAUTICAL_MILE_TO_METER,
  };
}

export const HAVERSINE_FORMULA = `d = 2R · arcsin(√(sin²(Δφ/2) + cosφ₁·cosφ₂·sin²(Δλ/2)))

其中：
  R  = 6,371,000 m  — 地球平均半径
  φ  = 纬度（弧度）, Δφ = φ₂ − φ₁
  λ  = 经度（弧度）, Δλ = λ₂ − λ₁
  d  = 大圆距离（米）`;

export const DRIFT_RATE_FORMULA = `航迹偏差率 P(%) = (Σᵢ₌₁ⁿ dᵢ ÷ L) × 100%

其中：
  dᵢ = 第 i 个实际点到计划航线的最短距离（米）
  L  = 计划航线总航程（海里）
  n  = 参与计算的轨迹点数量

结果分级：
  P < 3%   → 正常
  3% ≤ P < 8% → 轻微漂移
  P ≥ 8%   → 显著漂移（建议复核）`;

export const APPLICABLE_SCOPE = {
  haversine: {
    minDistanceNM: 0.01,
    maxDistanceNM: 500,
    note: "适用 0.0185 海里（约 34 米）至 500 海里（约 926 公里）的点对点测距；超出范围结果仅供参考。",
  },
  driftRate: {
    minRouteLengthNM: 1,
    maxSpeedKnots: 25,
    note: "适用计划航程 ≥ 1 海里，航速 < 25 节的船舶航迹；航速过快或航线过短会导致偏差率失准。",
  },
};

export function pointToLineDistanceM(
  point: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) {
    return haversine(point.lat, point.lng, a.lat, a.lng).distanceM;
  }
  const t =
    ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const proj = {
    lng: a.lng + clampedT * dx,
    lat: a.lat + clampedT * dy,
  };
  return haversine(point.lat, point.lng, proj.lat, proj.lng).distanceM;
}

export function totalRouteDistanceNM(waypoints: PlannedWaypoint[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversine(
      waypoints[i - 1].lat,
      waypoints[i - 1].lng,
      waypoints[i].lat,
      waypoints[i].lng,
    ).distanceNM;
  }
  return total;
}

export interface DriftCalcInput {
  actualTrajectory: TrajectoryPoint[];
  plannedRoute: PlannedWaypoint[];
  meteoAvailable: boolean;
  windReportDate?: string;
  aisRawAvailable: boolean;
  aisTimeRange?: string;
}

export function calculateDrift(input: DriftCalcInput): DriftCalculation {
  const missingInputs: string[] = [];
  const failureSteps: DriftCalculation["failureSteps"] = [];

  if (input.actualTrajectory.length < 5) {
    missingInputs.push("有效轨迹点数量不足（至少 5 个）");
    failureSteps.push({
      title: "AIS 轨迹点不足",
      detail: `当前仅采集到 ${input.actualTrajectory.length} 个有效点，算法最低要求 5 个。`,
      action: `请补传 AIS 原始报文，建议覆盖巡检前后各 30 分钟窗口。`,
    });
  }
  if (input.plannedRoute.length < 2) {
    missingInputs.push("计划航线航路点不足（至少 2 个）");
    failureSteps.push({
      title: "计划航线数据缺失",
      detail: "无法进行偏差计算，因未配置该巡检的计划航线航路点。",
      action: "请在「航线管理」模块补录本次投喂的出发港、投喂区、返回港三个航路点。",
    });
  }
  if (!input.meteoAvailable) {
    missingInputs.push("当日 06:00 时气象风场预报");
    failureSteps.push({
      title: "风场预报数据缺失",
      detail: input.windReportDate
        ? `${input.windReportDate} 06 时风场预报未获取。`
        : "本次巡检对应的风场预报尚未同步。",
      action: input.windReportDate
        ? `请至海洋气象数据平台补传 ${input.windReportDate} 06:00 时风场产品。`
        : "请确认巡检日期后至气象平台下载对应时次的 GRIB2 风场产品并导入。",
    });
  }
  if (!input.aisRawAvailable) {
    missingInputs.push("AIS 原始报文");
    failureSteps.push({
      title: "AIS 原始报文缺失",
      detail: input.aisTimeRange
        ? `${input.aisTimeRange} 时段 AIS 原始报文未获取。`
        : "缺少轨迹反演所需的 AIS 原始报文。",
      action: input.aisTimeRange
        ? `请在 AIS 数据服务平台下载 ${input.aisTimeRange} 的原始报文并导入。`
        : "请从海事 AIS 中心导出该船舶 MMSI 对应的完整报文。",
    });
  }

  const routeNM = totalRouteDistanceNM(input.plannedRoute);

  if (routeNM > 0 && routeNM < APPLICABLE_SCOPE.driftRate.minRouteLengthNM) {
    missingInputs.push(
      `计划航线航程（${routeNM.toFixed(2)} 海里）低于算法下限（1 海里）`,
    );
  }
  const overSpeed = input.actualTrajectory.some(
    (p) => p.speedKnots > APPLICABLE_SCOPE.driftRate.maxSpeedKnots,
  );
  if (overSpeed) {
    missingInputs.push("存在航速超过 25 节的异常轨迹点");
  }

  if (missingInputs.length > 0) {
    return {
      id: `calc-${Date.now()}`,
      inspectionId: "",
      formulaUsed: "Haversine + 航迹偏差率",
      missingInputs,
      failureHint:
        missingInputs.length <= 2
          ? `缺少 ${missingInputs.length} 项必填数据，补充后即可计算。`
          : `共缺少 ${missingInputs.length} 项数据，请按下方清单逐项补传。`,
      failureSteps,
      status: "FAILED",
    };
  }

  let totalDriftM = 0;
  const matchedPoints: { label: string; value: string; unit: string }[] = [];
  input.actualTrajectory.forEach((point, idx) => {
    let minDist = Infinity;
    for (let j = 1; j < input.plannedRoute.length; j++) {
      const dist = pointToLineDistanceM(
        point,
        input.plannedRoute[j - 1],
        input.plannedRoute[j],
      );
      if (dist < minDist) minDist = dist;
    }
    totalDriftM += minDist;
    if (idx < 3) {
      matchedPoints.push({
        label: `点 ${idx + 1} 漂移距离`,
        value: minDist.toFixed(1),
        unit: "米",
      });
    }
  });

  const avgDriftM = totalDriftM / input.actualTrajectory.length;
  const totalRouteM = routeNM * NAUTICAL_MILE_TO_METER;
  const driftRatePercent =
    totalRouteM > 0 ? (totalDriftM / totalRouteM) * 100 : 0;

  const calculationSteps = [
    { label: "轨迹点数量", value: input.actualTrajectory.length.toString(), unit: "个" },
    { label: "计划航线总航程 L", value: routeNM.toFixed(2), unit: "海里" },
    ...matchedPoints,
    {
      label: "Σ漂移距离 Σdᵢ",
      value: totalDriftM.toFixed(0),
      unit: "米",
    },
    {
      label: "平均单点漂移",
      value: avgDriftM.toFixed(1),
      unit: "米",
    },
    {
      label: "偏差率 P = Σd ÷ L × 100%",
      value: driftRatePercent.toFixed(2),
      unit: "%",
    },
  ];

  return {
    id: `calc-${Date.now()}`,
    inspectionId: "",
    driftDistanceMeters: avgDriftM,
    driftDistanceNautical: avgDriftM / NAUTICAL_MILE_TO_METER,
    driftRatePercent,
    formulaUsed: "Haversine + 航迹偏差率",
    missingInputs: [],
    status: "SUCCESS",
    calculationSteps,
  };
}
