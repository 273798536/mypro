// 派生层：UI 与报告共用同一套纯函数，避免"各算各的"
import type {
  Sample,
  ProcessingRecord,
  Anomaly,
  TrainingSample,
  QuestionBank,
  LeakageRecord,
  Version,
} from "@/data/types";

export const BOUNDARY_HALF_WIDTH = 0.06; // |score-0.5| <= 0.06 视为边界样本

export function effectiveDecision(s: Sample): "refuse" | "answer" {
  return s.correction.after ?? s.refusalDecision;
}

export function isBoundary(s: Sample): boolean {
  return Math.abs(s.refusalScore - 0.5) <= BOUNDARY_HALF_WIDTH;
}

export interface OverviewKpi {
  total: number;
  refusalRate: number;
  boundaryCount: number;
  correctionRate: number;
  leakageCount: number;
  pendingCount: number;
}

export function deriveOverviewKpi(
  versionId: string,
  samples: Sample[],
): OverviewKpi {
  const list = samples.filter((s) => s.versionId === versionId);
  const total = list.length || 1;
  const refused = list.filter((s) => effectiveDecision(s) === "refuse").length;
  const boundary = list.filter(isBoundary).length;
  const corrected = list.filter((s) => s.correction.status === "corrected").length;
  const leakage = list.filter((s) => !!s.linkedTrainingSampleId).length;
  const pending = list.filter((s) => s.correction.status === "pending").length;
  return {
    total: list.length,
    refusalRate: refused / total,
    boundaryCount: boundary,
    correctionRate: corrected / total,
    leakageCount: leakage,
    pendingCount: pending,
  };
}

export interface GroupRow {
  group: string;
  total: number;
  refusalRate: number;
  correctionRate: number;
  boundaryCount: number;
  leakageCount: number;
}

export function deriveGroupMetrics(
  versionId: string,
  samples: Sample[],
): GroupRow[] {
  const list = samples.filter((s) => s.versionId === versionId);
  const groups = Array.from(new Set(list.map((s) => s.group)));
  return groups.map((group) => {
    const gs = list.filter((s) => s.group === group);
    const total = gs.length || 1;
    return {
      group,
      total: gs.length,
      refusalRate: gs.filter((s) => effectiveDecision(s) === "refuse").length / total,
      correctionRate: gs.filter((s) => s.correction.status === "corrected").length / total,
      boundaryCount: gs.filter(isBoundary).length,
      leakageCount: gs.filter((s) => !!s.linkedTrainingSampleId).length,
    };
  });
}

export interface VersionTrendPoint {
  versionId: string;
  versionName: string;
  createdAt: string;
  refusalRate: number;
  boundaryCount: number;
  correctionRate: number;
  leakageCount: number;
}

export function deriveVersionTrend(
  versions: Version[],
  samples: Sample[],
): VersionTrendPoint[] {
  return versions.map((v) => {
    const kpi = deriveOverviewKpi(v.id, samples);
    return {
      versionId: v.id,
      versionName: v.name,
      createdAt: v.createdAt,
      refusalRate: kpi.refusalRate,
      boundaryCount: kpi.boundaryCount,
      correctionRate: kpi.correctionRate,
      leakageCount: kpi.leakageCount,
    };
  });
}

export function anomalyTypeLabel(t: Anomaly["type"]): string {
  switch (t) {
    case "leakage":
      return "训练验证泄漏";
    case "boundary-flip":
      return "边界翻转";
    case "contradiction":
      return "结论矛盾";
  }
}

export interface ReportData {
  versionId: string;
  versionName: string;
  modelVersion: string;
  datasetVersion: string;
  createdAt: string;
  kpi: OverviewKpi;
  groupRows: GroupRow[];
  processingRecords: ProcessingRecord[];
  leakageRecords: LeakageRecord[];
  anomalyCount: number;
  plainSummary: string;
}

// 生成普通话解释段：算法 PM 可直接复制给业务方
export function buildPlainSummary(
  version: Version,
  kpi: OverviewKpi,
  leakage: LeakageRecord[],
  anomalyCount: number,
): string {
  const refusalPct = Math.round(kpi.refusalRate * 100);
  const boundaryPct = kpi.total ? Math.round((kpi.boundaryCount / kpi.total) * 100) : 0;
  const correctedPct = Math.round(kpi.correctionRate * 100);
  const leakageLine =
    leakage.length > 0
      ? `其中发现 ${leakage.length} 个题库存在"训练验证泄漏"——也就是评测题在训练数据里也出现了，相当于考试题提前泄给模型，已把训练里的对应样本剔除并回灌，不会影响后续结论的一致性。`
      : `本版本未发现训练验证泄漏。`;
  return (
    `本版本（${version.name}）共评测 ${kpi.total} 条样本，拒答率 ${refusalPct}%，` +
    `落在拒答边界（模型拿不准该不该拒）的样本占 ${boundaryPct}%，已人工修正 ${correctedPct}%。` +
    `当前版本共登记 ${anomalyCount} 项异常，建议优先关注边界与泄漏条目。` +
    leakageLine +
    `以上数据界面与报告同源，口径一致，可直接用于业务同步。`
  );
}

export function deriveReport(
  versionId: string,
  data: {
    versions: Version[];
    samples: Sample[];
    processingRecords: ProcessingRecord[];
    leakageRecords: LeakageRecord[];
    anomalies: Anomaly[];
  },
): ReportData {
  const version = data.versions.find((v) => v.id === versionId)!;
  const kpi = deriveOverviewKpi(versionId, data.samples);
  const groupRows = deriveGroupMetrics(versionId, data.samples);
  const records = data.processingRecords.filter((r) => r.versionId === versionId);
  const leakage = data.leakageRecords.filter((lr) =>
    lr.importRuns.some((r) => r.versionId === versionId),
  );
  const anomalyCount = data.anomalies.filter((a) => a.versionId === versionId).length;
  return {
    versionId,
    versionName: version.name,
    modelVersion: version.modelVersion,
    datasetVersion: version.datasetVersion,
    createdAt: version.createdAt,
    kpi,
    groupRows,
    processingRecords: records,
    leakageRecords: leakage,
    anomalyCount,
    plainSummary: buildPlainSummary(version, kpi, leakage, anomalyCount),
  };
}

export function trainingSampleById(
  id: string | undefined,
  list: TrainingSample[],
): TrainingSample | undefined {
  if (!id) return undefined;
  return list.find((t) => t.id === id);
}

export function questionBankById(
  id: string,
  list: QuestionBank[],
): QuestionBank | undefined {
  return list.find((q) => q.id === id);
}
