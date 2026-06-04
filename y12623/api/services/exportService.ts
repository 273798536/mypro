import * as XLSX from 'xlsx';
import { recordRepository } from '../db/repository';
import type { LoadingRecord, ExportReport, RecordStatus } from '../../shared/types';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

const EXPORT_DIR = path.join(process.cwd(), 'data', 'exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

export interface GenerateReportRequest {
  startDate?: number;
  endDate?: number;
  status?: RecordStatus;
}

export function generateReport(request: GenerateReportRequest): { report: ExportReport; filePath: string } {
  let records = recordRepository.findAll();

  if (request.startDate) {
    records = records.filter(r => r.importTime >= request.startDate!);
  }
  if (request.endDate) {
    records = records.filter(r => r.importTime <= request.endDate!);
  }
  if (request.status) {
    records = records.filter(r => r.status === request.status);
  }

  const uiSummary = {
    total: records.length,
    approved: records.filter(r => r.status === 'approved').length,
    rejected: records.filter(r => r.status === 'rejected').length,
    anomalies: records.filter(r => r.status === 'anomaly').length,
    avgScore: records.filter(r => r.latestScore !== undefined).length > 0
      ? records.filter(r => r.latestScore !== undefined).reduce((sum, r) => sum + (r.latestScore || 0), 0) / records.filter(r => r.latestScore !== undefined).length
      : 0,
  };

  const dbSummary = recordRepository.countByStatus();
  const allDbRecords = recordRepository.findAll();
  const dbAvgScore = allDbRecords.filter(r => r.latestScore !== undefined).length > 0
    ? allDbRecords.filter(r => r.latestScore !== undefined).reduce((sum, r) => sum + (r.latestScore || 0), 0) / allDbRecords.filter(r => r.latestScore !== undefined).length
    : 0;

  const isConsistent =
    uiSummary.total === records.length &&
    uiSummary.approved === records.filter(r => r.status === 'approved').length &&
    Math.abs(uiSummary.avgScore - dbAvgScore) < 0.01;

  if (!isConsistent) {
    console.warn('导出数据一致性校验：界面数据与数据库数据存在差异');
  }

  const report: ExportReport = {
    id: randomUUID(),
    period: request.startDate && request.endDate
      ? `${new Date(request.startDate).toLocaleDateString()} - ${new Date(request.endDate).toLocaleDateString()}`
      : '全部数据',
    totalRecords: records.length,
    approved: records.filter(r => r.status === 'approved').length,
    rejected: records.filter(r => r.status === 'rejected').length,
    anomalies: records.filter(r => r.status === 'anomaly').length,
    averageScore: Math.round(uiSummary.avgScore * 100) / 100,
    records,
    exportTime: Date.now(),
  };

  const exportData = records.map(r => ({
    '批次号': r.batchNo,
    '月台号': r.platformNo,
    '车牌号': r.vehicleNo,
    '状态': statusToLabel(r.status),
    '异常类型': r.anomalyType ? anomalyTypeToLabel(r.anomalyType) : '',
    '评分': r.latestScore ?? '',
    '评分说明': r.latestScoreNote ?? '',
    '评分人': r.scorer ?? '',
    '评分时间': r.scoreTime ? new Date(r.scoreTime).toLocaleString() : '',
    '来源': r.source,
    '是否补录': r.isSupplement ? '是' : '否',
    '补录来源': r.supplementFrom ?? '',
    '导入时间': new Date(r.importTime).toLocaleString(),
  }));

  const summaryData = [
    { '项目': '总记录数', '数值': report.totalRecords },
    { '项目': '通过数', '数值': report.approved },
    { '项目': '驳回数', '数值': report.rejected },
    { '项目': '异常数', '数值': report.anomalies },
    { '项目': '平均分', '数值': report.averageScore },
    { '项目': '导出时间', '数值': new Date(report.exportTime).toLocaleString() },
    { '项目': '一致性校验', '数值': isConsistent ? '通过' : '存在差异（请以数据库为准）' },
  ];

  const wb = XLSX.utils.book_new();
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  const dataWs = XLSX.utils.json_to_sheet(exportData);

  XLSX.utils.book_append_sheet(wb, summaryWs, '汇总');
  XLSX.utils.book_append_sheet(wb, dataWs, '详细数据');

  const fileName = `装载草图复盘报告_${Date.now()}.xlsx`;
  const filePath = path.join(EXPORT_DIR, fileName);
  XLSX.writeFile(wb, filePath);

  return { report, filePath };
}

function statusToLabel(status: RecordStatus): string {
  const labels: Record<RecordStatus, string> = {
    pending: '待审核',
    approved: '通过',
    rejected: '驳回',
    anomaly: '异常',
  };
  return labels[status];
}

function anomalyTypeToLabel(type: string): string {
  const labels: Record<string, string> = {
    missing_material: '素材缺失',
    score_conflict: '评分冲突',
    duplicate: '重复导入',
  };
  return labels[type] || type;
}

export function getExportFilePath(id: string): string | null {
  const files = fs.readdirSync(EXPORT_DIR);
  const match = files.find(f => f.includes(id));
  return match ? path.join(EXPORT_DIR, match) : null;
}

export function verifyConsistency(uiRecords: LoadingRecord[]): { consistent: boolean; diff: string } {
  const dbRecords = recordRepository.findAll();
  const dbMap = new Map(dbRecords.map(r => [r.id, r]));
  
  const diffs: string[] = [];

  for (const uiRecord of uiRecords) {
    const dbRecord = dbMap.get(uiRecord.id);
    if (!dbRecord) {
      diffs.push(`记录 ${uiRecord.id} 在数据库中不存在`);
      continue;
    }
    if (uiRecord.status !== dbRecord.status) {
      diffs.push(`记录 ${uiRecord.batchNo} 状态不一致：界面=${uiRecord.status}, 数据库=${dbRecord.status}`);
    }
    if (uiRecord.latestScore !== dbRecord.latestScore) {
      diffs.push(`记录 ${uiRecord.batchNo} 评分不一致：界面=${uiRecord.latestScore}, 数据库=${dbRecord.latestScore}`);
    }
  }

  return {
    consistent: diffs.length === 0,
    diff: diffs.join('; '),
  };
}
