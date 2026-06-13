import * as XLSX from 'xlsx';
import type { TorqueCalcResult, NameplateRecord, DataBatch } from '@/types';
import { STATUS_LABELS } from '@/types';

export function exportResultsToExcel(
  results: TorqueCalcResult[],
  records: NameplateRecord[],
  batches: DataBatch[],
  fileName: string = '电机扭矩复算报告.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  const rawData = records.map(r => ({
    '设备编号': r.deviceId,
    '设备名称': r.deviceName || '',
    '铭牌扭矩值': r.torqueValue ?? '',
    '原始单位': r.torqueUnit,
    '额定转速(r/min)': r.ratedSpeed ?? '',
    '功率(kW)': r.power ?? '',
    '安全阈值': r.threshold ?? '',
    '阈值单位': r.thresholdUnit || '',
    '阈值来源': r.thresholdSource || '',
    '来源文件': r.sourceFile,
    '来源行号': r.sourceRow,
    '批次ID': r.sourceBatch,
    '原始内容': r.sourceContent,
    '导入时间': new Date(r.importedAt).toLocaleString('zh-CN'),
  }));
  const ws1 = XLSX.utils.json_to_sheet(rawData);
  XLSX.utils.book_append_sheet(wb, ws1, '原始铭牌数据');

  const calcData = results.map(r => ({
    '设备编号': r.deviceId,
    '设备名称': r.deviceName || '',
    '铭牌原始值': r.originalValue ?? '',
    '原始单位': r.originalUnit,
    '换算系数': r.unitConversion.factor,
    '换算后值(N·m)': r.normalizedValue.toFixed(4),
    '复算扭矩值(N·m)': r.calculatedTorque !== null ? r.calculatedTorque.toFixed(4) : '无法计算',
    '复算方法': r.calcMethod,
    '状态': STATUS_LABELS[r.status],
    '异常数量': r.anomalies.length,
    '异常详情': r.anomalies.map(a => `[${a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '低'}] ${a.message}`).join('; '),
    '是否超阈值': r.thresholdCheck ? (r.thresholdCheck.passed ? '否' : '是') : '无阈值',
    '安全阈值(N·m)': r.thresholdCheck?.threshold.toFixed(4) || '',
    '阈值来源': r.thresholdCheck?.thresholdSource || '',
    '阈值占比': r.thresholdCheck ? `${(r.thresholdCheck.ratio * 100).toFixed(1)}%` : '',
    '来源文件': r.sourceFile,
    '来源行号': r.sourceRow,
    '批次ID': r.sourceBatch,
  }));
  const ws2 = XLSX.utils.json_to_sheet(calcData);
  XLSX.utils.book_append_sheet(wb, ws2, '复算结果');

  const anomalyData = results.flatMap(r =>
    r.anomalies.map(a => ({
      '设备编号': r.deviceId,
      '设备名称': r.deviceName || '',
      '异常类型': getAnomalyTypeLabel(a.type),
      '严重程度': a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '低',
      '异常描述': a.message,
      '溯源信息': a.sourceRef || '',
      '来源文件': r.sourceFile,
      '来源行号': r.sourceRow,
      '批次ID': r.sourceBatch,
      '原始内容': r.sourceContent,
    }))
  );
  const ws3 = XLSX.utils.json_to_sheet(anomalyData);
  XLSX.utils.book_append_sheet(wb, ws3, '异常清单');

  const batchData = batches.map(b => ({
    '批次ID': b.id,
    '文件名': b.fileName,
    '记录数': b.recordCount,
    '导入时间': new Date(b.importedAt).toLocaleString('zh-CN'),
    '备注': b.note || '',
  }));
  const ws4 = XLSX.utils.json_to_sheet(batchData);
  XLSX.utils.book_append_sheet(wb, ws4, '批次记录');

  XLSX.writeFile(wb, fileName);
}

function getAnomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'unit_unclear': '单位未识别',
    'order_of_magnitude': '数量级异常',
    'over_threshold': '超阈值',
    'under_threshold': '低于阈值',
    'missing_data': '数据缺失',
    'batch_conflict': '批次冲突',
    'calc_deviation': '复算偏差',
  };
  return labels[type] || type;
}

export function parseExcelFile(file: File): Promise<NameplateRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        const records: NameplateRecord[] = jsonData.map((row: any, index: number) => ({
          id: '',
          deviceId: String(row['设备编号'] || row['deviceId'] || row['DeviceID'] || `设备-${index + 1}`),
          deviceName: String(row['设备名称'] || row['deviceName'] || row['DeviceName'] || ''),
          torqueValue: parseNumber(row['铭牌扭矩值'] || row['扭矩值'] || row['torqueValue'] || row['Torque']),
          torqueUnit: String(row['原始单位'] || row['扭矩单位'] || row['单位'] || row['torqueUnit'] || row['Unit'] || 'N·m'),
          ratedSpeed: parseNumber(row['额定转速'] || row['转速'] || row['ratedSpeed'] || row['Speed']) ?? undefined,
          power: parseNumber(row['功率'] || row['power'] || row['Power']) ?? undefined,
          threshold: parseNumber(row['安全阈值'] || row['阈值'] || row['threshold'] || row['Threshold']) ?? undefined,
          thresholdUnit: String(row['阈值单位'] || row['thresholdUnit'] || ''),
          thresholdSource: String(row['阈值来源'] || row['thresholdSource'] || ''),
          sourceFile: file.name,
          sourceRow: index + 2,
          sourceBatch: '',
          sourceContent: Object.entries(row).map(([k, v]) => `${k}=${v}`).join(', '),
          importedAt: 0,
        }));

        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}
