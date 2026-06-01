import type {
  HullParams,
  LoadItem,
  InclinationRecord,
  VerificationResult,
  AnomalyDetail,
  CgModificationImpact,
} from "@/types";

const FRESH_WATER_DENSITY = 1.000;
const SALT_WATER_DENSITY = 1.025;
const DENSITY_TOLERANCE = 0.010;
const MAX_ROLL_ANGLE = 15.0;
const MAX_PITCH_ANGLE = 5.0;
const ECCENTRICITY_RATIO_THRESHOLD = 0.15;
const BM_COEFFICIENT = 0.0833;

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function calculateBM(beam: number, draft: number): number {
  if (draft <= 0 || beam <= 0) return 0;
  const I = (beam * Math.pow(beam, 3)) / 12;
  const V = beam * draft * (beam * 0.7);
  return I / Math.max(V, 0.001);
}

function calculateKB(draft: number): number {
  return draft * 0.53;
}

function calculateKG(hull: HullParams, loads: LoadItem[]): number {
  const totalWeight = hull.displacement + loads.reduce((s, l) => s + l.weight, 0);
  if (totalWeight <= 0) return hull.cgZ;

  const moment = hull.displacement * hull.cgZ + loads.reduce(
    (s, l) => s + l.weight * l.positionZ,
    0
  );
  return moment / totalWeight;
}

function calculateLoadEccentricity(
  hull: HullParams,
  loads: LoadItem[]
): { offsetX: number; offsetY: number; ratio: number } {
  if (loads.length === 0) return { offsetX: 0, offsetY: 0, ratio: 0 };

  const totalWeight = loads.reduce((s, l) => s + l.weight, 0);
  if (totalWeight <= 0) return { offsetX: 0, offsetY: 0, ratio: 0 };

  const avgX = loads.reduce((s, l) => s + l.weight * l.positionX, 0) / totalWeight;
  const avgY = loads.reduce((s, l) => s + l.weight * l.positionY, 0) / totalWeight;

  const offsetX = Math.abs(avgX - hull.cgX);
  const offsetY = Math.abs(avgY - hull.cgY);
  const beam = Math.max(hull.beam, 0.001);
  const ratio = Math.sqrt(offsetX * offsetX + offsetY * offsetY) / (beam / 2);

  return { offsetX, offsetY, ratio };
}

function checkDensityMisuse(hull: HullParams): AnomalyDetail | null {
  const expectedDensity =
    hull.densityUnit === "salt" ? SALT_WATER_DENSITY : FRESH_WATER_DENSITY;
  const deviation = Math.abs(hull.density - expectedDensity);

  if (deviation > DENSITY_TOLERANCE) {
    return {
      type: "density_misuse",
      label: "密度错用",
      description: `介质密度 ${hull.density.toFixed(3)} t/m³ 与${
        hull.densityUnit === "salt" ? "海水" : "淡水"
      }标准密度 ${expectedDensity.toFixed(3)} t/m³ 偏差 ${deviation.toFixed(
        3
      )}，超出容差 ±${DENSITY_TOLERANCE}`,
      severity: deviation > 0.03 ? "critical" : "warning",
      relatedParam: "density",
      threshold: expectedDensity,
      actual: hull.density,
    };
  }
  return null;
}

function checkInclinationExceedance(
  inclination: InclinationRecord | undefined
): AnomalyDetail | null {
  if (!inclination) return null;

  const absRoll = Math.abs(inclination.rollAngle);
  const absPitch = Math.abs(inclination.pitchAngle);

  if (absRoll > MAX_ROLL_ANGLE) {
    return {
      type: "inclination_exceedance",
      label: "倾角越界",
      description: `横倾角 ${inclination.rollAngle.toFixed(
        1
      )}° 超出安全阈值 ±${MAX_ROLL_ANGLE}°`,
      severity: absRoll > 25 ? "critical" : "warning",
      relatedParam: "rollAngle",
      threshold: MAX_ROLL_ANGLE,
      actual: inclination.rollAngle,
    };
  }

  if (absPitch > MAX_PITCH_ANGLE) {
    return {
      type: "inclination_exceedance",
      label: "倾角越界",
      description: `纵倾角 ${inclination.pitchAngle.toFixed(
        1
      )}° 超出安全阈值 ±${MAX_PITCH_ANGLE}°`,
      severity: absPitch > 10 ? "critical" : "warning",
      relatedParam: "pitchAngle",
      threshold: MAX_PITCH_ANGLE,
      actual: inclination.pitchAngle,
    };
  }

  return null;
}

