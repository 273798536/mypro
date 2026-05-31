import type { Case, ScoreBreakdown, Difficulty } from '@/types';
import { DIFFICULTY_LABELS } from '@/types';
import { getGrade, getRiskHumanDescription } from './gameLogic';

export interface FinalReport {
  summary: {
    score: number;
    grade: string;
    gradeColor: string;
    difficulty: Difficulty;
    totalCases: number;
    completedCases: number;
    correctVerdicts: number;
    totalTime: number;
    timeUsed: number;
  };
  scoreBreakdown: ScoreBreakdown;
  caseReports: CaseReport[];
  riskAnalysis: RiskAnalysis[];
  suggestions: string[];
}

export interface CaseReport {
  caseId: string;
  title: string;
  userVerdict: string;
  correctVerdict: string;
  isCorrect: boolean;
  humanExplanation: string;
  discoveredRisks: RiskItem[];
  missedRisks: RiskItem[];
}

export interface RiskItem {
  id: string;
  title: string;
  type: string;
  humanDescription: string;
  triggerClueTitle: string;
  nextStep: string;
}

export interface RiskAnalysis {
  type: string;
  label: string;
  total: number;
  discovered: number;
  discoveryRate: number;
}

export const generateFinalReport = (
  cases: Case[],
  score: number,
  scoreBreakdown: ScoreBreakdown,
  difficulty: Difficulty,
  timeLimit: number,
  timeRemaining: number
): FinalReport => {
  const completedCases = cases.filter((c) => c.isCompleted);
  const correctVerdicts = cases.filter((c) => c.userVerdict === c.correctVerdict);
  
  const caseReports: CaseReport[] = cases.map((caseItem) => {
    const verdictText = caseItem.userVerdict === 'approve' 
      ? '授权通过' 
      : caseItem.userVerdict === 'reject' 
        ? '驳回申请' 
        : caseItem.userVerdict === 'need_more'
          ? '需补充材料'
          : '未判定';
    const correctVerdictText = caseItem.correctVerdict === 'approve'
      ? '授权通过'
      : caseItem.correctVerdict === 'reject'
        ? '驳回申请'
        : '需补充材料';
    
    const discoveredRisks = caseItem.risks
      .filter((r) => r.isDiscovered)
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        humanDescription: getRiskHumanDescription(r),
        triggerClueTitle: caseItem.clues.find((c) => c.id === r.triggerClueId)?.title || '未知',
        nextStep: r.nextStep,
      }));
    
    const missedRisks = caseItem.risks
      .filter((r) => !r.isDiscovered)
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        humanDescription: getRiskHumanDescription(r),
        triggerClueTitle: caseItem.clues.find((c) => c.id === r.triggerClueId)?.title || '未知',
        nextStep: r.nextStep,
      }));
    
    return {
      caseId: caseItem.id,
      title: caseItem.title,
      userVerdict: verdictText,
      correctVerdict: correctVerdictText,
      isCorrect: caseItem.userVerdict === caseItem.correctVerdict,
      humanExplanation: caseItem.humanVerdictExplanation,
      discoveredRisks,
      missedRisks,
    };
  });

  const allRisks = cases.flatMap((c) => c.risks);
  const riskTypes = ['auth_expired', 'sample_exceed', 'name_confusion', 'missing_evidence'];
  const riskLabels: Record<string, string> = {
    auth_expired: '授权过期',
    sample_exceed: '采样超限',
    name_confusion: '同名曲混淆',
    missing_evidence: '证据不足',
  };
  
  const riskAnalysis: RiskAnalysis[] = riskTypes.map((type) => {
    const total = allRisks.filter((r) => r.type === type).length;
    const discovered = allRisks.filter((r) => r.type === type && r.isDiscovered).length;
    return {
      type,
      label: riskLabels[type],
      total,
      discovered,
      discoveryRate: total > 0 ? Math.round((discovered / total) * 100) : 0,
    };
  }).filter((r) => r.total > 0);

  const suggestions = generateSuggestions(caseReports, riskAnalysis, scoreBreakdown);
  const { grade, color: gradeColor } = getGrade(score);

  return {
    summary: {
      score,
      grade,
      gradeColor,
      difficulty,
      totalCases: cases.length,
      completedCases: completedCases.length,
      correctVerdicts: correctVerdicts.length,
      totalTime: timeLimit,
      timeUsed: timeLimit - timeRemaining,
    },
    scoreBreakdown,
    caseReports,
    riskAnalysis,
    suggestions,
  };
};

