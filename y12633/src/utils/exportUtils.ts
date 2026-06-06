import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Inspection } from '../types';
import { buildExportReport, statusLabel, hitDetectionLabel } from './helpers';

export const exportToPDF = (inspection: Inspection): void => {
  const report = buildExportReport(inspection);
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('城市雨水口巡检报告', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`导出时间: ${report.exportedAt}`, 14, 30);
  doc.text(`任务标题: ${report.title}`, 14, 36);
  doc.text(`任务状态: ${report.inspectionStatus}`, 14, 42);

  const summaryY = 52;
  doc.setFontSize(12);
  doc.setTextColor(22, 93, 255);
  doc.text('巡检摘要', 14, summaryY);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`雨水口总数: ${report.totalPoints}`, 14, summaryY + 8);
  doc.text(`已通过: ${report.inspectedCount}`, 14, summaryY + 14);
  doc.text(`待巡检: ${report.pendingCount}`, 14, summaryY + 20);
  doc.text(`需整改: ${report.failedCount}`, 14, summaryY + 26);
  doc.text(`命中检测: 命中 ${report.hitCount} / 未命中 ${report.missCount}`, 14, summaryY + 32);
  doc.text(`边界失败演示: ${report.boundaryFailTriggered ? '已触发' : '未触发'}`, 90, summaryY + 8);
  doc.text(`撤销操作: ${report.undoPerformed ? '已执行' : '未执行'}`, 90, summaryY + 14);

  const tableData = report.points.map((p, i) => [
    i + 1,
    p.address,
    p.status,
    p.hitDetection,
    p.notes,
  ]);

  autoTable(doc, {
    startY: summaryY + 44,
    head: [['序号', '位置', '巡检状态', '命中检测', '备注']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 93, 255] },
  });

  const safeTitle = report.title.replace(/[\\/:*?"<>|]/g, '_');
  doc.save(`${safeTitle}-巡检报告.pdf`);
};

export const exportToExcel = (inspection: Inspection): void => {
  const report = buildExportReport(inspection);

  const summaryData = [
    ['城市雨水口巡检报告'],
    [],
    ['任务标题', report.title],
    ['导出时间', report.exportedAt],
    ['任务状态', report.inspectionStatus],
    [],
    ['巡检摘要'],
    ['雨水口总数', report.totalPoints],
    ['已通过', report.inspectedCount],
    ['待巡检', report.pendingCount],
    ['需整改', report.failedCount],
    ['命中(命中)', report.hitCount],
    ['命中(未命中)', report.missCount],
    ['边界失败演示', report.boundaryFailTriggered ? '已触发' : '未触发'],
    ['撤销操作', report.undoPerformed ? '已执行' : '未执行'],
  ];

  const pointsData = [
    ['序号', '位置', '巡检状态', '命中检测', '备注'],
    ...report.points.map((p, i) => [
      i + 1,
      p.address,
      p.status,
      p.hitDetection,
      p.notes,
    ]),
  ];

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '摘要');

  const wsPoints = XLSX.utils.aoa_to_sheet(pointsData);
  wsPoints['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsPoints, '雨水口明细');

  const safeTitle = report.title.replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, `${safeTitle}-巡检报告.xlsx`);
};

export const exportToJSON = (inspection: Inspection): void => {
  const report = buildExportReport(inspection);
  const dataStr = JSON.stringify(
    {
      ...report,
      rawInspection: inspection,
    },
    null,
    2,
  );
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = report.title.replace(/[\\/:*?"<>|]/g, '_');
  a.download = `${safeTitle}-巡检数据.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importFromJSON = (file: File): Promise<Inspection> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const inspection: Inspection =
          parsed.rawInspection || parsed;

        if (!inspection || !Array.isArray(inspection.drainPoints)) {
          reject(new Error('文件格式不正确'));
          return;
        }

        inspection.drainPoints = inspection.drainPoints.map((p) => ({
          ...p,
          status: p.status || 'pending',
          hitDetection: p.hitDetection || (p.status === 'inspected' ? 'hit' : p.status === 'failed' ? 'miss' : 'pending'),
          notes: p.notes || '',
          createdAt: p.createdAt || Date.now(),
        }));

        resolve(inspection);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

export { statusLabel, hitDetectionLabel };
