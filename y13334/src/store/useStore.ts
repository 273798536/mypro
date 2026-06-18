import { create } from 'zustand';
import dayjs from 'dayjs';
import { MOCK_RECORDS, THRESHOLD_RULES, DEFAULT_FILTER } from '@/data/mockData';
import { ProductRecord, FilterConditions, DashboardStats, ExceptionStatus, AttributeStatus } from '@/types';

interface StoreState {
  allRecords: ProductRecord[];
  thresholdRules: typeof THRESHOLD_RULES;
  filter: FilterConditions;
  setFilter: (patch: Partial<FilterConditions>) => void;
  resetFilter: () => void;

  filteredRecords: ProductRecord[];
  exceptionRecords: {
    handled: ProductRecord[];
    pending_material: ProductRecord[];
    manual_overruled: ProductRecord[];
  };

  getStats: () => DashboardStats;
  getRecordById: (id: string) => ProductRecord | undefined;

  getInfluentialForAttribute: (attrName: string, status?: AttributeStatus) => ProductRecord[];
  getTopDeviationRecords: (limit?: number) => ProductRecord[];

  updateExceptionStatus: (recordId: string, newStatus: ExceptionStatus, note?: string) => void;
  addProcessLog: (
    recordId: string,
    log: Omit<import('@/types').ProcessLog, 'id' | 'timestamp'>
  ) => void;
}

function applyFilter(records: ProductRecord[], filter: FilterConditions): ProductRecord[] {
  return records.filter(r => {
    if (filter.dateRange) {
      const [start, end] = filter.dateRange;
      if (start && dayjs(r.batchDate).isBefore(dayjs(start), 'day')) return false;
      if (end && dayjs(r.batchDate).isAfter(dayjs(end), 'day')) return false;
    }
    if (filter.categories.length > 0 && !filter.categories.includes(r.category)) return false;
    if (filter.brands.length > 0 && !filter.brands.includes(r.brand)) return false;
    if (filter.statuses.length > 0 && !filter.statuses.includes(r.overallStatus)) return false;
    if (filter.evaluators.length > 0 && !filter.evaluators.includes(r.evaluator)) return false;
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      if (
        !r.productName.toLowerCase().includes(kw) &&
        !r.productId.toLowerCase().includes(kw) &&
        !r.id.toLowerCase().includes(kw)
      ) return false;
    }
    if (filter.attributeName) {
      const attr = r.attributes.find(a => a.name === filter.attributeName);
      if (!attr) return false;
      if (filter.attributeStatus && attr.status !== filter.attributeStatus) return false;
    }
    return true;
  });
}

