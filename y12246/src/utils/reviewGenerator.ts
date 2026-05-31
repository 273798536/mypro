import { CashFlowCell, OperationTrace, BondCard, AnnouncementEvent, Level } from '../types';

export interface SettlementSummary {
  totalExpected: number;
  totalActual: number;
  confirmedCount: number;
  delayedCount: number;
  defaultCount: number;
  missedCount: number;
  putOptionCount: number;
}

export interface EventBranch {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userChoice: string;
  correctChoice: string;
  isCorrect: boolean;
  consequences: string[];
}

export interface ReviewData {
  bondCard: BondCard;
  cashFlows: CashFlowCell[];
  traces: OperationTrace[];
  events: AnnouncementEvent[];
  settlement: SettlementSummary;
  eventBranches: EventBranch[];
  finalScore: number;
  levelName: string;
}

export const generateSettlementSummary = (cashFlows: CashFlowCell[]): SettlementSummary => {
  const summary: SettlementSummary = {
    totalExpected: 0,
    totalActual: 0,
    confirmedCount: 0,
    delayedCount: 0,
    defaultCount: 0,
    missedCount: 0,
    putOptionCount: 0,
  };

  cashFlows.forEach(cf => {
    summary.totalExpected += cf.expectedAmount;
    summary.totalActual += cf.actualAmount || 0;

    switch (cf.status) {
      case 'confirmed':
        summary.confirmedCount++;
        break;
      case 'delayed':
        summary.delayedCount++;
        break;
      case 'default':
        summary.defaultCount++;
        break;
      case 'missed':
        summary.missedCount++;
        break;
      case 'put_option':
        summary.putOptionCount++;
        break;
    }
  });

  return summary;
};

export const generateEventBranches = (
  events: AnnouncementEvent[],
  selectedAnswers: Record<string, number>,
  traces: OperationTrace[]
): EventBranch[] => {
  return events.map(event => {
    const userChoiceIndex = selectedAnswers[event.id] ?? -1;
    const userChoice = userChoiceIndex >= 0 ? event.options[userChoiceIndex] : '未作答';
    const correctChoice = event.options[event.correctOptionIndex];
    const isCorrect = userChoiceIndex === event.correctOptionIndex;

    const relatedTraces = traces.filter(t => t.content.includes(event.title));
    const consequences = relatedTraces.map(t => `${t.isCorrect ? '✅' : '❌'} ${t.content}`);

    return {
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      userChoice,
      correctChoice,
      isCorrect,
      consequences,
    };
  });
};

export const generateReviewData = (
  level: Level,
  cashFlows: CashFlowCell[],
  traces: OperationTrace[],
  selectedAnswers: Record<string, number>,
  finalScore: number
): ReviewData => {
  return {
    bondCard: level.bondCard,
    cashFlows,
    traces,
    events: level.events,
    settlement: generateSettlementSummary(cashFlows),
    eventBranches: generateEventBranches(level.events, selectedAnswers, traces),
    finalScore,
    levelName: level.name,
  };
};

export const generateReportContent = (reviewData: ReviewData): string => {
  const { bondCard, cashFlows, settlement, eventBranches, finalScore, levelName } = reviewData;

  let report = `
═══════════════════════════════════════════════════════════
              债券兑付时间线游戏 - 复盘报告
═══════════════════════════════════════════════════════════

【关卡信息】
关卡名称：${levelName}
最终得分：${finalScore}分

═══════════════════════════════════════════════════════════

【债券卡信息】
债券名称：${bondCard.name}
债券代码：${bondCard.code}
发行主体：${bondCard.issuer}
债券评级：${bondCard.rating}
票面金额：${bondCard.faceValue}元
票面利率：${bondCard.couponRate}%
到期日期：${bondCard.maturityDate}

═══════════════════════════════════════════════════════════

【现金流结算明细】
${cashFlows.map((cf, index) => `
  ${index + 1}. 第${cf.period}期 - ${cf.type === 'coupon' ? '付息' : cf.type === 'put' ? '回售' : '兑付本金'}
     ├─ 原日期：${cf.originalDate}
     ├─ 现日期：${cf.date}
     ├─ 预期金额：${cf.expectedAmount}元
     ├─ 实际金额：${cf.actualAmount ?? '-'}元
     └─ 状态：${cf.status}
`).join('')}

【结算汇总】
预期总金额：${settlement.totalExpected.toFixed(2)}元
实际总金额：${settlement.totalActual.toFixed(2)}元
已确认：${settlement.confirmedCount}笔
已顺延：${settlement.delayedCount}笔
违约：${settlement.defaultCount}笔
已放弃：${settlement.missedCount}笔
回售选择：${settlement.putOptionCount}笔

═══════════════════════════════════════════════════════════

【事件分支分析】
${eventBranches.map((branch, index) => `
  事件${index + 1}：${branch.eventTitle}
  日期：${branch.eventDate}
  用户选择：${branch.userChoice} ${branch.isCorrect ? '✅ 正确' : '❌ 错误'}
  正确选择：${branch.correctChoice}
  影响：
  ${branch.consequences.map(c => `    • ${c}`).join('\n')}
`).join('')}

═══════════════════════════════════════════════════════════

【债券卡 ↔ 现金流格 ↔ 公告事件 对应关系】

${cashFlows.map(cf => `
  现金流格 [${cf.id}]
  ├─ 类型：${cf.type === 'coupon' ? '付息' : cf.type === 'put' ? '回售' : '本金兑付'}
  ├─ 来源：债券卡 ${cf.type === 'coupon' ? '付息日' : cf.type === 'put' ? '回售权' : '到期日'} 约定
  ├─ 关联事件：
  ${eventBranches
    .filter(eb => 
      eb.eventTitle.includes('付息') || 
      (cf.type === 'put' && eb.eventTitle.includes('回售')) ||
      eb.eventTitle.includes('兑付')
    )
    .map(eb => `    • ${eb.eventTitle} (${eb.isCorrect ? '正确处理' : '待复核'})`)
    .join('\n') || '    • 无直接关联事件'}
`).join('')}

═══════════════════════════════════════════════════════════
                      报告生成完毕
═══════════════════════════════════════════════════════════
`;

  return report;
};

export const downloadReport = (reviewData: ReviewData): void => {
  const content = generateReportContent(reviewData);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `债券兑付复盘报告_${reviewData.bondCard.code}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
