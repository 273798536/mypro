import * as XLSX from 'xlsx';
import type {
  UnifiedDataSource,
  Remark,
  Snapshot,
  Confirmation,
  DeflectionRecord,
} from '@/types';
import { STATUS_LABELS, DETECTION_TYPE_LABELS } from '@/types';
import { isBoundarySample } from './noiseEngine';

function recordsToRows(records: DeflectionRecord[]) {
  return records.map((r) => ({
    ID: r.id,
    梁号: r.beamNumber,
    检测类型: DETECTION_TYPE_LABELS[r.detectionType],
    检测时间: r.detectionTime,
    挠度值: r.deflectionValue,
    温度: r.temperature,
    湿度: r.humidity,
    状态: STATUS_LABELS[r.status],
    噪声分数: r.noiseScore,
    是否边界: r.isBoundary ? '是' : '否',
    数据来源: r.dataSource,
  }));
}

export async function exportReport(
  dataSource: UnifiedDataSource,
  remarks: Remark[],
  snapshots: Snapshot[],
  confirmations: Confirmation[]
): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  const statsSheet = XLSX.utils.json_to_sheet([
    { 指标: '总记录数', 数值: dataSource.statistics.totalCount },
    { 指标: '正常通过', 数值: dataSource.statistics.passCount },
    { 指标: '疑似噪声', 数值: dataSource.statistics.noiseCount },
    { 指标: '极端值', 数值: dataSource.statistics.extremeCount },
    { 指标: '待确认', 数值: dataSource.statistics.pendingCount },
    { 指标: '已确认', 数值: dataSource.statistics.confirmedCount },
    { 指标: '最后更新时间', 数值: dataSource.lastUpdated },
    { 指标: '计算版本', 数值: dataSource.calculationVersion },
  ]);
  XLSX.utils.book_append_sheet(wb, statsSheet, '统计概览');

  const detailSheet = XLSX.utils.json_to_sheet(recordsToRows(dataSource.records));
  XLSX.utils.book_append_sheet(wb, detailSheet, '明细数据');

  const exceptionSheet = XLSX.utils.json_to_sheet(
    recordsToRows(dataSource.exceptionQueue)
  );
  XLSX.utils.book_append_sheet(wb, exceptionSheet, '异常队列');

  const remarkRows = remarks.map((r) => ({
    ID: r.id,
    记录ID: r.recordId,
    内容: r.content,
    作者: r.author,
    创建时间: r.createdAt,
    版本: r.version,
    是否补录: r.isBackfilled ? '是' : '否',
    附件: r.attachmentUrls.join('; '),
  }));
  const remarkSheet = XLSX.utils.json_to_sheet(remarkRows);
  XLSX.utils.book_append_sheet(wb, remarkSheet, '备注历史');

  const snapshotRows = snapshots.map((s) => ({
    ID: s.id,
    记录ID: s.recordId,
    图片URL: s.imageUrl,
    版本: s.version,
    创建时间: s.createdAt,
    描述: s.description,
    数据哈希: s.dataHash,
  }));
  const snapshotSheet = XLSX.utils.json_to_sheet(snapshotRows);
  XLSX.utils.book_append_sheet(wb, snapshotSheet, '截图快照');

  const confirmRows = confirmations.map((c) => ({
    ID: c.id,
    记录ID: c.recordId,
    确认前数值: c.valueBefore,
    确认后数值: c.valueAfter,
    确认前状态: STATUS_LABELS[c.statusBefore],
    确认后状态: STATUS_LABELS[c.statusAfter],
    原因: c.reason,
    操作人: c.operator,
    确认时间: c.confirmedAt,
    公式版本: c.formulaVersion,
  }));
  const confirmSheet = XLSX.utils.json_to_sheet(confirmRows);
  XLSX.utils.book_append_sheet(wb, confirmSheet, '人工确认记录');

  const boundaryRecords = isBoundarySample(dataSource.records);
  const boundarySheet = XLSX.utils.json_to_sheet(recordsToRows(boundaryRecords));
  XLSX.utils.book_append_sheet(wb, boundarySheet, '边界样本校验');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
