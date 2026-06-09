import type {
  Anomaly,
  TraceChain,
  TraceNode,
  BatchRecord,
  Reagent,
} from '../../types';
import { formatDateTime } from '../export/fileNaming';

export function buildTraceChain(
  anomaly: Anomaly,
  batch: BatchRecord
): TraceChain {
  const nodes: TraceNode[] = [];

  nodes.push({
    id: `anomaly-${anomaly.id}`,
    type: 'anomaly',
    title: getAnomalyTitle(anomaly),
    description: anomaly.userFriendlyMessage,
    data: {
      severity: anomaly.severity,
      actualValue: anomaly.actualValue,
      expectedMin: anomaly.expectedMin,
      expectedMax: anomaly.expectedMax,
    },
  });

  const reagent = batch.reagents.find((r) => r.id === anomaly.reagentId);
  if (reagent) {
    nodes.push({
      id: `reagent-${reagent.id}`,
      type: 'reagent',
      title: `试剂：${reagent.name}${reagent.formula ? ` (${reagent.formula})` : ''}`,
      description: `浓度：${reagent.concentration} ${reagent.concentrationUnit} | 温度：${reagent.temperature}°C | pH值：${reagent.phValue}`,
      data: { ...reagent },
    });

    if (reagent.weighingRecord) {
      nodes.push({
        id: `weighing-${reagent.weighingRecord.id}`,
        type: 'weighing',
        title: `称量单：${reagent.weighingRecord.recordNumber}`,
        description: `称样量：${reagent.weighingRecord.weight}g | 操作人：${reagent.weighingRecord.operator} | 时间：${formatDateTime(reagent.weighingRecord.weighedAt)}`,
        data: { ...reagent.weighingRecord },
      });
    }
  }

  if (anomaly.handlingOpinion) {
    nodes.push({
      id: `opinion-${anomaly.handlingOpinion.id}`,
      type: 'opinion',
      title: `处理意见：${anomaly.handlingOpinion.status === 'approved' ? '已批准' : anomaly.handlingOpinion.status === 'rejected' ? '已驳回' : '待处理'}`,
      description: `${anomaly.handlingOpinion.content}\n处理人：${anomaly.handlingOpinion.handler} | 时间：${formatDateTime(anomaly.handlingOpinion.handledAt)}`,
      data: { ...anomaly.handlingOpinion },
    });
  }

  return { anomalyId: anomaly.id, nodes };
}

function getAnomalyTitle(anomaly: Anomaly): string {
  const typeLabels: Record<string, string> = {
    ph_out_of_range: 'pH值越界异常',
    concentration_error: '试剂浓度异常',
    temperature_abnormal: '温度异常',
    formula_error: '化学式错误',
  };
  const severityLabels: Record<string, string> = {
    warning: '【警告】',
    error: '【错误】',
    critical: '【严重】',
  };
  return `${severityLabels[anomaly.severity] || ''}${typeLabels[anomaly.type] || '数据异常'}`;
}

export function findAnomaliesByWeighingNumber(
  recordNumber: string,
  batch: BatchRecord,
  anomalies: Anomaly[]
): Anomaly[] {
  const reagentIds = batch.reagents
    .filter((r) => r.weighingRecord?.recordNumber === recordNumber)
    .map((r) => r.id);
  return anomalies.filter((a) => reagentIds.includes(a.reagentId));
}

export function getReagentByAnomaly(
  anomaly: Anomaly,
  batch: BatchRecord
): Reagent | undefined {
  return batch.reagents.find((r) => r.id === anomaly.reagentId);
}
