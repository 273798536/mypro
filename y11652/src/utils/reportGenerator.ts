import type { ErrorType, GameReport, GameState, PlayerAction } from '@/types';
import { ERROR_TYPE_LABELS, MATERIAL_TYPE_LABELS, SECURITY_LEVEL_LABELS, RETENTION_PERIOD_LABELS, CARD_SOURCE_LABELS, DIFFICULTY_LABELS } from '@/types';
import { calculateAccuracy } from './scoreSystem';

export function generateReport(gameState: GameState, reportId?: string): GameReport {
  const { cards, actions, score, maxCombo, startTime, endTime, difficulty } = gameState;
  
  const errorsByType: Record<ErrorType, number> = {
    classification: 0,
    security_level: 0,
    retention_period: 0,
    borrow_not_registered: 0,
  };
  
  let correctCount = 0;
  
  actions.forEach((action) => {
    if (action.errors.length === 0) {
      correctCount++;
    }
    action.errors.forEach((error) => {
      errorsByType[error]++;
    });
  });
  
  const totalCards = cards.length;
  const accuracy = calculateAccuracy(correctCount, totalCards);
  const errorCount = actions.filter((a) => a.errors.length > 0).length;
  
  return {
    id: reportId || `report-${Date.now()}`,
    startTime: startTime || 0,
    endTime: endTime || Date.now(),
    difficulty,
    totalScore: score,
    accuracy,
    totalCards,
    correctCount,
    errorCount,
    maxCombo,
    errorsByType,
    actions,
    cards,
  };
}

export function exportToJSON(report: GameReport): string {
  return JSON.stringify(report, null, 2);
}

export function exportToMarkdown(report: GameReport): string {
  const duration = Math.round((report.endTime - report.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  const lines: string[] = [];
  
  lines.push('# 资料归档审计报告');
  lines.push('');
  lines.push(`- 游戏难度：${DIFFICULTY_LABELS[report.difficulty]}`);
  lines.push(`- 开始时间：${new Date(report.startTime).toLocaleString()}`);
  lines.push(`- 结束时间：${new Date(report.endTime).toLocaleString()}`);
  lines.push(`- 游戏时长：${minutes}分${seconds}秒`);
  lines.push('');
  
  lines.push('## 得分概览');
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 总分 | ${report.totalScore} |`);
  lines.push(`| 正确率 | ${report.accuracy}% |`);
  lines.push(`| 处理卡牌数 | ${report.totalCards} |`);
  lines.push(`| 正确数 | ${report.correctCount} |`);
  lines.push(`| 错误数 | ${report.errorCount} |`);
  lines.push(`| 最高连击 | ${report.maxCombo} |`);
  lines.push('');
  
  lines.push('## 错误分析');
  lines.push('');
  lines.push(`| 错误类型 | 次数 |`);
  lines.push(`|---------|------|`);
  (Object.keys(report.errorsByType) as ErrorType[]).forEach((type) => {
    lines.push(`| ${ERROR_TYPE_LABELS[type]} | ${report.errorsByType[type]} |`);
  });
  lines.push('');
  
  lines.push('## 操作明细');
  lines.push('');
  
  report.actions.forEach((action, index) => {
    const card = report.cards.find((c) => c.id === action.cardId);
    if (!card) return;
    
    lines.push(`### 第 ${index + 1} 张卡牌`);
    lines.push('');
    lines.push(`- 卡牌来源：${CARD_SOURCE_LABELS[card.source]}`);
    lines.push(`- 卡牌标题：${card.title}`);
    lines.push(`- 正确分类：${MATERIAL_TYPE_LABELS[card.materialType]}`);
    lines.push(`- 正确保密级别：${SECURITY_LEVEL_LABELS[card.correctSecurityLevel]}`);
    lines.push(`- 正确保管期限：${RETENTION_PERIOD_LABELS[card.correctRetentionPeriod]}`);
    if (card.hasBorrowRequest) {
      lines.push(`- 借阅人：${card.borrower} (${card.borrowDate})`);
    }
    lines.push('');
    lines.push(`**玩家操作：**`);
    lines.push(`- 选择分类：${MATERIAL_TYPE_LABELS[action.selectedType]}`);
    lines.push(`- 选择保密级别：${SECURITY_LEVEL_LABELS[action.selectedSecurityLevel]}`);
    lines.push(`- 选择保管期限：${RETENTION_PERIOD_LABELS[action.selectedRetentionPeriod]}`);
    lines.push(`- 借阅登记：${action.isBorrowRegistered ? '已登记' : '未登记'}`);
    lines.push('');
    
    if (action.errors.length > 0) {
      lines.push(`**错误类型：** ${action.errors.map((e) => ERROR_TYPE_LABELS[e]).join('、')}`);
    } else {
      lines.push(`**结果：** ✅ 正确`);
    }
    lines.push(`- 分数变化：${action.scoreChange > 0 ? '+' : ''}${action.scoreChange}`);
    lines.push('');
  });
  
  lines.push('## 改进建议');
  lines.push('');
  
  const suggestions: string[] = [];
  if (report.errorsByType.classification > 0) {
    suggestions.push('- 材料分类判断需要加强，注意合同、发票、保密材料的特征区别');
  }
  if (report.errorsByType.security_level > 0) {
    suggestions.push('- 保密级别判断需要加强，不同材料类型对应不同的密级范围');
  }
  if (report.errorsByType.retention_period > 0) {
    suggestions.push('- 保管期限计算需要加强，熟记各类材料的保管期限规定');
  }
  if (report.errorsByType.borrow_not_registered > 0) {
    suggestions.push('- 注意检查借阅请求，有借阅记录的材料必须登记');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('- 表现优秀！继续保持！');
  }
  
  suggestions.forEach((s) => lines.push(s));
  
  return lines.join('\n');
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
