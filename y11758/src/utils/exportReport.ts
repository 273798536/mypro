import { jsPDF } from 'jspdf';
import { GameRecord, ScoringResult } from '@/types';
import { getAnomalyTypeName, getSeverityName } from './scoringEngine';

export async function exportAuditReport(record: GameRecord, scoringResult: ScoringResult): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('税务稽核报告', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`报告编号: ${record.id}`, margin, yPosition);
  yPosition += 8;
  doc.text(`稽核关卡: ${record.levelName}`, margin, yPosition);
  yPosition += 8;
  doc.text(`稽核时间: ${new Date(record.completedAt).toLocaleString('zh-CN')}`, margin, yPosition);
  yPosition += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、稽核评分', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`最终得分: ${scoringResult.totalScore} 分`, margin, yPosition);
  yPosition += 8;
  doc.text(`评级: ${scoringResult.grade}`, margin, yPosition);
  yPosition += 8;
  doc.text(`正确识别: ${scoringResult.correctDetections} 项`, margin, yPosition);
  yPosition += 8;
  doc.text(`错误标记: ${scoringResult.wrongMarks} 项`, margin, yPosition);
  yPosition += 8;
  doc.text(`遗漏异常: ${scoringResult.missedAnomalies} 项`, margin, yPosition);
  yPosition += 8;
  doc.text(`时间奖励: +${scoringResult.timeBonus} 分`, margin, yPosition);
  yPosition += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('二、发现的异常', margin, yPosition);
  yPosition += 10;

  const detectedAnomalies = record.anomalies.filter(a => a.isDetected);

  if (detectedAnomalies.length === 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('未发现任何异常', margin, yPosition);
    yPosition += 10;
  } else {
    detectedAnomalies.forEach((anomaly, index) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${getAnomalyTypeName(anomaly.type)} (${getSeverityName(anomaly.severity)})`, margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`   ${anomaly.description}`, margin, yPosition);
      yPosition += 8;
      doc.text(`   分值: +${anomaly.scoreDelta} 分`, margin, yPosition);
      yPosition += 10;
    });
  }

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  const missedAnomalies = record.anomalies.filter(a => !a.isDetected && !a.isWronglyMarked);

  if (missedAnomalies.length > 0) {
    yPosition += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('三、遗漏的异常', margin, yPosition);
    yPosition += 10;

    missedAnomalies.forEach((anomaly, index) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${getAnomalyTypeName(anomaly.type)} (${getSeverityName(anomaly.severity)})`, margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`   ${anomaly.description}`, margin, yPosition);
      yPosition += 10;
    });
  }

  const wrongMarks = record.anomalies.filter(a => a.isWronglyMarked);

  if (wrongMarks.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    yPosition += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('四、错误标记的项', margin, yPosition);
    yPosition += 10;

    wrongMarks.forEach((anomaly, index) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${getAnomalyTypeName(anomaly.type)}`, margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`   ${anomaly.description}`, margin, yPosition);
      yPosition += 8;
      doc.text(`   扣分: -${15} 分`, margin, yPosition);
      yPosition += 10;
    });
  }

  doc.save(`税务稽核报告-${record.levelName}-${new Date(record.completedAt).toLocaleDateString('zh-CN')}.pdf`);
}
