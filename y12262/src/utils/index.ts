import type { RiskLevel, NodeType, MaterialSource, MaterialType } from '../types';

export function getRiskLevelColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    unknown: '#6B7280',
    safe: '#059669',
    suspicious: '#D97706',
    blacklist: '#DC2626',
  };
  return colors[level];
}

export function getRiskLevelBgColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    unknown: 'bg-gray-500',
    safe: 'bg-emerald-600',
    suspicious: 'bg-amber-600',
    blacklist: 'bg-red-600',
  };
  return colors[level];
}

export function getRiskLevelBorderColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    unknown: 'border-gray-500',
    safe: 'border-emerald-500',
    suspicious: 'border-amber-500',
    blacklist: 'border-red-500',
  };
  return colors[level];
}

export function getRiskLevelText(level: RiskLevel): string {
  const texts: Record<RiskLevel, string> = {
    unknown: '未标记',
    safe: '安全',
    suspicious: '可疑',
    blacklist: '黑名单',
  };
  return texts[level];
}

export function getNodeTypeIcon(type: NodeType): string {
  const icons: Record<NodeType, string> = {
    account: '👤',
    device: '💻',
    address: '📍',
  };
  return icons[type];
}

export function getNodeTypeText(type: NodeType): string {
  const texts: Record<NodeType, string> = {
    account: '账户',
    device: '设备',
    address: '地址',
  };
  return texts[type];
}

export function getMaterialSourceColor(source: MaterialSource): string {
  const colors: Record<MaterialSource, string> = {
    bank: 'bg-blue-500',
    police: 'bg-red-500',
    telco: 'bg-purple-500',
    merchant: 'bg-green-500',
    internal: 'bg-slate-500',
  };
  return colors[source];
}

export function getMaterialSourceText(source: MaterialSource): string {
  const texts: Record<MaterialSource, string> = {
    bank: '银行',
    police: '警方',
    telco: '运营商',
    merchant: '商户',
    internal: '内部系统',
  };
  return texts[source];
}

export function getMaterialTypeText(type: MaterialType): string {
  const texts: Record<MaterialType, string> = {
    'account-card': '账户卡信息',
    'address-clue': '地址线索',
    'risk-tag': '风险标签',
  };
  return texts[type];
}

export function getMaterialTypeIcon(type: MaterialType): string {
  const icons: Record<MaterialType, string> = {
    'account-card': '💳',
    'address-clue': '📍',
    'risk-tag': '🏷️',
  };
  return icons[type];
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  const colors = {
    easy: 'bg-green-500',
    medium: 'bg-amber-500',
    hard: 'bg-red-500',
  };
  return colors[difficulty];
}

export function getDifficultyText(difficulty: 'easy' | 'medium' | 'hard'): string {
  const texts = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  return texts[difficulty];
}

export function getFocusPointText(focusPoint: 'chain-length' | 'device-sharing' | 'tag-lag'): string {
  const texts = {
    'chain-length': '关系链过长',
    'device-sharing': '设备共享误伤',
    'tag-lag': '标签滞后',
  };
  return texts[focusPoint];
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateReportText(report: any): string {
  let content = '';
  content += '='.repeat(60) + '\n';
  content += '           风控黑名单追踪局 - 风险分析报告\n';
  content += '='.repeat(60) + '\n\n';
  content += `报告编号: ${report.levelId}\n`;
  content += `报告标题: ${report.levelTitle}\n`;
  content += `生成时间: ${formatTimestamp(report.generateTime)}\n\n`;

  content += '-'.repeat(60) + '\n';
  content += '一、基本信息统计\n';
  content += '-'.repeat(60) + '\n';
  content += `总节点数: ${report.totalNodes}\n`;
  content += `标记为黑名单: ${report.blacklistCount}\n`;
  content += `标记为安全: ${report.safeCount}\n`;
  content += `标记为可疑: ${report.suspiciousCount}\n`;
  content += `判断准确率: ${(report.accuracyRate * 100).toFixed(1)}%\n\n`;

  if (report.falsePositives && report.falsePositives.length > 0) {
    content += '-'.repeat(60) + '\n';
    content += '二、误判/漏判详情\n';
    content += '-'.repeat(60) + '\n\n';
    report.falsePositives.forEach((item: any, index: number) => {
      content += `${index + 1}. 节点: ${item.nodeName} (${getNodeTypeText(item.nodeType)})\n`;
      content += `   你的标记: ${getRiskLevelText(item.playerMark)}\n`;
      content += `   正确标记: ${getRiskLevelText(item.correctMark)}\n`;
      content += `   原因分析: ${item.reason}\n`;
      content += `   证据支持: ${item.evidence}\n\n`;
    });
  }

  if (report.chainLengthIssues && report.chainLengthIssues.length > 0) {
    content += '-'.repeat(60) + '\n';
    content += '三、关系链过长问题分析\n';
    content += '-'.repeat(60) + '\n\n';
    report.chainLengthIssues.forEach((issue: any, index: number) => {
      content += `${index + 1}. 关系链: ${issue.chain.join(' → ')}\n`;
      content += `   链长度: ${issue.chainLength}度\n`;
      content += `   问题描述: ${issue.description}\n`;
      content += `   处理建议: ${issue.suggestion}\n\n`;
    });
  }

  if (report.tagLagIssues && report.tagLagIssues.length > 0) {
    content += '-'.repeat(60) + '\n';
    content += '四、标签滞后问题分析\n';
    content += '-'.repeat(60) + '\n\n';
    report.tagLagIssues.forEach((issue: any, index: number) => {
      content += `${index + 1}. 节点: ${issue.nodeName}\n`;
      content += `   历史标签: ${getRiskLevelText(issue.oldTag)}\n`;
      content += `   最新标签: ${getRiskLevelText(issue.newTag)}\n`;
      content += `   更新时间: ${issue.timeDiff}\n`;
      content += `   影响分析: ${issue.impact}\n\n`;
    });
  }

  if (report.trainingPoints && report.trainingPoints.length > 0) {
    content += '-'.repeat(60) + '\n';
    content += '五、培训要点总结\n';
    content += '-'.repeat(60) + '\n\n';
    report.trainingPoints.forEach((point: string, index: number) => {
      content += `${index + 1}. ${point}\n\n`;
    });
  }

  if (report.playerOperations && report.playerOperations.length > 0) {
    content += '-'.repeat(60) + '\n';
    content += '六、操作记录回放\n';
    content += '-'.repeat(60) + '\n\n';
    report.playerOperations.forEach((op: any, index: number) => {
      const status = op.isCorrect ? '✓ 正确' : '✗ 错误';
      content += `${index + 1}. [${status}] ${formatTimestamp(op.timestamp)}\n`;
      content += `   操作: ${getNodeTypeText(op.action.includes('safe') ? 'account' : op.action.includes('suspicious') ? 'account' : 'account')} `;
      content += `${getRiskLevelText(op.oldValue)} → ${getRiskLevelText(op.newValue)}\n`;
      if (op.feedback) {
        content += `   反馈: ${op.feedback}\n`;
      }
      content += '\n';
    });
  }

  content += '='.repeat(60) + '\n';
  content += '                  报告结束\n';
  content += '='.repeat(60) + '\n';

  return content;
}
