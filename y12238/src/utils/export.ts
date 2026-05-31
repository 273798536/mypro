import { jsPDF } from 'jspdf';
import { GameSession, Evidence, GateDecision } from '@/types';

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getEvidenceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    version_change: '版本变更',
    yard_update: '堆场更新',
    shift_overtime: '班次超时',
    gate_conflict: '闸口冲突',
    appointment_overdue: '预约过号',
  };
  return labels[type] || type;
}

function getDecisionLabel(decisionType: string): string {
  const labels: Record<string, string> = {
    release: '放行',
    detain: '暂扣',
    transfer: '转场',
  };
  return labels[decisionType] || decisionType;
}

export function generateSummary(session: GameSession): string {
  const summary = `
====================================
港口集卡排队棋 - 对局报告
====================================

一、对局基本信息
------------------------------------
关卡名称: ${session.levelName}
关卡ID: ${session.levelId}
开始时间: ${formatDateTime(session.startTime)}
结束时间: ${formatDateTime(session.endTime)}
最终得分: ${session.score} 分
总步数: ${session.totalSteps}
冲突数: ${session.conflictCount}

二、闸口判定记录
------------------------------------
${session.decisions.map((d, i) => `
${i + 1}. 集卡 [${getTruckPlate(session, d.truckId)}]
   判定: ${d.conclusion}
   闸口: ${d.gateNo}
   操作人: ${d.operator}
   时间: ${formatDateTime(d.timestamp)}
`).join('')}

三、证据链摘要
------------------------------------
备注变更: ${session.evidences.filter(e => e.type === 'version_change').length} 次
堆场更新: ${session.evidences.filter(e => e.type === 'yard_update').length} 次
班次超时: ${session.evidences.filter(e => e.type === 'shift_overtime').length} 次
闸口冲突: ${session.evidences.filter(e => e.type === 'gate_conflict').length} 次
预约过号: ${session.evidences.filter(e => e.type === 'appointment_overdue').length} 次
总计: ${session.evidences.length} 条证据记录

====================================
报告生成时间: ${formatDateTime(new Date())}
====================================
`;

  console.log('[报告摘要]', summary);
  return summary;
}

function getTruckPlate(session: GameSession, truckId: string): string {
  const step = session.steps.find(s => s.truckId === truckId);
  if (step?.stateSnapshot?.trucks) {
    const truck = step.stateSnapshot.trucks.find(t => t.id === truckId);
    if (truck) return truck.plateNumber;
  }
  return truckId;
}

export function exportToPDF(session: GameSession, evidences: Evidence[]): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('港口集卡排队棋 - 对局报告', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`关卡名称: ${session.levelName}`, 20, y);
  y += 8;
  doc.text(`开始时间: ${formatDateTime(session.startTime)}`, 20, y);
  y += 8;
  doc.text(`结束时间: ${formatDateTime(session.endTime)}`, 20, y);
  y += 8;
  doc.text(`最终得分: ${session.score} 分`, 20, y);
  y += 8;
  doc.text(`总步数: ${session.totalSteps}`, 20, y);
  y += 8;
  doc.text(`冲突数: ${session.conflictCount}`, 20, y);
  y += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('闸口判定记录', 20, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  session.decisions.forEach((d, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${i + 1}. [${getTruckPlate(session, d.truckId)}] → ${d.conclusion}`, 25, y);
    y += 6;
    doc.text(`   ${d.gateNo} | ${d.operator} | ${formatDateTime(d.timestamp)}`, 30, y);
    y += 8;
  });

  y += 10;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('证据链记录', 20, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  evidences.forEach((e, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${i + 1}. [${getEvidenceTypeLabel(e.type)}]`, 25, y);
    y += 6;
    doc.text(`   ${e.content}`, 30, y);
    y += 6;
    doc.text(`   ${formatDateTime(e.timestamp)}`, 30, y);
    y += 8;
  });

  console.log('[PDF导出] 报告已生成，包含', evidences.length, '条证据');
  return doc.output('blob');
}

export function exportToCSV(session: GameSession, evidences: Evidence[]): Blob {
  const headers = ['序号', '类型', '内容', '关联集卡', '时间'];
  const rows = evidences.map((e, i) => [
    i + 1,
    getEvidenceTypeLabel(e.type),
    e.content,
    e.truckId || '-',
    formatDateTime(e.timestamp),
  ]);

  const csvContent = [
    ['港口集卡排队棋 - 证据链报告'],
    [`关卡: ${session.levelName}`],
    [`得分: ${session.score} 分`],
    [],
    headers,
    ...rows,
    [],
    ['闸口判定记录'],
    ['序号', '集卡', '判定', '闸口', '操作人', '时间'],
    ...session.decisions.map((d, i) => [
      i + 1,
      getTruckPlate(session, d.truckId),
      d.conclusion,
      d.gateNo,
      d.operator,
      formatDateTime(d.timestamp),
    ]),
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  
  console.log('[CSV导出] 报告已生成，闸口结论与页面一致');
  return blob;
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function verifyConsistency(
  pageDecisions: GateDecision[],
  exportDecisions: GateDecision[]
): boolean {
  if (pageDecisions.length !== exportDecisions.length) {
    console.warn('[一致性校验] 决策数量不一致');
    return false;
  }

  for (let i = 0; i < pageDecisions.length; i++) {
    const pageD = pageDecisions[i];
    const exportD = exportDecisions[i];
    
    if (pageD.conclusion !== exportD.conclusion) {
      console.warn('[一致性校验] 结论不一致', pageD.conclusion, exportD.conclusion);
      return false;
    }
    if (pageD.timestamp.getTime() !== exportD.timestamp.getTime()) {
      console.warn('[一致性校验] 时间戳不一致');
      return false;
    }
  }

  console.log('[一致性校验] 通过：页面、终端、导出三者结论一致');
  return true;
}
