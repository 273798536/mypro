import type { SamplingRecord, ExportReport, ConclusionWithSource } from '../../shared/types';
import { generateConclusion } from './riskEngine';

export const generateReport = (records: SamplingRecord[]): ExportReport => {
  const normalCount = records.filter(r => r.risk_level === 'normal').length;
  const pendingCount = records.filter(r => r.risk_level === 'pending').length;
  const anomalyCount = records.filter(r => r.risk_level === 'anomaly').length;

  const conclusionsWithSources: ConclusionWithSource[] = records.map(record => {
    const result = generateConclusion(record);
    return {
      record_id: record.id,
      conclusion: result.conclusion,
      data_sources: result.data_sources,
      risk_note: result.risk_note
    };
  });

  return {
    generated_at: new Date().toLocaleString('zh-CN'),
    records,
    risk_summary: {
      normal_count: normalCount,
      pending_count: pendingCount,
      anomaly_count: anomalyCount
    },
    conclusions_with_sources: conclusionsWithSources
  };
};

export const reportToCSV = (report: ExportReport): string => {
  const header = '记录ID,采样日期,采样区域,贝类品种,风险等级,风险因素,复核状态,结论,数据来源,风险说明';
  const rows = report.records.map(record => {
    const conclusion = report.conclusions_with_sources.find(c => c.record_id === record.id);
    return [
      record.id,
      record.date,
      record.area,
      record.species,
      riskLevelLabel(record.risk_level),
      `"${record.risk_factors.join('；')}"`,
      record.confirmed ? '已复核' : '待复核',
      `"${conclusion?.conclusion || ''}"`,
      `"${conclusion?.data_sources.join('、') || ''}"`,
      `"${conclusion?.risk_note || ''}"`
    ].join(',');
  });
  return [header, ...rows].join('\n');
};

const riskLevelLabel = (level: string): string => {
  switch (level) {
    case 'normal': return '顺利';
    case 'pending': return '待确认';
    case 'anomaly': return '异常';
    default: return level;
  }
};
