import type { Clue, Case, Risk, VerdictDecision, ScoreBreakdown } from '@/types';

export const calculateScore = (breakdown: ScoreBreakdown): number => {
  return (
    breakdown.correctAssociation +
    breakdown.wrongAssociation +
    breakdown.correctVerdict +
    breakdown.wrongVerdict +
    breakdown.timePenalty +
    breakdown.timeBonus +
    breakdown.riskDiscovered +
    breakdown.incompletePenalty
  );
};

export const validateClueAssociation = (clue: Clue, caseId: string): boolean => {
  return clue.correctCaseId === caseId;
};

export const checkRiskTrigger = (clue: Clue, risks: Risk[]): Risk | undefined => {
  if (!clue.triggerRisk) return undefined;
  return risks.find((r) => r.id === clue.triggerRisk);
};

export const canSubmitVerdict = (caseItem: Case): boolean => {
  const assignedClues = caseItem.clues.filter((c) => c.currentCaseId === caseItem.id);
  const hasRequiredTypes = caseItem.requiredClueTypes.every((type) =>
    assignedClues.some((c) => c.type === type)
  );
  return hasRequiredTypes && assignedClues.length >= caseItem.requiredClueCount;
};

export const checkVerdict = (
  caseItem: Case,
  userVerdict: VerdictDecision
): { isCorrect: boolean; explanation: string } => {
  const isCorrect = userVerdict === caseItem.correctVerdict;
  return {
    isCorrect,
    explanation: isCorrect
      ? `判定正确！${caseItem.verdictExplanation}`
      : `判定有误。正确答案是"${userVerdict === caseItem.correctVerdict ? '授权通过' : userVerdict === 'reject' ? '驳回申请' : '需补充材料'}"。${caseItem.verdictExplanation}`,
  };
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getGrade = (score: number): { grade: string; color: string } => {
  const thresholds = [
    { grade: 'S', min: 400, color: '#D4AF37' },
    { grade: 'A', min: 300, color: '#10B981' },
    { grade: 'B', min: 200, color: '#3B82F6' },
    { grade: 'C', min: 100, color: '#F59E0B' },
    { grade: 'D', min: -Infinity, color: '#EF4444' },
  ];
  return thresholds.find((t) => score >= t.min) || thresholds[thresholds.length - 1];
};

export const getRiskHumanDescription = (risk: Risk): string => {
  const templates: Record<string, (r: Risk) => string> = {
    auth_expired: (r) => {
      const match = r.description.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
      const date = match ? match[1] : '某个日期';
      return `这首歌的授权合同在${date}就已经到期了，相当于租房合同过期了还在住，是侵权的。`;
    },
    sample_exceed: (r) => {
      return '采样时间超过了合同约定的上限，属于超范围使用，就像跟朋友说借100块结果拿了200块，肯定不行。';
    },
    name_confusion: () => {
      return '有两首同名但完全不同的歌，授权材料张冠李戴了，就像拿张三的身份证去给李四办业务。';
    },
    missing_evidence: () => {
      return '现在手里的材料还不够判，得去补充更多证据才能做决定。';
    },
  };
  return templates[risk.type]?.(risk) || risk.description;
};

export const generateCaseReport = (caseItem: Case): string => {
  const verdictText = caseItem.userVerdict === 'approve' 
    ? '授权通过' 
    : caseItem.userVerdict === 'reject' 
      ? '驳回申请' 
      : '需补充材料';
  const correctVerdictText = caseItem.correctVerdict === 'approve'
    ? '授权通过'
    : caseItem.correctVerdict === 'reject'
      ? '驳回申请'
      : '需补充材料';
  const isCorrect = caseItem.userVerdict === caseItem.correctVerdict;
  
  const discoveredRisks = caseItem.risks.filter((r) => r.isDiscovered);
  const missedRisks = caseItem.risks.filter((r) => !r.isDiscovered);
  
  let report = `## ${caseItem.title}\n\n`;
  report += `**你的判定**：${verdictText}\n`;
  report += `**正确答案**：${correctVerdictText}\n`;
  report += `**结果**：${isCorrect ? '✅ 判定正确' : '❌ 判定有误'}\n\n`;
  
  report += `### 人话解释\n\n${caseItem.humanVerdictExplanation}\n\n`;
  
  if (discoveredRisks.length > 0) {
    report += `### ✅ 发现的风险点\n\n`;
    discoveredRisks.forEach((risk) => {
      report += `- **${risk.title}**：${getRiskHumanDescription(risk)}\n`;
      report += `  触发材料：${caseItem.clues.find((c) => c.id === risk.triggerClueId)?.title || '未知'}\n`;
      report += `  下一步：${risk.nextStep}\n\n`;
    });
  }
  
  if (missedRisks.length > 0) {
    report += `### ⚠️ 遗漏的风险点\n\n`;
    missedRisks.forEach((risk) => {
      report += `- **${risk.title}**：${getRiskHumanDescription(risk)}\n`;
      report += `  应该从"${caseItem.clues.find((c) => c.id === risk.triggerClueId)?.title || '某份材料'}"中发现\n\n`;
    });
  }
  
  return report;
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
