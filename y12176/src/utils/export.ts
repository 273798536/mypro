import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { ExamPaper, Question, KnowledgeTag } from '../types';
import { getDifficultyLabel, getCategoryLabel, formatDate } from './algorithms';

export function exportExamToXLSX(exam: ExamPaper, knowledgeTags: KnowledgeTag[]): void {
  const wb = XLSX.utils.book_new();

  const questionsData = exam.questions.map((q, idx) => {
    const tags = q.tags
      .map((t) => knowledgeTags.find((kt) => kt.id === t)?.name)
      .filter(Boolean)
      .join('、');

    const categories = Array.from(
      new Set(
        q.tags
          .map((t) => knowledgeTags.find((kt) => kt.id === t)?.category)
          .filter(Boolean)
      )
    )
      .map((c) => getCategoryLabel(c as any))
      .join('、');

    return {
      '序号': idx + 1,
      '题目': q.title,
      '知识点分类': categories,
      '知识点标签': tags,
      '难度': getDifficultyLabel(q.difficulty),
      '选项A': q.options[0] || '',
      '选项B': q.options[1] || '',
      '选项C': q.options[2] || '',
      '选项D': q.options[3] || '',
      '正确答案': q.correctAnswer,
      '音频时长(秒)': q.audioDuration,
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(questionsData);
  XLSX.utils.book_append_sheet(wb, ws1, '试题');

  const answerData = exam.questions.map((q, idx) => ({
    '序号': idx + 1,
    '正确答案': q.correctAnswer,
    '知识点': q.tags.map((t) => knowledgeTags.find((kt) => kt.id === t)?.name).filter(Boolean).join('、'),
  }));

  const ws2 = XLSX.utils.json_to_sheet(answerData);
  XLSX.utils.book_append_sheet(wb, ws2, '参考答案');

  XLSX.writeFile(wb, `${exam.name}-${formatDate(Date.now())}.xlsx`);
}

export function exportExamToPDF(exam: ExamPaper, knowledgeTags: KnowledgeTag[]): void {
  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(exam.name, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, margin, yPos);
  yPos += 5;
  doc.text(`题目数量: ${exam.questions.length}`, margin, yPos);
  yPos += 5;
  doc.text(
    `难度分布: 易${Math.round(exam.strategy.difficultyDistribution.easy * 100)}% / ` +
      `中${Math.round(exam.strategy.difficultyDistribution.medium * 100)}% / ` +
      `难${Math.round(exam.strategy.difficultyDistribution.hard * 100)}%`,
    margin,
    yPos
  );
  yPos += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('答题纸', margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  exam.questions.forEach((q, idx) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${q.title}`, margin, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    const tags = q.tags
      .map((t) => knowledgeTags.find((kt) => kt.id === t)?.name)
      .filter(Boolean)
      .join('、');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`【${getDifficultyLabel(q.difficulty)}】${tags}`, margin + 5, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    yPos += 6;

    q.options.forEach((opt, optIdx) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      const label = String.fromCharCode(65 + optIdx);
      doc.text(`  ${label}. ${opt}`, margin + 5, yPos);
      yPos += 6;
    });

    yPos += 5;
  });

  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('参考答案', margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  exam.questions.forEach((q, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${idx + 1}. ${q.correctAnswer}`,
      margin,
      yPos
    );
    yPos += 6;
  });

  doc.save(`${exam.name}-${formatDate(Date.now())}.pdf`);
}

export function exportQuestionsToXLSX(questions: Question[], knowledgeTags: KnowledgeTag[]): void {
  const wb = XLSX.utils.book_new();

  const data = questions.map((q) => {
    const tags = q.tags
      .map((t) => knowledgeTags.find((kt) => kt.id === t)?.name)
      .filter(Boolean)
      .join('、');

    const categories = Array.from(
      new Set(
        q.tags
          .map((t) => knowledgeTags.find((kt) => kt.id === t)?.category)
          .filter(Boolean)
      )
    )
      .map((c) => getCategoryLabel(c as any))
      .join('、');

    const correctRate = q.answerRecords.length > 0
      ? Math.round((q.answerRecords.filter(r => r.isCorrect).length / q.answerRecords.length) * 100)
      : '-';

    return {
      '题目ID': q.id,
      '题目标题': q.title,
      '知识点分类': categories,
      '知识点标签': tags,
      '标签状态': q.tagStatus === 'confirmed' ? '已确认' : q.tagStatus === 'pending' ? '待确认' : '缺失',
      '难度': getDifficultyLabel(q.difficulty),
      '状态': q.status === 'active' ? '启用' : q.status === 'pending_review' ? '待复核' : q.status === 'duplicate' ? '重复' : '已废弃',
      '正确答案': q.correctAnswer,
      '答题人次': q.answerRecords.length,
      '正确率(%)': correctRate,
      '创建人': q.createdBy,
      '创建时间': formatDate(q.createdAt),
      '更新时间': formatDate(q.updatedAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '题库');
  XLSX.writeFile(wb, `题库导出-${formatDate(Date.now())}.xlsx`);
}

export function exportAnswersToXLSX(questions: Question[]): void {
  const wb = XLSX.utils.book_new();

  const allRecords = questions.flatMap(q =>
    q.answerRecords.map(r => ({
      '题目ID': q.id,
      '题目标题': q.title,
      '学生ID': r.studentId,
      '学生姓名': r.studentName,
      '是否正确': r.isCorrect ? '是' : '否',
      '得分': r.score ?? '-',
      '答题时间': formatDate(r.answerTime),
    }))
  );

  const ws = XLSX.utils.json_to_sheet(allRecords);
  XLSX.utils.book_append_sheet(wb, ws, '答题记录');

  const stats = questions.map(q => {
    const total = q.answerRecords.length;
    const correct = q.answerRecords.filter(r => r.isCorrect).length;
    return {
      '题目ID': q.id,
      '题目标题': q.title,
      '答题人次': total,
      '正确人数': correct,
      '正确率(%)': total > 0 ? Math.round((correct / total) * 100) : '-',
    };
  });

  const ws2 = XLSX.utils.json_to_sheet(stats);
  XLSX.utils.book_append_sheet(wb, ws2, '题目统计');

  XLSX.writeFile(wb, `答题数据-${formatDate(Date.now())}.xlsx`);
}
