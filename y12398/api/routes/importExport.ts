import express from 'express';
import type { ExportData } from '../../shared/types';
import { store } from '../data/store';
import { generateConclusions } from '../utils/anomalyDetector';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const router = express.Router();

router.get('/sample', (req, res) => {
  store.resetToSample();
  const data = store.getAllData();
  res.json({
    success: true,
    data,
    message: '样例数据已导入'
  });
});

router.get('/export', (req, res) => {
  const devices = store.getDevices();
  const records = store.getRecords();
  const anomalies = store.getAnomalies();

  const inStock = devices.filter(d => d.status === 'in_stock').length;
  const borrowed = devices.filter(d => d.status === 'borrowed').length;
  const damaged = devices.filter(d => d.status === 'damaged').length;
  const openAnomalies = anomalies.filter(a => a.status === 'open').length;
  const overdue = anomalies.filter(a => a.type === 'overdue_return' && a.status === 'open').length;

  const conclusions = generateConclusions(devices, records, anomalies);

  const exportData: ExportData = {
    exportDate: new Date().toISOString(),
    summary: {
      totalDevices: devices.length,
      inStock,
      borrowed,
      damaged,
      anomalies: openAnomalies,
      overdue
    },
    devices,
    records,
    anomalies,
    conclusions
  };

  res.json({ success: true, data: exportData });
});

router.get('/export/excel', (req, res) => {
  const devices = store.getDevices();
  const records = store.getRecords();
  const anomalies = store.getAnomalies();
  const conclusions = generateConclusions(devices, records, anomalies);

  const devicesData = devices.map(d => ({
    '设备ID': d.id,
    '设备名称': d.name,
    '分类': d.category,
    '状态': getStatusText(d.status),
    '当前借用人': d.currentBorrower || '',
    '最新备注': d.notes.length > 0 ? d.notes[d.notes.length - 1].content : '',
    '创建时间': formatDate(d.createdAt),
    '更新时间': formatDate(d.updatedAt)
  }));

  const recordsData = records.map(r => ({
    '记录ID': r.id,
    '设备ID': r.deviceId,
    '设备名称': r.deviceName,
    '借用人': r.borrower,
    '借出日期': formatDate(r.borrowDate),
    '预计归还日期': formatDate(r.expectedReturnDate),
    '实际归还日期': r.actualReturnDate ? formatDate(r.actualReturnDate) : '',
    '状态': getRecordStatusText(r.status),
    '损坏备注': r.damageNote || '',
    '版本变更次数': r.versions.length
  }));

  const anomaliesData = anomalies.map(a => ({
    '异常ID': a.id,
    '异常类型': getAnomalyTypeText(a.type),
    '严重程度': getSeverityText(a.severity),
    '标题': a.title,
    '描述': a.description,
    '设备ID': a.deviceId,
    '状态': a.status === 'open' ? '待处理' : '已处理',
    '处理说明': a.resolutionNote || '',
    '创建时间': formatDate(a.createdAt),
    '处理时间': a.resolvedAt ? formatDate(a.resolvedAt) : ''
  }));

  const conclusionsData = conclusions.map((c, i) => ({
    '序号': i + 1,
    '结论': c
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conclusionsData), '结论摘要');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(devicesData), '设备清单');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recordsData), '借还记录');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(anomaliesData), '异常记录');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=音乐社团设备借还清单_${new Date().toISOString().split('T')[0]}.xlsx`);
  res.send(excelBuffer);
});

router.post('/import', (req, res) => {
  try {
    const { fileType, data } = req.body;

    if (!fileType || !data) {
      return res.status(400).json({ success: false, error: '文件类型和数据为必填项' });
    }

    let parsedData;

    if (fileType === 'json') {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } else if (fileType === 'csv') {
      const result = Papa.parse(data, { header: true });
      parsedData = result.data;
    } else {
      return res.status(400).json({ success: false, error: '不支持的文件类型' });
    }

    if (parsedData.devices || parsedData.records || parsedData.anomalies) {
      store.importData(parsedData);
    }

    const allData = store.getAllData();
    res.json({
      success: true,
      data: allData,
      message: '数据导入成功'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: '数据解析失败，请检查文件格式' });
  }
});

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    'in_stock': '在库',
    'borrowed': '借出中',
    'damaged': '损坏待修',
    'anomaly': '异常'
  };
  return map[status] || status;
}

function getRecordStatusText(status: string): string {
  const map: Record<string, string> = {
    'borrowed': '借出中',
    'returned': '已归还',
    'overdue': '已逾期'
  };
  return map[status] || status;
}

function getAnomalyTypeText(type: string): string {
  const map: Record<string, string> = {
    'duplicate_borrow': '重复借出',
    'damage_unrecorded': '损坏未记',
    'overdue_return': '归还超时',
    'inventory_mismatch': '账实不符'
  };
  return map[type] || type;
}

function getSeverityText(severity: string): string {
  const map: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低'
  };
  return map[severity] || severity;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default router;
