import { create } from 'zustand';
import type { Container, WaiverRule, OperationLog, AppFilters } from '@/types';
import { mockContainers, mockRules, mockOperationLogs, CURRENT_OPERATOR, TODAY } from '@/data/mockData';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function now() {
  return new Date().toISOString();
}

interface AppState {
  containers: Container[];
  rules: WaiverRule[];
  operationLogs: OperationLog[];
  filters: AppFilters;
  selectedContainerIds: string[];
  drawerOpen: boolean;
  drawerContainerId: string | null;

  init: () => void;
  updateFilters: (f: Partial<AppFilters>) => void;
  resetFilters: () => void;
  getFilteredContainers: () => Container[];
  toggleSelectContainer: (id: string) => void;
  selectAllContainers: () => void;
  clearSelection: () => void;
  confirmContainer: (id: string, note?: string) => void;
  batchConfirm: (note?: string) => void;
  addNote: (containerId: string, note: string) => void;
  openDrawer: (containerId: string) => void;
  closeDrawer: () => void;
  updateRule: (ruleId: string, updates: Partial<Pick<WaiverRule, 'value'>>, reason: string) => void;
  markExpiredWaivers: () => void;
  addOperationLog: (log: Omit<OperationLog, 'id' | 'operatedAt'>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  containers: mockContainers,
  rules: mockRules,
  operationLogs: mockOperationLogs,
  filters: {},
  selectedContainerIds: [],
  drawerOpen: false,
  drawerContainerId: null,

  init: () => {
    get().markExpiredWaivers();
  },

  updateFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: {} }),

  getFilteredContainers: () => {
    const { containers, filters } = get();
    return containers.filter((c) => {
      if (filters.containerNo && !c.containerNo.toLowerCase().includes(filters.containerNo.toLowerCase())) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.waiverStatus && c.waiverStatus !== filters.waiverStatus) return false;
      if (filters.inspectionStatus && c.inspectionStatus !== filters.inspectionStatus) return false;
      if (filters.dateFrom && c.arrivalDate < filters.dateFrom) return false;
      if (filters.dateTo && c.departureDate > filters.dateTo) return false;
      return true;
    });
  },

  toggleSelectContainer: (id) =>
    set((s) => ({
      selectedContainerIds: s.selectedContainerIds.includes(id)
        ? s.selectedContainerIds.filter((x) => x !== id)
        : [...s.selectedContainerIds, id],
    })),

  selectAllContainers: () =>
    set((s) => ({ selectedContainerIds: get().getFilteredContainers().map((c) => c.id) })),

  clearSelection: () => set({ selectedContainerIds: [] }),

  confirmContainer: (id, note) =>
    set((s) => ({
      containers: s.containers.map((c) =>
        c.id === id
          ? { ...c, status: 'confirmed' as const, updatedAt: now() }
          : c
      ),
      operationLogs: [
        ...s.operationLogs,
        {
          id: generateId(),
          containerId: id,
          operationType: 'confirm',
          operator: CURRENT_OPERATOR,
          detail: `确认减免核算${note ? '，备注：' + note : ''}`,
          operatedAt: now(),
          note,
        },
      ],
    })),

  batchConfirm: (note) => {
    const { selectedContainerIds } = get();
    const ts = now();
    set((s) => ({
      containers: s.containers.map((c) =>
        selectedContainerIds.includes(c.id) && c.status === 'pending'
          ? { ...c, status: 'confirmed' as const, updatedAt: ts }
          : c
      ),
      operationLogs: [
        ...s.operationLogs,
        ...selectedContainerIds.map((cid) => ({
          id: generateId(),
          containerId: cid,
          operationType: 'confirm' as const,
          operator: CURRENT_OPERATOR,
          detail: `批量确认减免核算${note ? '，备注：' + note : ''}`,
          operatedAt: ts,
          note,
        })),
      ],
      selectedContainerIds: [],
    }));
  },

  addNote: (containerId, note) =>
    set((s) => ({
      containers: s.containers.map((c) =>
        c.id === containerId ? { ...c, updatedAt: now() } : c
      ),
      operationLogs: [
        ...s.operationLogs,
        {
          id: generateId(),
          containerId,
          operationType: 'note' as const,
          operator: CURRENT_OPERATOR,
          detail: note,
          operatedAt: now(),
          note,
        },
      ],
    })),

  openDrawer: (containerId) => set({ drawerOpen: true, drawerContainerId: containerId }),
  closeDrawer: () => set({ drawerOpen: false, drawerContainerId: null }),

  updateRule: (ruleId, updates, reason) => {
    const ts = now();
    set((s) => {
      const rule = s.rules.find((r) => r.id === ruleId);
      if (!rule) return s;

      const changeLog = {
        id: generateId(),
        ruleId,
        fieldName: 'value',
        oldValue: String(rule.value),
        newValue: String(updates.value),
        changeReason: reason,
        changedBy: CURRENT_OPERATOR,
        changedAt: ts,
        affectedContainerIds: s.containers
          .filter((c) => c.waiverStatus === 'approved' && c.inspectionStatus !== 'none')
          .map((c) => c.id),
      };

      const affectedContainers = s.containers.filter(
        (c) => c.waiverStatus === 'approved' && c.inspectionStatus !== 'none'
      );

      const updatedContainers = s.containers.map((c) => {
        if (!changeLog.affectedContainerIds.includes(c.id)) return c;
        const oldWaived = c.waivedFee;
        const inspectionDays = c.inspectionRecords.reduce((sum, ir) => sum + ir.durationDays, 0);
        const dailyRate = c.storageRecords[0]?.dailyRate ?? 150;
        const newWaived = dailyRate * inspectionDays * (Number(updates.value) / 100);
        const newFinal = c.originalFee - newWaived;
        return {
          ...c,
          waivedFee: Math.round(newWaived),
          finalFee: Math.round(newFinal),
          affectedByRuleChange: `规则v${rule.version}→v${rule.version + 1}变更：减免比例从${rule.value}%调整为${updates.value}%，减免金额从¥${oldWaived}变为¥${Math.round(newWaived)}`,
          updatedAt: ts,
        };
      });

      return {
        rules: s.rules.map((r) =>
          r.id === ruleId
            ? { ...r, ...updates, version: r.version + 1, changeLogs: [...r.changeLogs, changeLog] }
            : r
        ),
        containers: updatedContainers,
        operationLogs: [
          ...s.operationLogs,
          {
            id: generateId(),
            operationType: 'rule_change' as const,
            operator: CURRENT_OPERATOR,
            detail: `规则"${rule.ruleName}"变更：${changeLog.fieldName}从${changeLog.oldValue}调整为${changeLog.newValue}，原因：${reason}，影响${affectedContainers.length}条记录`,
            operatedAt: ts,
          },
        ],
      };
    });
  },

  markExpiredWaivers: () =>
    set((s) => ({
      containers: s.containers.map((c) => {
        const expiredApps = c.waiverApplications.filter(
          (wa) => wa.status === 'approved' && wa.expireDate < TODAY
        );
        if (expiredApps.length === 0) return c;

        const updatedApps = c.waiverApplications.map((wa) =>
          wa.status === 'approved' && wa.expireDate < TODAY
            ? {
                ...wa,
                status: 'expired' as const,
                auditTrail: [
                  ...wa.auditTrail,
                  {
                    timestamp: now(),
                    actor: '系统',
                    action: '减免过期',
                    oldValue: 'approved',
                    newValue: 'expired',
                    remark: '减免有效期已过，自动标记过期',
                  },
                ],
              }
            : wa
        );

        return {
          ...c,
          waiverStatus: 'expired' as const,
          waiverApplications: updatedApps,
          waivedFee: 0,
          finalFee: c.originalFee,
          updatedAt: now(),
        };
      }),
    })),

  addOperationLog: (log) =>
    set((s) => ({
      operationLogs: [
        ...s.operationLogs,
        { ...log, id: generateId(), operatedAt: now() },
      ],
    })),
}));
