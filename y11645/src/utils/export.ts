import { GameRecord, EXIT_LABELS, ERROR_MESSAGES, SOURCE_LABELS } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export function exportToCSV(record: GameRecord): void {
  const headers = [
    '序号',
    '时间',
    '航班号',
    '目的地',
    '重量(kg)',
    '是否转机',
    '转机时间(分钟)',
    '是否延误',
    '登机口',
    '材料来源',
    '选择出口',
    '正确出口',
    '错误类型',
    '修正说明',
    '得分变化',
    '响应时间(ms)',
  ];

  const rows = record.actions.map((action, index) => [
    index + 1,
    new Date(action.timestamp).toLocaleTimeString('zh-CN'),
    action.flightNo,
    action.baggageInfo.destination,
    action.baggageInfo.weight,
    action.baggageInfo.isTransfer ? '是' : '否',
    action.baggageInfo.transferTime ?? '-',
    action.baggageInfo.isDelayed ? '是' : '否',
    action.baggageInfo.gate,
    SOURCE_LABELS[action.source] || action.source,
    EXIT_LABELS[action.selectedExit],
    EXIT_LABELS[action.correctExit],
    action.errorType === 'none' ? '无' : ERROR_MESSAGES[action.errorType].title,
    action.correctionTrail.length > 0 ? action.correctionTrail.map(c => c.reason).join('; ') : '-',
    action.scoreChange,
    action.responseTime,
  ]);

  const summary = [
    [],
    ['=== 总分信息 ==='],
    ['关卡', record.levelName],
    ['开始时间', new Date(record.startTime).toLocaleString('zh-CN')],
    ['结束时间', new Date(record.endTime).toLocaleString('zh-CN')],
    ['总分', record.totalScore],
    ['准确率', record.accuracy + '%'],
    ['星级', '★'.repeat(record.starRating) || '无'],
    ['总行李数', record.totalBaggage],
    ['正确数', record.correctCount],
    ['错误数', record.errorCount],
    ['最大连击', record.maxCombo],
    ['平均响应时间', record.avgResponseTime + 'ms'],
  ];

  const allData = [...summary, [], headers, ...rows];
  const csvContent = allData.map(row => row.join(',')).join('\n');
  downloadFile(csvContent, '分拣报告_' + record.levelName + '_' + Date.now() + '.csv', 'text/csv;charset=utf-8');
}

export function exportToExcel(record: GameRecord): void {
  const wb = XLSX.utils.book_new();
  
  const summaryData = [
    ['航班行李分拣报告'],
    [],
    ['关卡', record.levelName],
    ['开始时间', new Date(record.startTime).toLocaleString('zh-CN')],
    ['结束时间', new Date(record.endTime).toLocaleString('zh-CN')],
    ['总分', record.totalScore],
    ['准确率', record.accuracy + '%'],
    ['星级', '★'.repeat(record.starRating) || '无'],
    ['总行李数', record.totalBaggage],
    ['正确数', record.correctCount],
    ['错误数', record.errorCount],
    ['最大连击', record.maxCombo],
    ['平均响应时间', record.avgResponseTime + 'ms'],
  ];
  
  const detailHeaders = [
    ['序号', '时间', '航班号', '目的地', '重量', '转机', '转机时间', '延误', '登机口', '材料来源', '选择出口', '正确出口', '错误类型', '修正说明', '得分变化', '响应时间(ms)'],
  ];
  
  const detailData = record.actions.map((action, index) => [
    index + 1,
    new Date(action.timestamp).toLocaleTimeString('zh-CN'),
    action.flightNo,
    action.baggageInfo.destination,
    action.baggageInfo.weight,
    action.baggageInfo.isTransfer ? '是' : '否',
    action.baggageInfo.transferTime ?? '-',
    action.baggageInfo.isDelayed ? '是' : '否',
    action.baggageInfo.gate,
    SOURCE_LABELS[action.source] || action.source,
    EXIT_LABELS[action.selectedExit],
    EXIT_LABELS[action.correctExit],
    action.errorType === 'none' ? '无' : ERROR_MESSAGES[action.errorType].title,
    action.correctionTrail.length > 0 ? action.correctionTrail.map(c => c.reason).join('; ') : '-',
    action.scoreChange,
    action.responseTime,
  ]);
  
  const ws1 = XLSX.utils.aoa_to_sheet([...summaryData, [], ...detailHeaders, ...detailData]);
  XLSX.utils.book_append_sheet(wb, ws1, '报告详情');
  
  if (record.errors.length > 0) {
    const errorHeaders = [['错误详情与修正轨迹']];
    const errorData = record.errors.map((error, index) => [
      index + 1,
      new Date(error.timestamp).toLocaleTimeString('zh-CN'),
      error.flightNo,
      SOURCE_LABELS[error.source] || error.source,
      ERROR_MESSAGES[error.errorType].title,
      EXIT_LABELS[error.selectedExit],
      EXIT_LABELS[error.correctExit],
      error.correctionTrail.length > 0 ? error.correctionTrail.map(c => c.reason).join('; ') : '-',
      error.scoreChange,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([...errorHeaders, [], ['序号', '时间', '航班号', '材料来源', '错误类型', '选择出口', '建议出口', '修正说明', '扣分'], ...errorData]);
    XLSX.utils.book_append_sheet(wb, ws2, '错误统计');
  }
  
  XLSX.writeFile(wb, '分拣报告_' + record.levelName + '_' + Date.now() + '.xlsx');
}

export function exportToPDF(record: GameRecord): void {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('航班行李分拣报告', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('关卡: ' + record.levelName, 20, 35);
  doc.text('总分: ' + record.totalScore, 20, 45);
  doc.text('准确率: ' + record.accuracy + '%', 20, 55);
  doc.text('星级: ' + ('★'.repeat(record.starRating) || '无'), 20, 65);
  
  doc.setFontSize(10);
  let y = 80;
  doc.text('错误详情:', 20, y);
  y += 10;
  
  record.errors.slice(0, 10).forEach((error, index) => {
    doc.text((index + 1) + '. ' + error.flightNo + ' - ' + ERROR_MESSAGES[error.errorType].title, 25, y);
    y += 7;
  });
  
  doc.save('分拣报告_' + record.levelName + '_' + Date.now() + '.pdf');
}

function downloadFile(content: string, filename: string, type: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateImprovementSuggestions(record: GameRecord): string[] {
  const suggestions: string[] = [];
  const errorTypes = record.errors.map(e => e.errorType);
  
  if (errorTypes.includes('oversized_wrong')) {
    suggestions.push('超规件识别能力需要加强，注意行李重量超过30kg的行李');
  }
  if (errorTypes.includes('transfer_timeout')) {
    suggestions.push('转机时间判断需要注意，转机时间小于30分钟以下的需要走加急通道');
  }
  if (errorTypes.includes('delayed_wrong')) {
    suggestions.push('延误航班处理需要注意，延误航班行李应送往延误通道');
  }
  if (errorTypes.includes('gate_wrong')) {
    suggestions.push('登机口分配需要注意，仔细核对航班号与对应登机口');
  }
  if (record.accuracy < 70) {
    suggestions.push('整体准确率偏低，建议加强规则学习，多练习基础关卡');
  }
  if (record.avgResponseTime > 5000) {
    suggestions.push('响应速度偏慢，建议在准确率基础上提高决策速度');
  }
  
  return suggestions;
}
