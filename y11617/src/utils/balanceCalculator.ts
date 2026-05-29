import { format, parseISO, addDays } from 'date-fns';
import type { CashflowEntry, DailySummary, AccountSettings, StressLevel } from '../types';

export function formatMoney(amount: number, currency: string = '¥'): string {
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return `${currency}${amount < 0 ? '-' : ''}${formatted}`;
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'yyyy年MM月dd日');
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MM/dd');
  } catch {
    return dateStr;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function calculateDailySummaries(
  entries: CashflowEntry[],
  settings: AccountSettings,
  startDate: string,
  days: number
): DailySummary[] {
  const summaries: DailySummary[] = [];
  let balance = settings.initialBalance;

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < days; i++) {
    const currentDate = format(addDays(parseISO(startDate), i), 'yyyy-MM-dd');
    const dayEntries = sortedEntries.filter(e => e.date === currentDate);

    const inflow = dayEntries
      .filter(e => e.direction === 'in')
      .reduce((sum, e) => sum + e.amount, 0);

    const outflow = dayEntries
      .filter(e => e.direction === 'out')
      .reduce((sum, e) => sum + e.amount, 0);

    balance += inflow - outflow;

    const netAmount = inflow - outflow;

    summaries.push({
      date: currentDate,
      inflow,
      outflow,
      netAmount,
      balance,
      entries: dayEntries,
      stressLevel: 'none',
      stressReasons: []
    });
  }

  return summaries;
}

export function getBalanceForecast(
  entries: CashflowEntry[],
  settings: AccountSettings,
  days: number
): { date: string; balance: number }[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const summaries = calculateDailySummaries(entries, settings, today, days);
  return summaries.map(s => ({ date: s.date, balance: s.balance }));
}

export function detectStress(
  day: DailySummary,
  allDays: DailySummary[],
  settings: AccountSettings
): { level: StressLevel; reasons: string[] } {
  const reasons: string[] = [];

  const delayedReceivables = day.entries.filter(e => e.type === 'receivable' && e.isDelayed);
  if (delayedReceivables.length > 0) {
    reasons.push(`${delayedReceivables.length}笔回款延期`);
  }

  const avgDailyOutflow = allDays.length > 0
    ? allDays.reduce((sum, d) => sum + d.outflow, 0) / allDays.length
    : 0;
  if (day.outflow > avgDailyOutflow * 2 && day.outflow > 0 && avgDailyOutflow > 0) {
    reasons.push(`大额流出(${formatMoney(day.outflow)})超日均2倍`);
  }

  if (day.balance < settings.safetyLine) {
    reasons.push(`余额(${formatMoney(day.balance)})低于安全线(${formatMoney(settings.safetyLine)})`);
  }

  const highPriorityEntries = day.entries.filter(e => e.priority === 'high' && e.direction === 'out');
  if (highPriorityEntries.length >= 2) {
    reasons.push(`${highPriorityEntries.length}笔高优先级支出撞日`);
  }

  if (day.balance < settings.safetyLine) {
    const delayedEntries = day.entries.filter(e => e.isDelayed);
    if (delayedEntries.length > 0) {
      reasons.push('延期导致余额穿透');
    }
  }

  const level: StressLevel = reasons.some(r => r.includes('穿透') || r.includes('大额'))
    ? 'danger'
    : reasons.length > 0
      ? 'warning'
      : 'none';

  return { level, reasons };
}

export function applyStressDetection(
  summaries: DailySummary[],
  settings: AccountSettings
): DailySummary[] {
  return summaries.map(summary => {
    const { level, reasons } = detectStress(summary, summaries, settings);
    return { ...summary, stressLevel: level, stressReasons: reasons };
  });
}

export function createSampleEntries(): CashflowEntry[] {
  const today = new Date();
  const entries: Omit<CashflowEntry, 'id' | 'createdAt' | 'updatedAt' | 'revisionHistory'>[] = [
    {
      type: 'salary',
      direction: 'out',
      amount: 85000,
      date: format(addDays(today, 5), 'yyyy-MM-dd'),
      description: '5月工资发放',
      priority: 'high',
      source: '付款计划',
      isDelayed: false
    },
    {
      type: 'rent',
      direction: 'out',
      amount: 12000,
      date: format(addDays(today, 5), 'yyyy-MM-dd'),
      description: '办公室房租',
      priority: 'high',
      source: '付款计划',
      isDelayed: false
    },
    {
      type: 'loan',
      direction: 'out',
      amount: 35000,
      date: format(addDays(today, 10), 'yyyy-MM-dd'),
      description: '银行贷款月供',
      priority: 'high',
      source: '付款计划',
      isDelayed: false
    },
    {
      type: 'receivable',
      direction: 'in',
      amount: 120000,
      date: format(addDays(today, 3), 'yyyy-MM-dd'),
      description: 'A公司项目回款',
      priority: 'high',
      source: '回款预测',
      isDelayed: false
    },
    {
      type: 'receivable',
      direction: 'in',
      amount: 80000,
      date: format(addDays(today, 8), 'yyyy-MM-dd'),
      description: 'B公司服务费',
      priority: 'medium',
      source: '回款预测',
      isDelayed: true,
      delayNote: '客户反馈需延迟3天',
      originalDate: format(addDays(today, 5), 'yyyy-MM-dd')
    },
    {
      type: 'tax',
      direction: 'out',
      amount: 18000,
      date: format(addDays(today, 15), 'yyyy-MM-dd'),
      description: '增值税申报',
      priority: 'high',
      source: '付款计划',
      isDelayed: false
    },
    {
      type: 'receivable',
      direction: 'in',
      amount: 65000,
      date: format(addDays(today, 20), 'yyyy-MM-dd'),
      description: 'C公司尾款',
      priority: 'medium',
      source: '回款预测',
      isDelayed: false
    },
    {
      type: 'salary',
      direction: 'out',
      amount: 85000,
      date: format(addDays(today, 35), 'yyyy-MM-dd'),
      description: '6月工资发放',
      priority: 'high',
      source: '付款计划',
      isDelayed: false
    },
    {
      type: 'rent',
      direction: 'out',
      amount: 12000,
      date: format(addDays(today, 35), 'yyyy-MM-dd'),
      description: '办公室房租',
      priority: 'high',
      source: '付款计划',
      isDelayed: false
    },
    {
      type: 'other',
      direction: 'out',
      amount: 8000,
      date: format(addDays(today, 12), 'yyyy-MM-dd'),
      description: '服务器费用',
      priority: 'low',
      source: '付款计划',
      isDelayed: false
    }
  ];

  const now = new Date().toISOString();
  return entries.map(e => ({
    ...e,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    revisionHistory: []
  }));
}