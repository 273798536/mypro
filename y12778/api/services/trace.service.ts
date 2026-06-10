import type { Calculation, Reagent, TraceLink, AuditLog } from '../../shared/types';
import { dataStore } from '../repositories/store';

export function buildCalculationTrace(calculationId: string): TraceLink[] {
  const calc = dataStore.getCalculationById(calculationId);
  if (!calc) return [];

  const reagent = dataStore.getReagentById(calc.reagentId);
  const auditLogs = dataStore.getAuditLogsByEntity('calculation', calculationId);
  const reagentAuditLogs = reagent
    ? dataStore.getAuditLogsByEntity('reagent', reagent.id)
    : [];

  const links: TraceLink[] = [];

  links.push({
    id: `trace_result_${calc.id}`,
    type: 'result',
    title: `试算结果：${calc.calculatedConcentration.toFixed(1)} mg/L`,
    description: `偏差 ${calc.deviation > 0 ? '+' : ''}${calc.deviation.toFixed(1)}%，状态：${getStatusText(calc.status)}`,
    timestamp: calc.createdAt,
    operator: calc.createdBy,
    metadata: {
      calculatedConcentration: calc.calculatedConcentration,
      deviation: calc.deviation,
      status: calc.status,
    },
  });

  links.push({
    id: `trace_calc_${calc.id}`,
    type: 'calculation',
    title: '试算参数',
    description: `观测张力 ${calc.observedTension.toFixed(1)} mN/m，温度 ${calc.temperature}℃，使用试剂 ${calc.reagentBatchNo}`,
    timestamp: calc.createdAt,
    operator: calc.createdBy,
    parentId: `trace_result_${calc.id}`,
    metadata: {
      observedTension: calc.observedTension,
      temperature: calc.temperature,
      reagentBatchNo: calc.reagentBatchNo,
    },
  });

  if (reagent) {
    links.push({
      id: `trace_raw_${reagent.id}`,
      type: 'raw-data',
      title: '试剂原始数据',
      description: `${reagent.name}，标称浓度 ${reagent.nominalConcentration} mg/L${reagent.isSupplemented ? '（已补录修正）' : ''}`,
      timestamp: reagent.createdAt,
      operator: reagent.createdBy,
      parentId: `trace_calc_${calc.id}`,
      metadata: {
        reagentName: reagent.name,
        nominalConcentration: reagent.nominalConcentration,
        temperatureCurves: reagent.temperatureCurves.map((c) => ({
          temperature: c.temperature,
          points: c.points.length,
          source: c.source,
        })),
      },
    });

    links.push({
      id: `trace_entry_${reagent.id}`,
      type: 'reagent-entry',
      title: `试剂台账录入`,
      description: `${reagent.createdBy} 于 ${formatDate(reagent.createdAt)} 录入`,
      timestamp: reagent.createdAt,
      operator: reagent.createdBy,
      parentId: `trace_raw_${reagent.id}`,
    });

    if (reagent.isSupplemented) {
      reagent.supplementHistory.forEach((supp, idx) => {
        links.push({
          id: `trace_supp_${supp.id}`,
          type: 'supplement',
          title: `补录记录 #${idx + 1}`,
          description: `${supp.supplementedBy} 修正 ${supp.fieldName}：${supp.oldValue ?? '空'} → ${supp.newValue}，原因：${supp.reason}`,
          timestamp: supp.supplementedAt,
          operator: supp.supplementedBy,
          parentId: `trace_raw_${reagent.id}`,
          metadata: {
            fieldName: supp.fieldName,
            oldValue: supp.oldValue,
            newValue: supp.newValue,
            reason: supp.reason,
          },
        });
      });
    }
  }

  [...auditLogs, ...reagentAuditLogs].forEach((log) => {
    links.push({
      id: `trace_audit_${log.id}`,
      type: 'audit',
      title: `审计记录：${getActionText(log.action)}`,
      description: log.details,
      timestamp: log.timestamp,
      operator: log.operator,
      metadata: {
        entityType: log.entityType,
        action: log.action,
      },
    });
  });

  return links.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function buildBatchTimeline(batchNo: string): TraceLink[] {
  const reagent = dataStore.getReagentByBatchNo(batchNo);
  if (!reagent) return [];

  const calculations = dataStore
    .getCalculations()
    .filter((c) => c.reagentBatchNo === batchNo);
  const links: TraceLink[] = [];

  calculations.forEach((calc) => {
    links.push({
      id: `bt_calc_${calc.id}`,
      type: 'calculation',
      title: `试算：${calc.calculatedConcentration.toFixed(1)} mg/L`,
      description: `张力 ${calc.observedTension.toFixed(1)} mN/m @ ${calc.temperature}℃，${getStatusText(calc.status)}`,
      timestamp: calc.createdAt,
      operator: calc.createdBy,
    });
  });

  links.push({
    id: `bt_entry_${reagent.id}`,
    type: 'reagent-entry',
    title: '试剂台账录入',
    description: `${reagent.createdBy} 录入 ${reagent.name}，标称浓度 ${reagent.nominalConcentration} mg/L`,
    timestamp: reagent.createdAt,
    operator: reagent.createdBy,
  });

  if (reagent.isSupplemented) {
    reagent.supplementHistory.forEach((supp) => {
      links.push({
        id: `bt_supp_${supp.id}`,
        type: 'supplement',
        title: `补录：${supp.fieldName}`,
        description: `${supp.oldValue ?? '空'} → ${supp.newValue}，原因：${supp.reason}`,
        timestamp: supp.supplementedAt,
        operator: supp.supplementedBy,
      });
    });
  }

  return links.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function getStatusText(status: Calculation['status']): string {
  const map: Record<Calculation['status'], string> = {
    pending: '待复核',
    passed: '已通过',
    rejected: '已驳回',
    error: '处理失败',
  };
  return map[status];
}

function getActionText(action: AuditLog['action']): string {
  const map: Record<AuditLog['action'], string> = {
    create: '创建',
    update: '更新',
    review: '复核',
    supplement: '补录',
    merge: '合并',
    export: '导出',
  };
  return map[action];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
