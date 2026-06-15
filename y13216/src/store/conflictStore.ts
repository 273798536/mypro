import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ConflictRecord,
  ConflictStatus,
  FilterState,
  HistoryAction,
  HistoryEntry,
} from '@/types';
import { STATUS_LABEL, HISTORY_ACTION_LABEL } from '@/types';
import { initialMockRecords } from '@/data/mockData';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const defaultFilters: FilterState = {
  searchKeyword: '',
  trackFilter: 'all',
  dateRangeStart: '',
  dateRangeEnd: '',
  statusFilter: 'all',
  handlerFilter: 'all',
};

const DEFAULT_OPERATOR = '林姐';

function pushHistory(record: ConflictRecord, entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry[] {
  return [
    ...record.history,
    {
      id: uid(),
      timestamp: now(),
      ...entry,
    },
  ];
}

interface ConflictStore {
  records: ConflictRecord[];
  filters: FilterState;
  expandedRowId: string | null;
  activeStatusTab: 'all' | ConflictStatus;
  flashingRowId: string | null;

  setFilters: (f: Partial<FilterState>) => void;
  resetFilters: () => void;
  setActiveStatusTab: (t: 'all' | ConflictStatus) => void;
  setExpandedRowId: (id: string | null) => void;
  clearFlash: () => void;

  getFilteredRecords: () => ConflictRecord[];
  getStatistics: () => {
    total: number;
    resolved: number;
    pendingEvidence: number;
    pendingConfirm: number;
  };
  getRecordsForActiveTab: () => ConflictRecord[];
  getAllTracks: () => string[];
  getAllHandlers: () => string[];
  getRecordById: (id: string) => ConflictRecord | undefined;

  updateRemark: (id: string, newRemark: string, operator?: string) => void;
  overrideAnnotation: (id: string, newRemark: string, reason: string, operator?: string) => void;
  appendSupplementaryNote: (id: string, content: string, operator?: string) => void;
  changeStatus: (id: string, status: ConflictStatus, reason?: string, operator?: string) => void;
  confirmPending: (id: string, operator?: string) => void;

  generateMarkdownReport: () => string;
}

export const useConflictStore = create<ConflictStore>()(
  persist(
    (set, get) => ({
      records: initialMockRecords,
      filters: defaultFilters,
      expandedRowId: null,
      activeStatusTab: 'all',
      flashingRowId: null,

      setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
      resetFilters: () => set({ filters: defaultFilters }),
      setActiveStatusTab: (t) => set({ activeStatusTab: t }),
      setExpandedRowId: (id) => set({ expandedRowId: id }),
      clearFlash: () => set({ flashingRowId: null }),

      getFilteredRecords: () => {
        const { records, filters } = get();
        return records.filter((r) => {
          if (filters.searchKeyword) {
            const kw = filters.searchKeyword.toLowerCase();
            const hay = (r.title + r.conflictSummary + r.handler + r.currentRemark).toLowerCase();
            if (!hay.includes(kw)) return false;
          }
          if (filters.trackFilter && filters.trackFilter !== 'all' && r.title !== filters.trackFilter) return false;
          if (filters.handlerFilter && filters.handlerFilter !== 'all' && r.handler !== filters.handlerFilter) return false;
          if (filters.statusFilter !== 'all' && r.status !== filters.statusFilter) return false;
          if (filters.dateRangeStart && r.date < filters.dateRangeStart) return false;
          if (filters.dateRangeEnd && r.date > filters.dateRangeEnd) return false;
          return true;
        });
      },

      getStatistics: () => {
        const list = get().getFilteredRecords();
        return {
          total: list.length,
          resolved: list.filter((r) => r.status === 'resolved').length,
          pendingEvidence: list.filter((r) => r.status === 'pending_evidence').length,
          pendingConfirm: list.filter((r) => r.status === 'pending_confirm').length,
        };
      },

      getRecordsForActiveTab: () => {
        const list = get().getFilteredRecords();
        const tab = get().activeStatusTab;
        if (tab === 'all') return list;
        return list.filter((r) => r.status === tab);
      },

      getAllTracks: () => Array.from(new Set(get().records.map((r) => r.title))).sort(),
      getAllHandlers: () => Array.from(new Set(get().records.map((r) => r.handler))).sort(),
      getRecordById: (id) => get().records.find((r) => r.id === id),

      updateRemark: (id, newRemark, operator = DEFAULT_OPERATOR) => {
        const state = get();
        const rec = state.records.find((r) => r.id === id);
        if (!rec) return;
        if (rec.currentRemark && rec.currentRemark.trim() !== newRemark.trim()) {
          get().overrideAnnotation(id, newRemark, '修改备注时检测到旧判断，自动走覆盖→挂起流程', operator);
          return;
        }
        set((state) => {
          const action: HistoryAction = rec.currentRemark ? 'annotation_override' : 'remark_edit';
          const records = state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  currentRemark: newRemark,
                  updatedAt: now(),
                  history: pushHistory(r, {
                    operator,
                    action,
                    fromValue: rec.currentRemark || undefined,
                    toValue: newRemark,
                  }),
                }
              : r
          );
          return { records };
        });
      },

      overrideAnnotation: (id, newRemark, reason, operator = DEFAULT_OPERATOR) =>
        set((state) => {
          const rec = state.records.find((r) => r.id === id);
          if (!rec) return {};
          const records = state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  currentRemark: newRemark,
                  status: 'pending_confirm' as ConflictStatus,
                  updatedAt: now(),
                  history: pushHistory(r, {
                    operator,
                    action: 'annotation_override',
                    fromValue: rec.currentRemark || undefined,
                    toValue: newRemark,
                    reason,
                  }),
                }
              : r
          );
          return { records, flashingRowId: id };
        }),

      appendSupplementaryNote: (id, content, operator = DEFAULT_OPERATOR) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  supplementaryNotes: [
                    ...r.supplementaryNotes,
                    { id: uid(), content, operator, timestamp: now() },
                  ],
                  updatedAt: now(),
                  history: pushHistory(r, {
                    operator,
                    action: 'append_note',
                    toValue: `追加后补说明："${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`,
                  }),
                }
              : r
          ),
        })),

      changeStatus: (id, status, reason, operator = DEFAULT_OPERATOR) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  updatedAt: now(),
                  history: pushHistory(r, {
                    operator,
                    action: 'status_change',
                    fromValue: r.status,
                    toValue: status,
                    reason,
                  }),
                }
              : r
          ),
        })),

      confirmPending: (id, operator = DEFAULT_OPERATOR) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'pending_evidence',
                  updatedAt: now(),
                  history: pushHistory(r, {
                    operator,
                    action: 'confirm_pending',
                    fromValue: 'pending_confirm',
                    toValue: 'pending_evidence',
                    reason: '现场老师二次确认解除挂起',
                  }),
                }
              : r
          ),
        })),

      generateMarkdownReport: () => {
        const stats = get().getStatistics();
        const list = get().getFilteredRecords();
        const filters = get().filters;

        const filterDesc = [];
        if (filters.searchKeyword) filterDesc.push(`关键字：${filters.searchKeyword}`);
        if (filters.trackFilter !== 'all') filterDesc.push(`曲目：${filters.trackFilter}`);
        if (filters.handlerFilter !== 'all') filterDesc.push(`处理人：${filters.handlerFilter}`);
        if (filters.statusFilter !== 'all') filterDesc.push(`状态：${STATUS_LABEL[filters.statusFilter as ConflictStatus]}`);
        if (filters.dateRangeStart) filterDesc.push(`起始日期：${filters.dateRangeStart}`);
        if (filters.dateRangeEnd) filterDesc.push(`结束日期：${filters.dateRangeEnd}`);

        let md = `# 版权授权排期冲突报告

> 生成时间：${now()}
> 报告范围：${filterDesc.length ? filterDesc.join(' · ') : '全部记录'}

## 一、整体统计

| 指标 | 数量 | 占比 |
|------|------|------|
| 筛选后总数 | **${stats.total}** | 100% |
| ✅ 已处理 | **${stats.resolved}** | ${stats.total ? ((stats.resolved / stats.total * 100).toFixed(1)) : '0.0'}% |
| ⚠️ 需补证据 | **${stats.pendingEvidence}** | ${stats.total ? ((stats.pendingEvidence / stats.total * 100).toFixed(1)) : '0.0'}% |
| 🔴 挂起待确认 | **${stats.pendingConfirm}** | ${stats.total ? ((stats.pendingConfirm / stats.total * 100).toFixed(1)) : '0.0'}% |

---

## 二、明细清单

`;

        list.forEach((r, idx) => {
          const statusEmoji =
            r.status === 'resolved' ? '✅' : r.status === 'pending_evidence' ? '⚠️' : '🔴';
          md += `### ${idx + 1}. ${r.title}　${statusEmoji} **${STATUS_LABEL[r.status]}**

- **排期日期**：${r.date}
- **处理人**：${r.handler}
- **冲突简述**：${r.conflictSummary}
- **当前备注**：${r.currentRemark || '（无）'}

**正常处理记录**：
> ${r.normalRecord}

${r.supplementaryNotes.length ? '**后补说明**：\n' : ''}${r.supplementaryNotes.map((n) => `- [${n.timestamp}] ${n.operator}：${n.content}`).join('\n')}${r.supplementaryNotes.length ? '\n' : ''}
**证据（${r.screenshots.length} 份截图占位）**：
${r.screenshots.map((s) => `- \`${s.name}\`｜来源：${s.sourceGroup}｜时间：${s.timestamp}｜${s.description}`).join('\n')}

**变更历史（${r.history.length} 条）**：
${r.history.map((h) => `- [${h.timestamp}] ${h.operator} → **${HISTORY_ACTION_LABEL[h.action]}**${h.reason ? `（${h.reason}）` : ''}${h.fromValue ? ` \`${h.fromValue}\` → ` : ''}${h.toValue ? `\`${h.toValue}\`` : ''}`).join('\n')}

---

`;
        });

        md += `
## 三、交付说明

本报告、截图材料清单与处理记录为**同一数据源**生成，三者一一对应。
林姐交付时请同时携带：

1. \`screenshots/\` 文件夹：每条冲突对应的排练群截图与证据图片
2. \`records/\` 文件夹：处理记录与后补说明的纸质单据扫描件
3. 本 Markdown 报告（\`report.md\`）

**使用提示**：
- 挂起待确认项（🔴）请**务必让现场老师二次确认**后再计入已完成
- 所有变更均已写入历史，右键查看单条冲突详情可追溯完整时间线
`;

        return md;
      },
    }),
    {
      name: 'copyright-conflict-store',
    }
  )
);
