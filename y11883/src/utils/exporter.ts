import type { ProblemResult, InputError } from '../types';
import { formatConditionsDescription } from './validator';

export interface ExportSummary {
  exportTime: string;
  summary: {
    totalProblems: number;
    validProblems: number;
    invalidProblems: number;
    totalWarnings: number;
    averagePartitionsPerProblem: number;
  };
  problems: Array<{
    id: string;
    lineNumber: number;
    targetNumber: number;
    conditions: any;
    conditionsDescription: string;
    partitions: number[][];
    partitionCount: number;
    studentAnswer: {
      raw: string[];
      correct: string[];
      wrong: string[];
      missed: string[];
      duplicate: string[];
    };
    warnings: Array<{
      type: string;
      message: string;
    }>;
  }>;
  errors: Array<{
    lineNumber: number;
    rawInput: string;
    errorType: string;
    message: string;
  }>;
}

export function generateJSONExport(
  problems: ProblemResult[],
  errors: InputError[]
): ExportSummary {
  const totalWarnings = problems.reduce((sum, p) => sum + p.warnings.length, 0);
  const totalPartitions = problems.reduce((sum, p) => sum + p.partitions.length, 0);

  return {
    exportTime: new Date().toISOString(),
    summary: {
      totalProblems: problems.length + errors.length,
      validProblems: problems.length,
      invalidProblems: errors.length,
      totalWarnings,
      averagePartitionsPerProblem: problems.length > 0 ? totalPartitions / problems.length : 0
    },
    problems: problems.map(p => ({
      id: p.input.id,
      lineNumber: p.input.lineNumber,
      targetNumber: p.input.targetNumber,
      conditions: p.input.conditions,
      conditionsDescription: formatConditionsDescription(p.input.conditions),
      partitions: p.partitions.map(part => part.numbers),
      partitionCount: p.partitions.length,
      studentAnswer: {
        raw: p.input.studentAnswer,
        correct: p.answerComparison.correctAnswers,
        wrong: p.answerComparison.wrongAnswers,
        missed: p.answerComparison.missedAnswers,
        duplicate: p.answerComparison.duplicateAnswers
      },
      warnings: p.warnings.map(w => ({
        type: w.type,
        message: w.message
      }))
    })),
    errors: errors.map(e => ({
      lineNumber: e.lineNumber,
      rawInput: e.rawInput,
      errorType: e.errorType,
      message: e.message
    }))
  };
}

export function generateCSVExport(problems: ProblemResult[]): string {
  const headers = [
    '题目序号',
    '行号',
    '目标整数',
    '限制条件',
    '正确拆分数',
    '学生对的数量',
    '学生错的数量',
    '学生漏的数量',
    '学生重复的数量',
    '预警数量',
    '正确拆分',
    '学生答案'
  ];

  const rows = problems.map((p, idx) => {
    const conditionsDesc = formatConditionsDescription(p.input.conditions);
    const partitionsStr = p.partitions.map(part => part.numbers.join('+')).join('; ');
    const studentAnswersStr = p.input.studentAnswer.join('; ');

    return [
      idx + 1,
      p.input.lineNumber,
      p.input.targetNumber,
      `"${conditionsDesc}"`,
      p.partitions.length,
      p.answerComparison.correctAnswers.length,
      p.answerComparison.wrongAnswers.length,
      p.answerComparison.missedAnswers.length,
      p.answerComparison.duplicateAnswers.length,
      p.warnings.length,
      `"${partitionsStr}"`,
      `"${studentAnswersStr}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadJSON(data: ExportSummary, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