function checkLoadEccentricityAnomaly(
  hull: HullParams,
  loads: LoadItem[]
): AnomalyDetail | null {
  const ecc = calculateLoadEccentricity(hull, loads);
  if (ecc.ratio > ECCENTRICITY_RATIO_THRESHOLD) {
    return {
      type: "load_eccentricity",
      label: "载荷偏心",
      description: `载荷偏心率 ${ecc.ratio.toFixed(
        3
      )} 超出阈值 ${ECCENTRICITY_RATIO_THRESHOLD}，横向偏移 ${ecc.offsetX.toFixed(
        3
      )} m，纵向偏移 ${ecc.offsetY.toFixed(3)} m`,
      severity: ecc.ratio > 0.3 ? "critical" : "warning",
      relatedParam: "loadEccentricity",
      threshold: ECCENTRICITY_RATIO_THRESHOLD,
      actual: ecc.ratio,
    };
  }
  return null;
}

export function verifySingleHull(
  hull: HullParams,
  loads: LoadItem[],
  inclination: InclinationRecord | undefined
): VerificationResult {
  const anomalies: AnomalyDetail[] = [];

  const densityAnomaly = checkDensityMisuse(hull);
  if (densityAnomaly) anomalies.push(densityAnomaly);

  const eccAnomaly = checkLoadEccentricityAnomaly(hull, loads);
  if (eccAnomaly) anomalies.push(eccAnomaly);

  const incAnomaly = checkInclinationExceedance(inclination);
  if (incAnomaly) anomalies.push(incAnomaly);

  const kg = calculateKG(hull, loads);
  const kb = calculateKB(hull.draft);
  const bm = calculateBM(hull.beam, hull.draft);
  const gm = kb + bm - kg;

  const rollAngle = inclination?.rollAngle ?? 0;
  const pitchAngle = inclination?.pitchAngle ?? 0;
  const trimAngle = pitchAngle;

  let status: VerificationResult["status"] = "pass";
  if (anomalies.some((a) => a.severity === "critical")) {
    status = "uncalculable";
  } else if (anomalies.length > 0) {
    status = "anomaly";
  }

  return {
    id: generateId(),
    hullId: hull.id,
    hullName: hull.name,
    status,
    gm: Math.round(gm * 1000) / 1000,
    rollAngle,
    pitchAngle,
    trimAngle,
    anomalies,
    hullSource: hull.source,
    inclinationSource: inclination?.source ?? "calculated",
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateCgImpact(
  hull: HullParams,
  loads: LoadItem[],
  result: VerificationResult
): CgModificationImpact | null {
  if (!hull.cgModified || !hull.cgOriginal) return null;

  const originalKg =
    (hull.displacement * hull.cgOriginal.z +
      loads.reduce((s, l) => s + l.weight * l.positionZ, 0)) /
    Math.max(hull.displacement + loads.reduce((s, l) => s + l.weight, 0), 0.001);

  const modifiedKg = calculateKG(hull, loads);
  const kb = calculateKB(hull.draft);
  const bm = calculateBM(hull.beam, hull.draft);

  const originalGm = Math.round((kb + bm - originalKg) * 1000) / 1000;
  const modifiedGm = result.gm;
  const deltaGm =
    modifiedGm !== null && originalGm !== null
      ? Math.round((modifiedGm - originalGm) * 1000) / 1000
      : null;

  const dx = Math.round((hull.cgX - hull.cgOriginal.x) * 1000) / 1000;
  const dy = Math.round((hull.cgY - hull.cgOriginal.y) * 1000) / 1000;
  const dz = Math.round((hull.cgZ - hull.cgOriginal.z) * 1000) / 1000;

  let impactDescription = `重心由 (${hull.cgOriginal.x}, ${hull.cgOriginal.y}, ${hull.cgOriginal.z}) 修改为 (${hull.cgX}, ${hull.cgY}, ${hull.cgZ})`;
  if (deltaGm !== null) {
    impactDescription += `，GM 变化 ${deltaGm > 0 ? "+" : ""}${deltaGm} m`;
    if (deltaGm < -0.05) {
      impactDescription += "（稳性显著降低）";
    } else if (deltaGm < 0) {
      impactDescription += "（稳性轻微降低）";
    } else if (deltaGm > 0.05) {
      impactDescription += "（稳性显著提升）";
    }
  }

  return {
    hullId: hull.id,
    hullName: hull.name,
    originalCg: hull.cgOriginal,
    modifiedCg: { x: hull.cgX, y: hull.cgY, z: hull.cgZ },
    deltaCg: { x: dx, y: dy, z: dz },
    originalGm,
    modifiedGm,
    deltaGm,
    impactDescription,
  };
}

export function batchVerify(
  hulls: HullParams[],
  loads: LoadItem[],
  inclinations: InclinationRecord[]
): { results: VerificationResult[]; impacts: CgModificationImpact[] } {
  const results: VerificationResult[] = [];
  const impacts: CgModificationImpact[] = [];

  for (const hull of hulls) {
    const hullLoads = loads.filter((l) => l.hullId === hull.id);
    const hullInclination = inclinations.find((i) => i.hullId === hull.id);

    const result = verifySingleHull(hull, hullLoads, hullInclination);
    results.push(result);

    const impact = calculateCgImpact(hull, hullLoads, result);
    if (impact) impacts.push(impact);
  }

  return { results, impacts };
}

export { generateId };
