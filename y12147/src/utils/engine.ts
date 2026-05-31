import type {
  LoadRecord,
  TempRecord,
  EquipmentParams,
  MergedRecord,
  LoadLossResult,
  TempGap,
  TempGapSuggestion,
  DiagnosisResult,
  ExpiredParam,
  WorkingConditionGroup,
  TrendComparison,
  TrendPoint,
  AnomalyExplanation,
} from "@/types";

function parseTimestamp(ts: string): number {
  return new Date(ts).getTime();
}

function hoursBetween(a: string, b: string): number {
  return (parseTimestamp(b) - parseTimestamp(a)) / (1000 * 3600);
}

export function mergeRecords(
  loadCurve: LoadRecord[],
  ambientTemp: TempRecord[]
): MergedRecord[] {
  const tempMap = new Map<string, number | null>();
  for (const t of ambientTemp) {
    tempMap.set(t.timestamp, t.tempC);
  }

  return loadCurve.map((lr) => ({
    timestamp: lr.timestamp,
    loadKW: lr.loadKW,
    tempC: tempMap.get(lr.timestamp) ?? null,
    remark: lr.remark,
    groupIds: [],
  }));
}

export const WORKING_CONDITION_GROUPS: WorkingConditionGroup[] = [
  {
    id: "load_low",
    label: "低负载率 (<30%)",
    type: "load_rate",
  },
  {
    id: "load_mid",
    label: "中负载率 (30%-70%)",
    type: "load_rate",
  },
  {
    id: "load_high",
    label: "高负载率 (>70%)",
    type: "load_rate",
  },
  {
    id: "time_day",
    label: "日间 (06:00-18:00)",
    type: "time_period",
  },
  {
    id: "time_night",
    label: "夜间 (18:00-06:00)",
    type: "time_period",
  },
  {
    id: "temp_low",
    label: "低温 (<10°C)",
    type: "temp_range",
  },
  {
    id: "temp_normal",
    label: "常温 (10°C-30°C)",
    type: "temp_range",
  },
  {
    id: "temp_high",
    label: "高温 (>30°C)",
    type: "temp_range",
  },
];

export function assignGroups(records: MergedRecord[]): MergedRecord[] {
  return records.map((r) => {
    const groupIds: string[] = [];
    const loadRate = r.loadKW;
    const hour = new Date(r.timestamp).getHours();
    const temp = r.tempC;

    if (loadRate < 30) groupIds.push("load_low");
    else if (loadRate <= 70) groupIds.push("load_mid");
    else groupIds.push("load_high");

    if (hour >= 6 && hour < 18) groupIds.push("time_day");
    else groupIds.push("time_night");

    if (temp !== null) {
      if (temp < 10) groupIds.push("temp_low");
      else if (temp <= 30) groupIds.push("temp_normal");
      else groupIds.push("temp_high");
    }

    return { ...r, groupIds };
  });
}

export function detectTempGaps(records: MergedRecord[]): TempGap[] {
  const gaps: TempGap[] = [];
  let gapStart = -1;

  for (let i = 0; i < records.length; i++) {
    if (records[i].tempC === null) {
      if (gapStart === -1) gapStart = i;
    } else {
      if (gapStart !== -1) {
        gaps.push(createGap(records, gapStart, i - 1));
        gapStart = -1;
      }
    }
  }

  if (gapStart !== -1) {
    gaps.push(createGap(records, gapStart, records.length - 1));
  }

  return gaps;
}

function createGap(
  records: MergedRecord[],
  startIdx: number,
  endIdx: number
): TempGap {
  const affectedRecords = endIdx - startIdx + 1;
  const duration = hoursBetween(
    records[startIdx].timestamp,
    records[endIdx].timestamp
  );
  const isPeak = records
    .slice(startIdx, endIdx + 1)
    .some((r) => r.loadKW > 70);

  const suggestion = generateSuggestion(
    duration,
    affectedRecords,
    isPeak,
    startIdx,
    endIdx,
    records.length
  );

  return {
    id: `gap_${startIdx}_${endIdx}`,
    startIndex: startIdx,
    endIndex: endIdx,
    startTimestamp: records[startIdx].timestamp,
    endTimestamp: records[endIdx].timestamp,
    durationHours: Math.round(duration * 100) / 100,
    affectedRecords,
    isPeakPeriod: isPeak,
    suggestion,
  };
}

function generateSuggestion(
  duration: number,
  affectedRecords: number,
  isPeak: boolean,
  startIdx: number,
  endIdx: number,
  totalRecords: number
): TempGapSuggestion {
  if (isPeak) {
    return {
      method: "conservative_max",
      reason:
        "负载尖峰时段温度缺测，建议采用该月最高环境温度作为保守估计，避免低估热风险",
      actionLabel: "使用最高温保守估计",
    };
  }

  if (duration <= 2 && startIdx > 0 && endIdx < totalRecords - 1) {
    return {
      method: "linear_interpolation",
      reason:
        "短时缺测（≤2小时），前后均有有效数据，线性插值精度可接受",
      actionLabel: "线性插值补全",
    };
  }

  if (duration <= 6) {
    return {
      method: "nearby_station",
      reason:
        "中等时长缺测（2-6小时），插值误差可能偏大，建议参考邻近站点同时段温度",
      actionLabel: "使用邻近站替代",
    };
  }

  return {
    method: "exclude",
    reason:
      "长时间缺测（>6小时），插值和替代均可能引入显著偏差，建议排除该时段数据",
    actionLabel: "排除该时段",
  };
}

