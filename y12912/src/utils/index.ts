import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Batch, Run, Cluster, Anomaly, Sample, Correction, AnomalyType, ExportFormat } from '../types';
import { ANOMALY_TYPE_MAPPING, ANOMALY_STATUS_MAPPING, CORRECTION_ACTION_MAPPING } from '../constants';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function calculateFingerprint(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function generateExportFileName(
  batch: Batch,
  run: Run,
  formatType: ExportFormat
): string {
  const safeName = batch.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
  const typeLabel = formatType.type === 'friendly' ? 'friendly' : 'technical';
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const ext = formatType.fileFormat;
  return `${safeName}_run${run.version}_${typeLabel}_${timestamp}.${ext}`;
}

interface ExportRow {
  [key: string]: string | number | boolean;
}

export function buildExportData(
  run: Run,
  clusters: Cluster[],
  anomalies: Anomaly[],
  samples: Sample[],
  corrections: Correction[],
  formatType: ExportFormat
): { sheetName: string;
  data: ExportRow[];
} {
  const isFriendly = formatType.type === 'friendly';

  const clusterMap = new Map(clusters.map(c => [c.id, c]));
  const sampleMap = new Map(samples.map(s => [s.id, s]));
  const correctionMap = new Map(corrections.map(c => [c.anomalyId, c]));

  const data: ExportRow[] = anomalies.map((anomaly): ExportRow => {
    const cluster = clusterMap.get(anomaly.clusterId);
    const sample = sampleMap.get(anomaly.sampleId);
    const correction = correctionMap.get(anomaly.id);
    const typeInfo = cluster ? ANOMALY_TYPE_MAPPING[cluster.anomalyType as AnomalyType] : null;
    const statusInfo = ANOMALY_STATUS_MAPPING[anomaly.status];

    if (isFriendly) {
      return {
        '异常类型': typeInfo?.title ?? '未知',
        '严重程度': cluster ? `${Math.round(cluster.severityScore * 100)}%` : '-',
        '状态': statusInfo.label,
        '数据内容': sample?.content ?? '-',
        '所属数据集': sample?.sourceSplit === 'train' ? '训练集' : sample?.sourceSplit === 'val' ? '验证集' : sample?.sourceSplit === 'test' ? '测试集' : '-',
        '说明': anomaly.friendlyDescription,
        '建议': typeInfo?.suggestion ?? '',
        '处理方式': correction ? CORRECTION_ACTION_MAPPING[correction.action]?.label ?? '-' : '-',
        '处理原因': correction?.reason ?? '-',
        '处理人': correction?.operator ?? '-',
        '处理时间': correction ? formatDateTime(correction.correctedAt) : '-'
      };
    } else {
      return {
        anomaly_id: anomaly.id,
        cluster_id: anomaly.clusterId,
        anomaly_type: cluster?.anomalyType ?? '-',
        severity_score: cluster?.severityScore ?? 0,
        status: anomaly.status,
        sample_id: anomaly.sampleId,
        sample_content: sample?.content ?? '-',
        data_split: sample?.sourceSplit ?? '-',
        is_duplicate: sample?.isDuplicate ?? false,
        description: anomaly.description,
        correction_action: correction?.action ?? '-',
        correction_reason: correction?.reason ?? '-',
        correction_operator: correction?.operator ?? '-',
        corrected_at: correction?.correctedAt ?? '-',
        run_version: run.version,
        prompt_version: run.promptVersion,
        executed_at: run.executedAt
      };
    }
  });

  return {
    sheetName: isFriendly ? '异常报告' : 'anomalies',
    data
  };
}

export function exportToFile(
  batch: Batch,
  run: Run,
  clusters: Cluster[],
  anomalies: Anomaly[],
  samples: Sample[],
  corrections: Correction[],
  format: ExportFormat
): void {
  const { sheetName, data } = buildExportData(run, clusters, anomalies, samples, corrections, format);
  const fileName = generateExportFileName(batch, run, format);

  if (data.length === 0) {
    throw new Error('没有可导出的数据');
  }

  if (format.fileFormat === 'csv') {
    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');
    const dataRows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );
    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', type: 'array' });
  }
}
