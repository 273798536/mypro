import type { Student, ProgressRecord, SkillDimension } from '../types';
import { studentStore, progressStore } from './storage';

export interface ProgressSummary {
  studentId: string;
  studentName: string;
  grade: string;
  instrument: string;
  overallChange: number;
  topImprovements: { dimension: string; score: number; note: string }[];
  biggestConcerns: { dimension: string; score: number; note: string }[];
  highlights: string[];
  teacherComment: string;
}

export function analyzeStudentProgress(studentId: string): ProgressSummary | null {
  const student = studentStore.getById(studentId);
  if (!student) return null;

  const latest = progressStore.getLatestByStudentId(studentId);
  if (!latest) {
    return {
      studentId,
      studentName: student.name,
      grade: student.grade,
      instrument: student.instrument,
      overallChange: 0,
      topImprovements: [],
      biggestConcerns: [],
      highlights: ['暂无进度记录，请先完成周期测评'],
      teacherComment: '还没有老师评语',
    };
  }

  const sorted = [...latest.dimensions].sort(
    (a, b) => (b.currentScore - b.previousScore) - (a.currentScore - a.previousScore)
  );

  const topImprovements = sorted.slice(0, 2).map(d => ({
    dimension: d.name,
    score: d.currentScore - d.previousScore,
    note: d.note,
  }));

  const lowestAbsolute = [...latest.dimensions]
    .sort((a, b) => a.currentScore - b.currentScore)
    .slice(0, 2)
    .map(d => ({
      dimension: d.name,
      score: d.currentScore,
      note: d.note,
    }));

  return {
    studentId,
    studentName: student.name,
    grade: student.grade,
    instrument: student.instrument,
    overallChange: latest.overallChange,
    topImprovements,
    biggestConcerns: lowestAbsolute,
    highlights: latest.highlights,
    teacherComment: latest.teacherComment,
  };
}

export function getPlainLanguageProgressReport(summary: ProgressSummary): string {
  const lines: string[] = [];
  lines.push(`【${summary.studentName}】（${summary.grade} · ${summary.instrument}）`);
  lines.push(`本周期综合进步幅度：${summary.overallChange > 0 ? '+' : ''}${summary.overallChange} 分`);
  lines.push('');

  if (summary.topImprovements.length > 0) {
    lines.push('进步最明显的地方：');
    summary.topImprovements.forEach(t => {
      lines.push(`  · ${t.dimension}（+${t.score}分）：${t.note}`);
    });
    lines.push('');
  }

  if (summary.biggestConcerns.length > 0) {
    lines.push('还需要加把劲的地方：');
    summary.biggestConcerns.forEach(c => {
      lines.push(`  · ${c.dimension}（当前${c.score}分）：${c.note}`);
    });
    lines.push('');
  }

  if (summary.highlights.length > 0) {
    lines.push('老师观察到的亮点：');
    summary.highlights.forEach(h => lines.push(`  · ${h}`));
    lines.push('');
  }

  lines.push(`林姐评语：${summary.teacherComment}`);
  return lines.join('\n');
}

export function batchAnalyzeAllStudents(): ProgressSummary[] {
  const students = studentStore.getAll();
  return students
    .map(s => analyzeStudentProgress(s.id))
    .filter(Boolean) as ProgressSummary[];
}

export function generateProgressDiff(oldDims: SkillDimension[], newDims: SkillDimension[]): string[] {
  const messages: string[] = [];
  newDims.forEach(n => {
    const old = oldDims.find(o => o.key === n.key);
    if (!old) {
      messages.push(`新增维度「${n.name}」，当前${n.currentScore}分`);
      return;
    }
    const diff = n.currentScore - old.currentScore;
    if (diff >= 10) {
      messages.push(`${n.name}大幅提升 +${diff} 分`);
    } else if (diff >= 5) {
      messages.push(`${n.name}稳步提升 +${diff} 分`);
    } else if (diff < -3) {
      messages.push(`${n.name}有所回落 ${diff} 分，需要关注`);
    }
  });
  return messages;
}