export const useStore = create<StoreState>((set, get) => ({
  allRecords: MOCK_RECORDS,
  thresholdRules: THRESHOLD_RULES,
  filter: DEFAULT_FILTER,

  setFilter: (patch) => set(state => ({ filter: { ...state.filter, ...patch } })),
  resetFilter: () => set({ filter: DEFAULT_FILTER }),

  get filteredRecords() {
    return applyFilter(get().allRecords, get().filter);
  },

  get exceptionRecords() {
    const records = get().filteredRecords;
    return {
      handled: records.filter(r => r.exceptionStatus === 'handled'),
      pending_material: records.filter(r => r.exceptionStatus === 'pending_material'),
      manual_overruled: records.filter(r => r.exceptionStatus === 'manual_overruled'),
    };
  },

  getStats: () => {
    const records = get().filteredRecords;
    const total = records.length;
    const passCount = records.filter(r => r.overallStatus === 'pass').length;
    const warningCount = records.filter(r => r.overallStatus === 'warning').length;
    const failCount = records.filter(r => r.overallStatus === 'fail').length;
    const pendingCount = records.filter(r => r.overallStatus === 'pending').length;
    const passRate = total > 0 ? Math.round((passCount / total) * 1000) / 10 : 0;
    const avgScore = total > 0
      ? Math.round((records.reduce((s, r) => s + r.overallScore, 0) / total) * 10) / 10
      : 0;
    const manualOverrideCount = records.filter(r => r.finalConclusion.isManualOverride).length;

    const exceptionCounts = {
      handled: records.filter(r => r.exceptionStatus === 'handled').length,
      pending_material: records.filter(r => r.exceptionStatus === 'pending_material').length,
      manual_overruled: records.filter(r => r.exceptionStatus === 'manual_overruled').length,
    };

    const categoryMap = new Map<string, { total: number; pass: number; warning: number; fail: number }>();
    records.forEach(r => {
      const cur = categoryMap.get(r.category) || { total: 0, pass: 0, warning: 0, fail: 0 };
      cur.total++;
      cur[r.overallStatus === 'pending' ? 'warning' : r.overallStatus]++;
      categoryMap.set(r.category, cur);
    });
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, v]) => ({
      category, ...v,
    }));

    const attrMap = new Map<string, { pass: number; warning: number; fail: number; totalScore: number; count: number }>();
    records.forEach(r => {
      r.attributes.forEach(a => {
        const cur = attrMap.get(a.name) || { pass: 0, warning: 0, fail: 0, totalScore: 0, count: 0 };
        cur[a.status]++;
        cur.totalScore += a.score;
        cur.count++;
        attrMap.set(a.name, cur);
      });
    });
    const attributeBreakdown = Array.from(attrMap.entries()).map(([attribute, v]) => ({
      attribute,
      pass: v.pass,
      warning: v.warning,
      fail: v.fail,
      avgScore: Math.round((v.totalScore / v.count) * 10) / 10,
    }));

    const dateMap = new Map<string, { pass: number; warning: number; fail: number }>();
    records.forEach(r => {
      const d = r.batchDate;
      const cur = dateMap.get(d) || { pass: 0, warning: 0, fail: 0 };
      cur[r.overallStatus === 'pending' ? 'warning' : r.overallStatus]++;
      dateMap.set(d, cur);
    });
    const trendData = Array.from(dateMap.entries())
      .sort((a, b) => dayjs(a[0]).valueOf() - dayjs(b[0]).valueOf())
      .map(([date, v]) => ({ date, ...v }));

    const overallAvg = avgScore;
    const influentialRecords = records
      .filter(r => {
        if (r.influentialWeight < 1.5) {
          return Math.abs(r.overallScore - overallAvg) > 20;
        }
        return true;
      })
      .map(r => ({
        id: r.id,
        productName: r.productName,
        score: r.overallScore,
        weight: r.influentialWeight,
        impactOnOverall: Math.round((r.overallScore - overallAvg) * r.influentialWeight * 100) / 100,
        reason: r.overallScore < overallAvg
          ? `低于均值${Math.round((overallAvg - r.overallScore) * 10) / 10}分，${r.attributes.filter(a => a.status === 'fail').length}项属性异常`
          : `高于均值${Math.round((r.overallScore - overallAvg) * 10) / 10}分，主要拉高类目准确性`,
      }))
      .sort((a, b) => Math.abs(b.impactOnOverall) - Math.abs(a.impactOnOverall))
      .slice(0, 8);

    return {
      total, passCount, warningCount, failCount, pendingCount,
      passRate, avgScore, manualOverrideCount,
      exceptionCounts, categoryBreakdown, attributeBreakdown, trendData,
      influentialRecords,
    };
  },

  getRecordById: (id) => get().allRecords.find(r => r.id === id),

  getInfluentialForAttribute: (attrName, status) => {
    return get().filteredRecords
      .filter(r => {
        const a = r.attributes.find(x => x.name === attrName);
        if (!a) return false;
        if (status && a.status !== status) return false;
        return a.status !== 'pass';
      })
      .sort((a, b) => {
        const as = a.attributes.find(x => x.name === attrName)?.score || 0;
        const bs = b.attributes.find(x => x.name === attrName)?.score || 0;
        return as - bs;
      });
  },

  getTopDeviationRecords: (limit = 10) => {
    return get().filteredRecords
      .slice()
      .sort((a, b) => Math.abs(b.influentialWeight - 1) - Math.abs(a.influentialWeight - 1))
      .slice(0, limit);
  },

  updateExceptionStatus: (recordId, newStatus, note) => set(state => ({
    allRecords: state.allRecords.map(r =>
      r.id === recordId
        ? { ...r, exceptionStatus: newStatus, exceptionNote: note ?? r.exceptionNote }
        : r
    ),
  })),

  addProcessLog: (recordId, log) => set(state => ({
    allRecords: state.allRecords.map(r =>
      r.id === recordId
        ? {
            ...r,
            processLogs: [
              ...r.processLogs,
              { ...log, id: `${recordId}-log-${r.processLogs.length + 1}-${Date.now()}`, timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss') },
            ],
          }
        : r
    ),
  })),
}));
