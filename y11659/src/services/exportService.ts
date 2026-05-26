import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { GameRecord, OperationRecord } from '../types';
import { ERROR_TYPE_LABELS } from '../types';

export const exportToJSON = (record: GameRecord): void => {
  const dataStr = JSON.stringify(record, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(blob, `验放报告_${record.playerName}_${formatDate(new Date())}.json`);
};

export const exportToCSV = (record: GameRecord): void => {
  const headers = ['序号', '操作', '是否正确', '得分变化', '错误类型', '操作耗时(s)', '操作时间'];
  const rows = record.operations.map((op, idx) => [
    idx + 1,
    op.userAction === 'release' ? '放行' : '拦截',
    op.isCorrect ? '是' : '否',
    op.scoreChange,
    op.errorType ? ERROR_TYPE_LABELS[op.errorType] || op.errorType : '-',
    op.operationTime.toFixed(2),
    new Date(op.timestamp).toLocaleString('zh-CN'),
  ]);

  const summary = [
    [],
    ['总分', record.totalScore],
    ['满分', record.maxScore],
    ['正确率', `${((record.correctCount / record.totalCount) * 100).toFixed(1)}%`],
    ['完成题数', `${record.correctCount}/${record.totalCount}`],
  ];

  const csvContent = [
    ['码头闸口验放赛报告'],
    [`学员: ${record.playerName}`],
    [`时间: ${new Date(record.endTime).toLocaleString('zh-CN')}`],
    [],
    headers.join(','),
    ...rows.map(r => r.join(',')),
    ...summary.map(r => r.join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, `验放报告_${record.playerName}_${formatDate(new Date())}.csv`);
};

export const exportToExcel = (record: GameRecord): void => {
  const detailData = record.operations.map((op, idx) => ({
    '序号': idx + 1,
    '操作': op.userAction === 'release' ? '放行' : '拦截',
    '是否正确': op.isCorrect ? '是' : '否',
    '得分变化': op.scoreChange,
    '错误类型': op.errorType ? ERROR_TYPE_LABELS[op.errorType] || op.errorType : '-',
    '操作耗时(s)': parseFloat(op.operationTime.toFixed(2)),
    '操作时间': new Date(op.timestamp).toLocaleString('zh-CN'),
  }));

  const summaryData = [
    { '项目': '总分', '数值': record.totalScore },
    { '项目': '满分', '数值': record.maxScore },
    { '项目': '正确率', '数值': `${((record.correctCount / record.totalCount) * 100).toFixed(1)}%` },
    { '项目': '完成题数', '数值': `${record.correctCount}/${record.totalCount}` },
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(detailData);
  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  
  XLSX.utils.book_append_sheet(wb, ws1, '操作明细');
  XLSX.utils.book_append_sheet(wb, ws2, '成绩汇总');
  
  XLSX.writeFile(wb, `验放报告_${record.playerName}_${formatDate(new Date())}.xlsx`);
};

export const exportToPDF = async (record: GameRecord): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  doc.setFontSize(20);
  doc.text('码头闸口验放赛报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(12);
  doc.text(`学员: ${record.playerName}`, 20, yPos);
  doc.text(`时间: ${new Date(record.endTime).toLocaleString('zh-CN')}`, 120, yPos);
  yPos += 15;

  doc.setFontSize(14);
  doc.text('成绩汇总', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  const summaryItems = [
    [`总分: ${record.totalScore}`, `满分: ${record.maxScore}`],
    [`正确率: ${((record.correctCount / record.totalCount) * 100).toFixed(1)}%`, `完成: ${record.correctCount}/${record.totalCount}题`],
  ];

  summaryItems.forEach(row => {
    doc.text(row[0], 25, yPos);
    doc.text(row[1], 100, yPos);
    yPos += 8;
  });

  yPos += 10;
  doc.setFontSize(14);
  doc.text('错误分类统计', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  if (Object.keys(record.errorTypes).length === 0) {
    doc.text('无错误记录', 25, yPos);
  } else {
    Object.entries(record.errorTypes).forEach(([type, count]) => {
      doc.text(`${ERROR_TYPE_LABELS[type as keyof typeof ERROR_TYPE_LABELS] || type}: ${count}次`, 25, yPos);
      yPos += 8;
    });
  }

  yPos += 10;
  doc.setFontSize(14);
  doc.text('操作明细', 20, yPos);
  yPos += 10;

  doc.setFontSize(9);
  const tableHeaders = ['序号', '操作', '正确性', '得分', '错误类型', '耗时(s)'];
  const colWidths = [15, 20, 20, 18, 40, 20];
  let xPos = 20;

  tableHeaders.forEach((header, idx) => {
    doc.text(header, xPos, yPos);
    xPos += colWidths[idx];
  });
  yPos += 6;

  record.operations.slice(0, 15).forEach((op, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    let x = 20;
    const rowData = [
      String(idx + 1),
      op.userAction === 'release' ? '放行' : '拦截',
      op.isCorrect ? '正确' : '错误',
      String(op.scoreChange),
      op.errorType ? ERROR_TYPE_LABELS[op.errorType] || op.errorType : '-',
      op.operationTime.toFixed(2),
    ];
    
    rowData.forEach((data, i) => {
      doc.text(data, x, yPos);
      x += colWidths[i];
    });
    yPos += 6;
  });

  doc.save(`验放报告_${record.playerName}_${formatDate(new Date())}.pdf`);
};

export const exportOperationsToReplay = (operations: OperationRecord[]): string => {
  return JSON.stringify(operations, null, 2);
};

const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
};
