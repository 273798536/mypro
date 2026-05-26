import type { RescueReport, WarningRecord } from '@/types';

export const generateReportText = (report: RescueReport): string => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getWarningTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'equipment-mismatch': '装备不匹配',
      'route-closed': '路线关闭',
      'injury-worsening': '伤情恶化',
    };
    return labels[type] || type;
  };

  let reportText = '';
  reportText += '═'.repeat(60) + '\n';
  reportText += '           ⛷️  滑雪救援派遣赛 - 救援报告  ⛷️\n';
  reportText += '═'.repeat(60) + '\n\n';

  reportText += '【总体评价】\n';
  reportText += `  评级: ${report.grade}\n`;
  reportText += `  总分: ${report.score}/100\n`;
  reportText += `  总用时: ${formatTime(report.totalTime)}\n\n`;

  reportText += '【得分明细】\n';
  reportText += `  • 救援成功率: ${report.breakdown.successRate}/40\n`;
  reportText += `  • 响应速度: ${report.breakdown.speedScore}/30\n`;
  reportText += `  • 装备正确率: ${report.breakdown.equipmentScore}/20\n`;
  reportText += `  • 警告处理: ${report.breakdown.warningScore}/10\n\n`;

  reportText += '【救援统计】\n';
  reportText += `  伤员总数: ${report.totalVictims}\n`;
  reportText += `  ✓ 成功救援: ${report.rescued}\n`;
  reportText += `  ✗ 救援失败: ${report.failed}\n`;
  reportText += `  ⚠  未处理: ${report.unhandled}\n\n`;

  reportText += '【警告处理情况】\n';
  reportText += `  已修正: ${report.corrected}\n`;
  reportText += `  需人工确认: ${report.needsConfirmation}\n\n`;

  reportText += '【详细警告记录】\n';
  if (report.warnings.length === 0) {
    reportText += '  无警告记录\n';
  } else {
    reportText += '-'.repeat(58) + '\n';
    reportText += `${'类型'.padEnd(12)}${'状态'.padEnd(10)}${'时间'.padEnd(10)}描述\n`;
    reportText += '-'.repeat(58) + '\n';

    report.warnings.forEach((warning: WarningRecord, index: number) => {
      const type = getWarningTypeLabel(warning.type).padEnd(12);
      const status = (warning.isResolved ? '已修正' : '待确认').padEnd(10);
      const time = formatTime(warning.timestamp).padEnd(10);
      reportText += `${index + 1}. ${type}${status}${time}${warning.message}\n`;
      if (warning.source) {
        reportText += `   来源: ${warning.source}\n`;
      }
      if (warning.correction) {
        reportText += `   修正: ${warning.correction}\n`;
      }
    });
  }

  reportText += '\n' + '═'.repeat(60) + '\n';
  reportText += '                  报告生成时间: ' + new Date().toLocaleString('zh-CN') + '\n';
  reportText += '═'.repeat(60) + '\n';

  return reportText;
};

export const downloadReport = (report: RescueReport): void => {
  const reportText = generateReportText(report);
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `救援报告-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportReportAsJSON = (report: RescueReport): void => {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `救援报告-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
