import type { GameRecord, GameAction } from '@/types';
import { ERROR_TYPE_LABELS, TARGET_AREA_LABELS } from '@/types';

export function exportToCSV(record: GameRecord): string {
  const headers = ['序号', '书名', '操作区域', '正确区域', '结果', '错误类型', '得分', '时间戳'];
  
  const rows = record.actions.map((action, index) => {
    const errorLabel = action.errorType ? ERROR_TYPE_LABELS[action.errorType] : '';
    return [
      index + 1,
      action.itemTitle,
      TARGET_AREA_LABELS[action.target],
      TARGET_AREA_LABELS[action.correctTarget],
      action.isCorrect ? '正确' : '错误',
      errorLabel,
      action.points,
      new Date(action.timestamp).toLocaleTimeString(),
    ].join(',');
  });

  const summary = [
    '',
    '',
    `关卡: ${record.levelName}`,
    `总分: ${record.score}`,
    `正确率: ${((record.correctCount / record.totalItems) * 100).toFixed(1)}%`,
    `用时: ${record.duration}秒`,
  ].join('\n');

  return [headers.join(','), ...rows, summary].join('\n');
}

export function exportToJSON(record: GameRecord): string {
  return JSON.stringify(record, null, 2);
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(record: GameRecord) {
  const csv = exportToCSV(record);
  downloadFile(csv, `整理报告_${record.levelName}_${new Date().toLocaleDateString()}.csv`, 'text/csv');
}

export function downloadJSON(record: GameRecord) {
  const json = exportToJSON(record);
  downloadFile(json, `整理报告_${record.levelName}_${new Date().toLocaleDateString()}.json`, 'application/json');
}

export function generateReportSummary(record: GameRecord) {
  const errorTypes = ['reserved_return', 'damaged_unregistered', 'shelf_mismatch', 'return_mismatch'] as const;
  const errorDistribution = errorTypes.map(type => ({
    type,
    label: ERROR_TYPE_LABELS[type],
    count: record.actions.filter(a => a.errorType === type).length,
  }));

  return {
    totalScore: record.score,
    accuracy: record.totalItems > 0 ? (record.correctCount / record.totalItems) * 100 : 0,
    avgTimePerItem: record.totalItems > 0 ? record.duration / record.totalItems : 0,
    errorDistribution,
    timeline: record.actions.map((a: GameAction, i: number) => ({
      index: i + 1,
      time: a.timestamp,
      correct: a.isCorrect,
      points: a.points,
      itemTitle: a.itemTitle,
    })),
  };
}
