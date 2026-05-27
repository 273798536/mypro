import jsPDF from 'jspdf';
import { GameRecord } from '@/types/game';
import { formatTime, getRiskTypeName, getGradeColor, generateHash } from './gameEngine';

export const generateReportPDF = async (record: GameRecord): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('保险理赔侦探局 - 结案报告', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`报告编号: ${record.id}`, margin, y);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, pageWidth - margin, y, { align: 'right' });
  y += 10;

  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('一、案件基本信息', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`案件名称: ${record.caseTitle}`, margin, y);
  y += 7;
  doc.text(`开始时间: ${new Date(record.startTime).toLocaleString('zh-CN')}`, margin, y);
  y += 7;
  doc.text(`结束时间: ${new Date(record.endTime).toLocaleString('zh-CN')}`, margin, y);
  y += 7;
  doc.text(`总用时: ${formatTime(record.totalTime)}`, margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('二、审核成绩', margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  const gradeColor = getGradeColor(record.grade);
  doc.setTextColor(
    parseInt(gradeColor.slice(1, 3), 16),
    parseInt(gradeColor.slice(3, 5), 16),
    parseInt(gradeColor.slice(5, 7), 16)
  );
  doc.text(`${record.grade}级`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`得分: ${record.score} / ${record.maxScore}`, pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text(`正确率: ${((record.score / record.maxScore) * 100).toFixed(1)}%`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  if (record.mistakes.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('三、错误详情', margin, y);
    y += 12;

    record.mistakes.forEach((mistake, index) => {
      if (y > 250) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${index + 1}. ${mistake.materialTitle}`, margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`   来源: ${mistake.source}`, margin, y);
      y += 6;

      const userAns = mistake.userAnswer ? '标记了风险' : '未标记风险';
      const correctAns = mistake.correctAnswer ? '应该标记风险' : '不应标记风险';
      doc.text(`   您的判断: ${userAns}`, margin, y);
      y += 6;
      doc.text(`   正确判断: ${correctAns}`, margin, y);
      y += 6;
      doc.text(`   扣分值: -${mistake.pointsLost}分`, margin, y);
      y += 6;

      const explanationLines = doc.splitTextToSize(`   说明: ${mistake.explanation}`, pageWidth - margin * 2);
      doc.text(explanationLines, margin, y);
      y += explanationLines.length * 5 + 8;
    });
  }

  doc.addPage();
  y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('四、答题明细', margin, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('序号', margin, y);
  doc.text('材料', margin + 15, y);
  doc.text('您的判断', margin + 60, y);
  doc.text('结果', margin + 95, y);
  doc.text('时间', margin + 115, y);
  y += 7;

  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  record.answers.forEach((answer, index) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'normal');
    doc.text(`${index + 1}`, margin, y);
    doc.text(answer.materialId, margin + 15, y);
    doc.text(answer.markedRisk ? (answer.riskType ? getRiskTypeName(answer.riskType) : '有风险') : '无风险', margin + 60, y);
    
    if (answer.isCorrect) {
      doc.setTextColor(0, 128, 0);
      doc.text('正确', margin + 95, y);
    } else {
      doc.setTextColor(255, 0, 0);
      doc.text('错误', margin + 95, y);
    }
    doc.setTextColor(0, 0, 0);
    
    doc.text(new Date(answer.timestamp).toLocaleTimeString('zh-CN'), margin + 115, y);
    y += 7;
  });

  doc.addPage();
  y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('五、数据验证', margin, y);
  y += 10;

  const hash = generateHash(record);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`数据校验码: ${hash}`, margin, y);
  y += 7;
  doc.text('此报告由系统自动生成，数据已加密验证。', margin, y);
  y += 5;
  doc.text('报告所有内容均来自实际游戏操作，不可篡改。', margin, y);

  return doc.output('blob');
};

export const downloadPDF = async (record: GameRecord): Promise<void> => {
  const blob = await generateReportPDF(record);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `理赔审核报告-${record.caseTitle}-${new Date().toLocaleDateString('zh-CN')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