const generateSuggestions = (
  caseReports: CaseReport[],
  riskAnalysis: RiskAnalysis[],
  scoreBreakdown: ScoreBreakdown
): string[] => {
  const suggestions: string[] = [];
  
  const lowDiscoveryRisks = riskAnalysis.filter((r) => r.discoveryRate < 100);
  if (lowDiscoveryRisks.length > 0) {
    const riskNames = lowDiscoveryRisks.map((r) => r.label).join('、');
    suggestions.push(`⚠️ 风险识别能力有待提升：${riskNames} 的识别率不足100%，建议重点关注这类风险的特征。`);
  }

  const authExpiredAnalysis = riskAnalysis.find((r) => r.type === 'auth_expired');
  if (authExpiredAnalysis && authExpiredAnalysis.discoveryRate < 100) {
    suggestions.push('📌 特别注意「授权过期」：看到授权证书时，一定要先检查有效期！就像看食品保质期一样，过期了就不能用了。');
  }

  const wrongVerdicts = caseReports.filter((r) => !r.isCorrect);
  if (wrongVerdicts.length > 0) {
    suggestions.push(`🔍 判定准确性：有 ${wrongVerdicts.length} 个案件判定有误，建议复盘这些案件的逻辑链条。`);
  }

  if (scoreBreakdown.timePenalty < -50) {
    suggestions.push('⏰ 效率提升：时间扣分较多，建议加快线索归类速度，熟练后可以尝试更高难度。');
  }

  if (scoreBreakdown.wrongAssociation < -20) {
    suggestions.push('🎯 线索关联：错误关联扣分较多，建议先仔细阅读线索内容，再判断归属哪个案件。');
  }

  if (scoreBreakdown.correctVerdict >= 100 && lowDiscoveryRisks.length === 0) {
    suggestions.push('🎉 表现优秀！你对版权风险的识别和判定能力很强，可以挑战更高难度。');
  }

  if (suggestions.length === 0) {
    suggestions.push('✨ 完美表现！继续保持，你已经是版权审核专家了。');
  }

  return suggestions;
};

export const formatReportAsText = (report: FinalReport): string => {
  const { summary, caseReports, riskAnalysis, suggestions } = report;
  
  let text = `# 音乐版权拼案 - 结案报告\n\n`;
  text += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  
  text += `## 📊 总体评价\n\n`;
  text += `| 项目 | 结果 |\n`;
  text += `|------|------|\n`;
  text += `| 综合评级 | ${summary.grade} |\n`;
  text += `| 最终得分 | ${summary.score} 分 |\n`;
  text += `| 难度 | ${DIFFICULTY_LABELS[summary.difficulty]} |\n`;
  text += `| 完成案件 | ${summary.completedCases} / ${summary.totalCases} |\n`;
  text += `| 正确判定 | ${summary.correctVerdicts} / ${summary.totalCases} |\n`;
  text += `| 用时 | ${Math.floor(summary.timeUsed / 60)}分${summary.timeUsed % 60}秒 / ${Math.floor(summary.totalTime / 60)}分 |\n\n`;
  
  text += `## 📈 得分构成\n\n`;
  text += `- 正确关联线索：+${report.scoreBreakdown.correctAssociation} 分\n`;
  text += `- 错误关联线索：${report.scoreBreakdown.wrongAssociation} 分\n`;
  text += `- 正确判定案件：+${report.scoreBreakdown.correctVerdict} 分\n`;
  text += `- 错误判定案件：${report.scoreBreakdown.wrongVerdict} 分\n`;
  text += `- 时间消耗扣分：${report.scoreBreakdown.timePenalty} 分\n`;
  text += `- 提前完成奖励：+${report.scoreBreakdown.timeBonus} 分\n`;
  text += `- 发现风险奖励：+${report.scoreBreakdown.riskDiscovered} 分\n`;
  text += `- 未完成案件扣分：${report.scoreBreakdown.incompletePenalty} 分\n\n`;
  
  text += `## 🎵 案件详情\n\n`;
  caseReports.forEach((caseReport, index) => {
    text += `### ${index + 1}. ${caseReport.title}\n\n`;
    text += `- **你的判定**：${caseReport.userVerdict}\n`;
    text += `- **正确答案**：${caseReport.correctVerdict}\n`;
    text += `- **结果**：${caseReport.isCorrect ? '✅ 判定正确' : '❌ 判定有误'}\n\n`;
    text += `#### 人话解释\n\n${caseReport.humanExplanation}\n\n`;
    
    if (caseReport.discoveredRisks.length > 0) {
      text += `#### ✅ 发现的风险点\n\n`;
      caseReport.discoveredRisks.forEach((risk) => {
        text += `- **${risk.title}**\n`;
        text += `  - 说明：${risk.humanDescription}\n`;
        text += `  - 触发材料：${risk.triggerClueTitle}\n`;
        text += `  - 下一步：${risk.nextStep}\n\n`;
      });
    }
    
    if (caseReport.missedRisks.length > 0) {
      text += `#### ⚠️ 遗漏的风险点\n\n`;
      caseReport.missedRisks.forEach((risk) => {
        text += `- **${risk.title}**\n`;
        text += `  - 说明：${risk.humanDescription}\n`;
        text += `  - 应该从「${risk.triggerClueTitle}」中发现\n\n`;
      });
    }
  });
  
  text += `## ⚠️ 风险识别分析\n\n`;
  text += `| 风险类型 | 总数 | 已发现 | 识别率 |\n`;
  text += `|----------|------|--------|--------|\n`;
  riskAnalysis.forEach((r) => {
    text += `| ${r.label} | ${r.total} | ${r.discovered} | ${r.discoveryRate}% |\n`;
  });
  text += `\n`;
  
  text += `## 💡 改进建议\n\n`;
  suggestions.forEach((s, i) => {
    text += `${i + 1}. ${s}\n\n`;
  });
  
  text += `---\n\n`;
  text += `*此报告由「音乐版权拼案」游戏自动生成，用于培训和练习目的。*\n`;
  
  return text;
};

export const copyReportToClipboard = async (report: FinalReport): Promise<boolean> => {
  try {
    const text = formatReportAsText(report);
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const downloadReport = (report: FinalReport): void => {
  const text = formatReportAsText(report);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `音乐版权拼案报告_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
