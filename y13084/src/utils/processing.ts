import type {
  SensorRecord,
  RecordType,
  RiskLevel,
  WarehouseZone,
  FilterCondition,
  UnifiedResult,
  TimelineSegment,
  WarehouseScheme,
} from "@/types";
import {
  RECORD_TYPE_LABEL,
  RISK_LEVEL_LABEL,
  ZONE_LABEL,
} from "@/types";
import { MOCK_SCHEMES, ALL_CONCLUSIONS } from "@/data/mockData";

export function identifyRecordType(row: {
  id?: string;
  description?: string;
  recordType?: RecordType;
}): RecordType {
  if (row.recordType) return row.recordType;
  const id = row.id ?? "";
  const desc = row.description ?? "";
  if (id.startsWith("REC-OLD-") || desc.includes("旧版")) return "old_version";
  if (id.startsWith("REC-WDR-") || desc.includes("撤回")) return "withdrawn";
  if (id.startsWith("REC-VRB-") || desc.includes("现场") || desc.includes("会上") || desc.includes("口头") || desc.includes("电话") || desc.includes("反馈") || desc.includes("要求") || desc.includes("统计") || desc.includes("提供") || desc.includes("踏勘"))
    return "verbal";
  return "normal";
}

export function applyFilter(
  records: SensorRecord[],
  filter: Partial<FilterCondition>
): SensorRecord[] {
  return records.filter((r) => {
    if (filter.timeStart && r.timestamp < filter.timeStart) return false;
    if (filter.timeEnd && r.timestamp > filter.timeEnd) return false;
    if (filter.zones && filter.zones.length > 0 && !filter.zones.includes(r.zone)) return false;
    if (filter.riskLevels && filter.riskLevels.length > 0 && !filter.riskLevels.includes(r.riskLevel))
      return false;
    if (filter.recordTypes && filter.recordTypes.length > 0 && !filter.recordTypes.includes(r.recordType))
      return false;
    if (filter.searchKeyword && filter.searchKeyword.trim()) {
      const kw = filter.searchKeyword.trim().toLowerCase();
      const haystack = [r.id, r.description, r.zone, r.riskLevel, r.recordType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });
}

export function buildTraceMap(
  records: SensorRecord[]
): Record<string, { affectedConclusionIds: string[]; sourceRows: number[] }> {
  const map: Record<string, { affectedConclusionIds: string[]; sourceRows: number[] }> = {};
  records.forEach((r) => {
    if (r.affectsConclusions.length > 0) {
      map[r.id] = {
        affectedConclusionIds: [...r.affectsConclusions],
        sourceRows: [r.sourceRow],
      };
    }
  });
  return map;
}

const RISK_SCORE: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function calcRecommendationIndex(scheme: WarehouseScheme): number {
  const normalizedArea = scheme.area / 4000;
  const normalizedDock = 1 - scheme.distanceToDock / 500;
  const normalizedOffice = 1 - scheme.distanceToOffice / 500;
  const normalizedRisk = 1 - RISK_SCORE[scheme.riskLevel] / 4;
  const normalizedCost = 1 - scheme.cost / 3000;
  const normalizedCapacity = scheme.capacity / 5000;
  const score =
    normalizedRisk * 0.3 +
    normalizedCost * 0.2 +
    normalizedCapacity * 0.15 +
    normalizedDock * 0.15 +
    normalizedOffice * 0.1 +
    normalizedArea * 0.1;
  return Math.round(score * 100) / 100;
}

export function generateStatistics(filteredRecords: SensorRecord[]) {
  const totalRecords = filteredRecords.length;

  const byType: Record<RecordType, number> = {
    normal: 0,
    old_version: 0,
    withdrawn: 0,
    verbal: 0,
  };
  const byRiskLevel: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  const byZone: Record<WarehouseZone, number> = {
    A: 0,
    B: 0,
    C: 0,
  };

  filteredRecords.forEach((r) => {
    byType[r.recordType]++;
    byRiskLevel[r.riskLevel]++;
    byZone[r.zone]++;
  });

  const schemeComparison = MOCK_SCHEMES.map((scheme) => ({
    schemeId: scheme.id,
    schemeName: scheme.name,
    indicators: {
      面积: scheme.area,
      距码头: scheme.distanceToDock,
      距办公区: scheme.distanceToOffice,
      风险: RISK_SCORE[scheme.riskLevel],
      造价: scheme.cost,
      容量: scheme.capacity,
      推荐指数: calcRecommendationIndex(scheme),
    },
  }));

  return {
    totalRecords,
    byType,
    byRiskLevel,
    byZone,
    schemeComparison,
  };
}

export function generateMarkdownReport(
  filtered: SensorRecord[],
  stats: ReturnType<typeof generateStatistics>,
  traceMap: Record<string, { affectedConclusionIds: string[]; sourceRows: number[] }>
): string {
  const lines: string[] = [];
  const now = new Date().toISOString().slice(0, 10);

  lines.push(`# 码头危险品库方案比选 - 数据审查报告`);
  lines.push("");
  lines.push(`**生成日期**: ${now}`);
  lines.push(`**筛选后记录总数**: ${stats.totalRecords} 条`);
  lines.push("");

  lines.push("## 一、总体统计概览");
  lines.push("");
  lines.push("### 按记录类型分布");
  lines.push("");
  lines.push("| 记录类型 | 数量 | 占比 |");
  lines.push("| --- | ---: | ---: |");
  (Object.keys(stats.byType) as RecordType[]).forEach((t) => {
    const cnt = stats.byType[t];
    const pct = stats.totalRecords > 0 ? ((cnt / stats.totalRecords) * 100).toFixed(1) : "0.0";
    lines.push(`| ${RECORD_TYPE_LABEL[t]} | ${cnt} | ${pct}% |`);
  });
  lines.push("");

  lines.push("### 按风险等级分布");
  lines.push("");
  lines.push("| 风险等级 | 数量 | 占比 |");
  lines.push("| --- | ---: | ---: |");
  (Object.keys(stats.byRiskLevel) as RiskLevel[]).forEach((r) => {
    const cnt = stats.byRiskLevel[r];
    const pct = stats.totalRecords > 0 ? ((cnt / stats.totalRecords) * 100).toFixed(1) : "0.0";
    lines.push(`| ${RISK_LEVEL_LABEL[r]} | ${cnt} | ${pct}% |`);
  });
  lines.push("");

  lines.push("### 按区域分布");
  lines.push("");
  lines.push("| 区域 | 数量 | 占比 |");
  lines.push("| --- | ---: | ---: |");
  (Object.keys(stats.byZone) as WarehouseZone[]).forEach((z) => {
    const cnt = stats.byZone[z];
    const pct = stats.totalRecords > 0 ? ((cnt / stats.totalRecords) * 100).toFixed(1) : "0.0";
    lines.push(`| ${ZONE_LABEL[z]} | ${cnt} | ${pct}% |`);
  });
  lines.push("");

  lines.push("## 二、三个方案对比指标");
  lines.push("");
  lines.push("| 方案 | 面积(㎡) | 距码头(m) | 距办公区(m) | 风险等级 | 造价(万元) | 容量(TEU) | 推荐指数 |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  stats.schemeComparison.forEach((sc) => {
    const ind = sc.indicators;
    const riskLabel = RISK_LEVEL_LABEL[((["low", "medium", "high", "critical"] as RiskLevel[])[(ind.风险 as number) - 1])];
    lines.push(
      `| ${sc.schemeName} | ${ind.面积} | ${ind.距码头} | ${ind.距办公区} | ${riskLabel} | ${ind.造价} | ${ind.容量} | ${ind.推荐指数} |`
    );
  });
  lines.push("");

  lines.push("## 三、结论溯源");
  lines.push("");
  const conclusionFootnotes: string[] = [];
  const conclusionSourceMap: Record<string, { recordIds: string[]; sourceRows: number[] }> = {};

  Object.entries(traceMap).forEach(([recordId, info]) => {
    info.affectedConclusionIds.forEach((cidRaw) => {
      const cidMatch = cidRaw.match(/^(C-\d+)/);
      const cid = cidMatch ? cidMatch[1] : cidRaw;
      if (!conclusionSourceMap[cid]) {
        conclusionSourceMap[cid] = { recordIds: [], sourceRows: [] };
      }
      conclusionSourceMap[cid].recordIds.push(recordId);
      conclusionSourceMap[cid].sourceRows.push(...info.sourceRows);
    });
  });

  ALL_CONCLUSIONS.forEach((conclusion) => {
    const cidMatch = conclusion.match(/^(C-\d+)/);
    const cid = cidMatch ? cidMatch[1] : "";
    const src = conclusionSourceMap[cid];
    if (src) {
      const rowList = src.sourceRows.join(", ");
      const recList = src.recordIds.join(", ");
      conclusionFootnotes.push(
        `${conclusion}  —— 溯源: 行[${rowList}] (记录 ${recList})[^${cid}]`
      );
    } else {
      conclusionFootnotes.push(conclusion);
    }
  });

  conclusionFootnotes.forEach((fn, idx) => {
    lines.push(`${idx + 1}. ${fn}`);
  });
  lines.push("");

  lines.push("## 四、脚注");
  lines.push("");
  Object.keys(conclusionSourceMap).forEach((cid) => {
    const src = conclusionSourceMap[cid];
    const rows = src.sourceRows.join(", ");
    const recs = src.recordIds.join(", ");
    lines.push(`[^${cid}]: 数据来源行 ${rows}，对应原始记录编号 ${recs}。`);
  });
  lines.push("");

  lines.push("## 五、异常记录明细");
  lines.push("");
  const abnormal = filtered.filter((r) => r.riskLevel === "high" || r.riskLevel === "critical");
  if (abnormal.length === 0) {
    lines.push("_无高/极高风险记录。_");
  } else {
    lines.push("| 记录ID | 来源行 | 时间戳 | 区域 | 风险 | 类型 | 描述 |");
    lines.push("| --- | ---: | --- | --- | --- | --- | --- |");
    abnormal.forEach((r) => {
      const ts = r.timestamp.replace("T", " ").slice(0, 19);
      lines.push(
        `| ${r.id} | ${r.sourceRow} | ${ts} | ${ZONE_LABEL[r.zone]} | ${RISK_LEVEL_LABEL[r.riskLevel]} | ${RECORD_TYPE_LABEL[r.recordType]} | ${r.description} |`
      );
    });
  }
  lines.push("");

  return lines.join("\n");
}

export function buildUnifiedResult(
  records: SensorRecord[],
  filter: Partial<FilterCondition>
): UnifiedResult {
  const filtered = applyFilter(records, filter);
  const statistics = generateStatistics(filtered);
  const traceMap = buildTraceMap(filtered);
  const markdownReport = generateMarkdownReport(filtered, statistics, traceMap);
  return {
    statistics,
    detailTable: filtered,
    markdownReport,
    traceMap,
  };
}

export function segmentTimeline(
  records: SensorRecord[],
  count: number = 6
): TimelineSegment[] {
  if (records.length === 0 || count <= 0) return [];

  const timestamps = records.map((r) => new Date(r.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const totalSpan = maxTime - minTime;

  if (totalSpan === 0) {
    const iso = new Date(minTime).toISOString();
    return [
      {
        id: `seg-1`,
        label: iso.slice(0, 10),
        start: iso,
        end: iso,
      },
    ];
  }

  const segmentSpan = totalSpan / count;
  const segments: TimelineSegment[] = [];
  const abnormalCount = records.filter(
    (r) => r.riskLevel === "high" || r.riskLevel === "critical"
  ).length;

  for (let i = 0; i < count; i++) {
    const segStart = minTime + segmentSpan * i;
    const segEnd = i === count - 1 ? maxTime : minTime + segmentSpan * (i + 1) - 1;
    const startDate = new Date(segStart);
    const endDate = new Date(segEnd);

    const segRecords = records.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= segStart && t <= segEnd;
    });
    const segAbnormal = segRecords.filter(
      (r) => r.riskLevel === "high" || r.riskLevel === "critical"
    ).length;
    const highlight = abnormalCount > 0 && segAbnormal > 0;

    const formatLabel = (d: Date) => {
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hour = String(d.getHours()).padStart(2, "0");
      return `${month}/${day} ${hour}:00`;
    };

    segments.push({
      id: `seg-${i + 1}`,
      label: `${formatLabel(startDate)} ~ ${formatLabel(endDate)}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      highlight,
    });
  }

  return segments;
}