export function detectExpiredParams(
  params: EquipmentParams,
  referenceDate: string
): ExpiredParam[] {
  const refTime = parseTimestamp(referenceDate);
  const paramTime = parseTimestamp(params.paramDate);
  const daysExpired = Math.floor(
    (refTime - paramTime) / (1000 * 3600 * 24)
  );

  if (daysExpired <= 90) return [];

  let suggestion: string;
  if (daysExpired <= 180) {
    suggestion = `设备参数已过期${daysExpired}天，建议尽快安排校验更新；短期可继续参考但需在报告中注明`;
  } else if (daysExpired <= 365) {
    suggestion = `设备参数已过期${daysExpired}天，计算结果可信度降低，强烈建议更新至最近校验值`;
  } else {
    suggestion = `设备参数已过期${daysExpired}天，计算结果可能严重偏差，必须更新设备参数后再进行核算`;
  }

  return [{ paramDate: params.paramDate, daysExpired, suggestion }];
}

export function calculateLoadLoss(
  records: MergedRecord[],
  params: EquipmentParams,
  groupId?: string
): LoadLossResult {
  const filtered = groupId
    ? records.filter((r) => r.groupIds.includes(groupId))
    : records;

  if (filtered.length === 0) {
    return {
      totalLossKW: 0,
      unit: "kW",
      applicableRange: "无有效数据",
      failureReason: "当前工况分组下无有效记录",
      severity: "error",
    };
  }

  const validRecords = filtered.filter((r) => r.tempC !== null);
  const gapRecords = filtered.filter((r) => r.tempC === null);

  if (validRecords.length === 0) {
    return {
      totalLossKW: 0,
      unit: "kW",
      applicableRange: "无法确定",
      failureReason: `全部${filtered.length}条记录温度缺测，无法计算`,
      severity: "error",
    };
  }

  const avgLoadRate =
    validRecords.reduce((s, r) => s + r.loadKW, 0) /
    validRecords.length /
    100;
  const loadLoss = params.loadLossKW * avgLoadRate * avgLoadRate;
  const totalLoss = params.noLoadLossKW + loadLoss;

  const temps = validRecords
    .map((r) => r.tempC!)
    .filter((t): t is number => t !== null);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  let severity: "ok" | "warning" | "error" = "ok";
  const warnings: string[] = [];

  if (gapRecords.length > 0) {
    severity = "warning";
    warnings.push(`${gapRecords.length}条记录温度缺测已排除`);
  }

  if (gapRecords.length / filtered.length > 0.3) {
    severity = "error";
    warnings.push("缺测比例超过30%，结果可信度极低");
  }

  const expiredDays = Math.floor(
    (Date.now() - parseTimestamp(params.paramDate)) / (1000 * 3600 * 24)
  );
  if (expiredDays > 180) {
    severity = severity === "error" ? "error" : "warning";
    warnings.push(`设备参数已过期${expiredDays}天`);
  }

  const applicableRange = `环境温度 ${minTemp}°C ~ ${maxTemp}°C，负载率 ${(avgLoadRate * 100).toFixed(1)}%`;

  return {
    totalLossKW: Math.round(totalLoss * 100) / 100,
    unit: "kW",
    applicableRange,
    failureReason: warnings.length > 0 ? warnings.join("；") : undefined,
    severity,
  };
}

export function runFullDiagnosis(
  records: MergedRecord[],
  params: EquipmentParams,
  referenceDate: string
): DiagnosisResult {
  const gaps = detectTempGaps(records);
  const peakGaps = gaps.filter((g) => g.isPeakPeriod);
  const expiredParams = detectExpiredParams(params, referenceDate);

  return {
    gaps,
    peakGaps,
    expiredParams,
    totalGaps: gaps.length,
    totalAffectedRecords: gaps.reduce((s, g) => s + g.affectedRecords, 0),
  };
}

export function buildTrendComparison(
  records: MergedRecord[],
  params: EquipmentParams,
  groups: WorkingConditionGroup[]
): TrendComparison {
  const trendGroups = groups.map((g) => {
    const filtered = records.filter((r) => r.groupIds.includes(g.id));
    const data: TrendPoint[] = filtered.map((r) => {
      const avgLoadRate = r.loadKW / 100;
      const loss = params.noLoadLossKW + params.loadLossKW * avgLoadRate * avgLoadRate;
      return {
        time: r.timestamp.slice(11, 16),
        lossKW: Math.round(loss * 100) / 100,
        tempC: r.tempC,
      };
    });
    return { groupId: g.id, label: g.label, data };
  });

  const anomalyExplanations = generateAnomalyExplanations(records, params, groups);

  return { groups: trendGroups, anomalyExplanations };
}

function generateAnomalyExplanations(
  records: MergedRecord[],
  params: EquipmentParams,
  groups: WorkingConditionGroup[]
): AnomalyExplanation[] {
  return groups.map((g) => {
    const filtered = records.filter((r) => r.groupIds.includes(g.id));
    const gapCount = filtered.filter((r) => r.tempC === null).length;
    const avgLoad =
      filtered.length > 0
        ? filtered.reduce((s, r) => s + r.loadKW, 0) / filtered.length
        : 0;
    const expiredDays = Math.floor(
      (Date.now() - parseTimestamp(params.paramDate)) / (1000 * 3600 * 24)
    );

    const parts: string[] = [];

    if (filtered.length === 0) {
      parts.push("该分组无有效记录");
    } else {
      parts.push(`共${filtered.length}条记录，平均负载率${avgLoad.toFixed(1)}%`);
      if (gapCount > 0) {
        parts.push(`${gapCount}条温度缺测`);
      }
      if (avgLoad > 80) {
        parts.push("高负载运行，损耗偏大需关注");
      }
      if (expiredDays > 180) {
        parts.push(`参数过期${expiredDays}天，结果仅供参考`);
      }
    }

    return { groupId: g.id, text: parts.join("；") };
  });
}
