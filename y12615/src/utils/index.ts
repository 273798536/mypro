import * as XLSX from 'xlsx';
import { ScoreRecord, ExportData, AnomalyType, ReviewStatus } from '../types';

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function parseScoreRecords(file: File): Promise<ScoreRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const records: ScoreRecord[] = [];
        const headers = jsonData[0] || [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const getValue = (headerName: string) => {
            const idx = headers.findIndex(h => String(h).includes(headerName));
            return idx >= 0 ? row[idx] : '';
          };

          const deviceName = String(getValue('装置名称') || getValue('设备') || '');
          if (!deviceName) continue;

          const statusStr = String(getValue('状态') || getValue('审核结果') || 'pending').toLowerCase();
          let status: ReviewStatus = 'pending';
          if (statusStr.includes('通过') || statusStr === 'approved') status = 'approved';
          else if (statusStr.includes('驳回') || statusStr === 'rejected') status = 'rejected';
          else if (statusStr.includes('复核') || statusStr === 'review') status = 'review_needed';

          const hasAnomaly = String(getValue('异常') || getValue('问题') || '').length > 0;
          const anomalyTypes: AnomalyType[] = [];
          if (hasAnomaly) {
            anomalyTypes.push('other');
          }

          records.push({
            id: generateId(),
            source: {
              rowNumber: i + 1,
              imageName: String(getValue('图片名') || getValue('文件名') || ''),
              remark: String(getValue('备注') || getValue('说明') || ''),
            },
            deviceName,
            category: String(getValue('类别') || getValue('分类') || '未分类'),
            colorCode: String(getValue('颜色') || getValue('色标') || '#888888'),
            status,
            score: Number(getValue('分数') || getValue('得分') || 0),
            maxScore: Number(getValue('满分') || getValue('总分') || 100),
            hasAnomaly,
            anomalyTypes,
            handler: String(getValue('处理人') || getValue('负责人') || '未指定'),
          });
        }

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function exportToExcel(data: ExportData): void {
  const summarySheet = XLSX.utils.json_to_sheet([
    { '项目': '总记录数', '数值': data.summary.totalRecords },
    { '项目': '通过数', '数值': data.summary.approvedCount },
    { '项目': '待确认数', '数值': data.summary.pendingCount },
    { '项目': '驳回数', '数值': data.summary.rejectedCount },
    { '项目': '异常数', '数值': data.summary.anomalyCount },
    { '项目': '导出时间', '数值': data.exportedAt },
    { '项目': '颜色规则版本', '数值': data.colorRuleVersion },
  ]);

  const recordsData = data.records.map(r => ({
    '原始行号': r.source.rowNumber,
    '图片名': r.source.imageName || '',
    '备注': r.source.remark || '',
    '装置名称': r.deviceName,
    '类别': r.category,
    '颜色': r.colorCode,
    '状态': r.status,
    '分数': r.score,
    '满分': r.maxScore,
    '是否异常': r.hasAnomaly ? '是' : '否',
    '异常类型': r.anomalyTypes.join(', '),
    '处理人': r.handler,
    '审核时间': r.reviewTime || '',
    '审核意见': r.reviewComment || '',
  }));
  const recordsSheet = XLSX.utils.json_to_sheet(recordsData);

  const anomaliesData = data.anomalies.map(a => ({
    '异常ID': a.id,
    '关联记录ID': a.scoreRecordId,
    '原始行号': a.source.rowNumber,
    '类型': a.type,
    '严重程度': a.severity,
    '描述': a.description,
    '处理建议': a.suggestion,
    '状态': a.status,
    '创建时间': a.createdAt,
    '解决时间': a.resolvedAt || '',
    '处理人': a.resolver || '',
  }));
  const anomaliesSheet = XLSX.utils.json_to_sheet(anomaliesData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet, '汇总');
  XLSX.utils.book_append_sheet(wb, recordsSheet, '评分记录');
  XLSX.utils.book_append_sheet(wb, anomaliesSheet, '异常记录');

  XLSX.writeFile(wb, `化学装置流程卡片_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
