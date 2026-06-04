
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TransportPath, Anomaly } from '../types';

export const exportToJSON = (paths: TransportPath[]) => {
  const data = JSON.stringify(paths, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `矿区运输路径_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async (
  paths: TransportPath[],
  chessboardElementId: string
) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text('矿区运输路径审核报告', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 15, 25);

  const chessboard = document.getElementById(chessboardElementId);
  if (chessboard) {
    try {
      const canvas = await html2canvas(chessboard, {
        backgroundColor: '#1e293b',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 120;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 15, 32, imgWidth, imgHeight);
    } catch (error) {
      console.error('Failed to capture chessboard:', error);
    }
  }

  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text('异常检测汇总', 145, 35);

  const allAnomalies: { path: TransportPath; anomaly: Anomaly; nodeLabel: string }[] = [];
  paths.forEach((path) => {
    path.nodes.forEach((node) => {
      node.anomalies.forEach((anomaly) => {
        allAnomalies.push({ path, anomaly, nodeLabel: node.label || '未命名' });
      });
    });
  });

  doc.setFontSize(9);
  let yPos = 45;
  allAnomalies.slice(0, 8).forEach((item, index) => {
    const status = item.anomaly.isFixed ? '已修复' : '待处理';
    doc.setTextColor(item.anomaly.isFixed ? 39 : 231, item.anomaly.isFixed ? 174 : 76, item.anomaly.isFixed ? 96 : 60);
    doc.text(`[${status}]`, 145, yPos);
    doc.setTextColor(50);
    doc.text(`${item.path.name} - ${item.nodeLabel}`, 165, yPos);
    doc.setTextColor(100);
    doc.setFontSize(7);
    doc.text(`来源: ${item.anomaly.sourceRef}`, 165, yPos + 4);
    doc.setFontSize(9);
    yPos += 10;
  });

  if (allAnomalies.length > 8) {
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(`... 还有 ${allAnomalies.length - 8} 条异常`, 145, yPos);
  }

  yPos = 160;
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text('路径列表', 15, yPos);

  doc.setFontSize(9);
  yPos += 8;
  paths.forEach((path, index) => {
    const anomalyCount = path.nodes.reduce((c, n) => c + n.anomalies.filter((a) => !a.isFixed).length, 0);
    doc.setTextColor(50);
    doc.text(`${index + 1}. ${path.name}`, 15, yPos);
    if (anomalyCount > 0) {
      doc.setTextColor(231, 76, 60);
      doc.text(`(${anomalyCount} 个待处理异常)`, 80, yPos);
    }
    doc.setTextColor(100);
    doc.setFontSize(7);
    doc.text(`比例尺: ${path.scale.ratio} | 来源: ${path.source.name}`, 15, yPos + 4);
    doc.setFontSize(9);
    yPos += 10;
  });

  doc.save(`矿区运输路径审核报告_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateAuditReport = (paths: TransportPath[]): string => {
  const allAnomalies = paths.flatMap((path) =>
    path.nodes.flatMap((node) =>
      node.anomalies.map((a) => ({
        pathName: path.name,
        nodeLabel: node.label || '未命名节点',
        sourceRef: a.sourceRef,
        type: a.type,
        description: a.description,
        isFixed: a.isFixed,
        beforeState: a.beforeState,
        afterState: a.afterState,
      }))
    )
  );

  const report = {
    title: '矿区运输路径审核报告',
    generatedAt: new Date().toISOString(),
    summary: {
      totalPaths: paths.length,
      totalAnomalies: allAnomalies.length,
      unresolvedAnomalies: allAnomalies.filter((a) => !a.isFixed).length,
      fixedAnomalies: allAnomalies.filter((a) => a.isFixed).length,
    },
    anomalies: allAnomalies,
  };

  return JSON.stringify(report, null, 2);
};
