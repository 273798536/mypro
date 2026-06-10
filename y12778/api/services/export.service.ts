import type { Calculation, Reagent } from '../../shared/types';
import { dataStore } from '../repositories/store';
import { buildCalculationTrace } from './trace.service';

export interface ExportRow {
  field: string;
  value: string;
}

export function buildExportData(calculationId: string): {
  summary: ExportRow[];
  trace: ExportRow[];
  fileName: string;
  summaryChecksum: string;
} {
  const calc = dataStore.getCalculationById(calculationId);
  if (!calc) {
    return { summary: [], trace: [], fileName: 'unknown', summaryChecksum: '' };
  }
  const reagent = dataStore.getReagentById(calc.reagentId);
  const trace = buildCalculationTrace(calculationId);

  const statusMap: Record<Calculation['status'], string> = {
    pending: '待复核',
    passed: '已通过',
    rejected: '已驳回',
    error: '处理失败',
  };

  const summary: ExportRow[] = [
    { field: '试算编号', value: calc.id },
    { field: '试剂批次', value: calc.reagentBatchNo },
    { field: '试剂名称', value: reagent?.name ?? '-' },
    { field: '标称浓度', value: `${reagent?.nominalConcentration ?? '-'} mg/L` },
    { field: '观测表面张力', value: `${calc.observedTension.toFixed(1)} mN/m` },
    { field: '测量温度', value: `${calc.temperature} ℃` },
    { field: '试算浓度', value: `${calc.calculatedConcentration.toFixed(1)} mg/L` },
    { field: '偏差', value: `${calc.deviation > 0 ? '+' : ''}${calc.deviation.toFixed(1)}%` },
    { field: '结果解释', value: calc.explanation.summary },
    { field: '状态', value: statusMap[calc.status] },
    { field: '复核人', value: calc.reviewedBy ?? '-' },
    { field: '复核时间', value: calc.reviewedAt ? formatDateTime(calc.reviewedAt) : '-' },
    { field: '复核备注', value: calc.reviewNote ?? '-' },
    { field: '创建时间', value: formatDateTime(calc.createdAt) },
  ];

  const traceRows: ExportRow[] = trace.map((t, idx) => ({
    field: `追溯节点 ${idx + 1} [${t.type}]`,
    value: `${t.title} | ${t.description} | ${t.operator ?? '系统'} @ ${formatDateTime(t.timestamp)}`,
  }));

  const checksum = summary.map((r) => `${r.field}:${r.value}`).join('|');

  return {
    summary,
    trace: traceRows,
    fileName: `表面张力试算报告_${calc.reagentBatchNo}_${calc.id}.csv`,
    summaryChecksum: simpleHash(checksum),
  };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
