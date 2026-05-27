import type { GameRecord, ReportData, ErrorRecord } from '../types';

export function generateReportData(record: GameRecord): ReportData {
  const errorsByStatus = {
    unprocessed: record.errors.filter(e => e.correctionStatus === 'unprocessed'),
    corrected: record.errors.filter(e => e.correctionStatus === 'corrected'),
    needsManualReview: record.errors.filter(e => e.correctionStatus === 'needs_manual_review')
  };

  const functionStats: ReportData['functionStats'] = record.functionHistory.map(funcId => {
    const funcErrors = record.errors.filter(e => e.functionId === funcId);
    return {
      functionId: funcId,
      displayExpression: funcId,
      totalJudgements: 0,
      correctCount: 0,
      errors: funcErrors
    };
  });

  return {
    summary: {
      totalScore: record.totalScore,
      totalJudgements: record.totalJudgements,
      correctJudgements: record.correctJudgements,
      accuracy: record.totalJudgements > 0
        ? Math.round((record.correctJudgements / record.totalJudgements) * 100)
        : 0,
      levelsCompleted: record.levelsCompleted,
      totalErrors: record.errors.length,
      playTime: Math.round((record.endTime - record.startTime) / 1000)
    },
    errorsByStatus,
    functionStats
  };
}

export function exportToJSON(report: ReportData): string {
  return JSON.stringify(report, null, 2);
}

export function exportToCSV(report: ReportData): string {
  const headers = ['ID', '关卡', '函数', '坐标', '判断类型', '玩家答案', '正确答案', '错误原因', '状态', '时间'];
  
  const allErrors: ErrorRecord[] = [
    ...report.errorsByStatus.unprocessed,
    ...report.errorsByStatus.corrected,
    ...report.errorsByStatus.needsManualReview
  ];

  const rows = allErrors.map(error => [
    error.id,
    error.levelId,
    error.functionId,
    `(${error.point.x.toFixed(2)}, ${error.point.y.toFixed(2)})`,
    error.judgementType === 'slope' ? '斜率' : '极值',
    error.playerAnswer,
    error.correctAnswer,
    `"${error.reason}"`,
    getStatusLabel(error.correctionStatus),
    new Date(error.timestamp).toLocaleString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

export function exportToMarkdown(report: ReportData): string {
  const { summary, errorsByStatus } = report;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const formatErrors = (errors: ErrorRecord[]): string => {
    if (errors.length === 0) return '无';
    return errors.map(e => `- **${e.source}**\n  - 坐标: (${e.point.x.toFixed(2)}, ${e.point.y.toFixed(2)})\n  - 类型: ${e.judgementType === 'slope' ? '斜率' : '极值'}\n  - 错误: ${e.reason}`).join('\n');
  };

  return `# 数学函数攀岩 - 游戏报告

## 📊 成绩概览

| 项目 | 数值 |
|------|------|
| 总得分 | ${summary.totalScore} |
| 总判断次数 | ${summary.totalJudgements} |
| 正确次数 | ${summary.correctJudgements} |
| 正确率 | ${summary.accuracy}% |
| 完成关卡 | ${summary.levelsCompleted} |
| 总错误数 | ${summary.totalErrors} |
| 游戏时长 | ${formatTime(summary.playTime)} |

## ❌ 错误分析

### 🔴 未处理的错误 (${errorsByStatus.unprocessed.length})

${formatErrors(errorsByStatus.unprocessed)}

### 🟡 需要人工确认 (${errorsByStatus.needsManualReview.length})

${formatErrors(errorsByStatus.needsManualReview)}

### ✅ 已修正 (${errorsByStatus.corrected.length})

${formatErrors(errorsByStatus.corrected)}

---

*报告生成时间: ${new Date().toLocaleString()}*
`;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadReport(report: ReportData, format: 'json' | 'csv' | 'md'): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'json':
      content = exportToJSON(report);
      filename = `math-climbing-report-${timestamp}.json`;
      mimeType = 'application/json';
      break;
    case 'csv':
      content = exportToCSV(report);
      filename = `math-climbing-report-${timestamp}.csv`;
      mimeType = 'text/csv';
      break;
    case 'md':
      content = exportToMarkdown(report);
      filename = `math-climbing-report-${timestamp}.md`;
      mimeType = 'text/markdown';
      break;
  }

  downloadFile(content, filename, mimeType);
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    unprocessed: '未处理',
    corrected: '已修正',
    needs_manual_review: '需人工确认'
  };
  return labels[status] || status;
}
