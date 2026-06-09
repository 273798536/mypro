import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CondProbParam, ChangeLog, DataStatus, ReviewStatus, ImportConflict } from '@/types';
import { SAMPLE_PARAMS } from '@/data/sampleData';
import { generateId, normalizeKey, calcProbability, generateExplanation } from '@/utils';

interface CondProbState {
  params: CondProbParam[];
  changelogs: ChangeLog[];
  filterStatus: DataStatus | 'all';
  showSampleBanner: boolean;
  expandedParamId: string | null;
  importConflicts: ImportConflict[];
  editingParam: CondProbParam | null;
  boundaryOnly: boolean;

  initSample: () => void;
  resetToSample: () => void;
  dismissSampleBanner: () => void;
  setFilterStatus: (s: DataStatus | 'all') => void;
  toggleBoundaryOnly: () => void;
  setExpandedParamId: (id: string | null) => void;
  setEditingParam: (p: CondProbParam | null) => void;

  addParam: (data: Partial<CondProbParam>) => void;
  updateParam: (id: string, patch: Partial<CondProbParam>, reason?: string) => void;
  deleteParam: (id: string) => void;

  updateStatus: (id: string, status: DataStatus, reason: string) => void;
  approveParam: (id: string, reason: string) => void;
  rejectParam: (id: string, reason: string) => void;
  toggleBoundary: (id: string, note?: string) => void;

  prepareImport: (incoming: CondProbParam[]) => ImportConflict[];
  resolveConflict: (idx: number, resolution: ImportConflict['resolution']) => void;
  applyImport: () => { added: number; updated: number; skipped: number };
  clearImport: () => void;

  getChangelogs: (paramId: string) => ChangeLog[];
}

function buildChangelog(
  paramId: string,
  field: string,
  oldValue: string,
  newValue: string,
  reason: string,
  beforeStatus: ReviewStatus,
  afterStatus: ReviewStatus,
): ChangeLog {
  return {
    id: generateId(),
    paramId,
    field,
    oldValue,
    newValue,
    reason,
    operator: '数据分析员',
    timestamp: Date.now(),
    beforeStatus,
    afterStatus,
  };
}

export const useCondProbStore = create<CondProbState>()(
  persist(
    (set, get) => ({
      params: [],
      changelogs: [],
      filterStatus: 'all',
      showSampleBanner: true,
      expandedParamId: null,
      importConflicts: [],
      editingParam: null,
      boundaryOnly: false,

      initSample: () => {
        const { params } = get();
        if (params.length === 0) {
          set({ params: SAMPLE_PARAMS, showSampleBanner: true });
        }
      },

      resetToSample: () => {
        set({ params: SAMPLE_PARAMS, changelogs: [], showSampleBanner: false });
      },

      dismissSampleBanner: () => set({ showSampleBanner: false }),

      setFilterStatus: (s) => set({ filterStatus: s }),
      toggleBoundaryOnly: () => set((st) => ({ boundaryOnly: !st.boundaryOnly })),
      setExpandedParamId: (id) => set({ expandedParamId: id }),
      setEditingParam: (p) => set({ editingParam: p }),

      addParam: (data) => {
        const now = Date.now();
        const jointCount = data.jointCount ?? 0;
        const conditionCount = data.conditionCount ?? 0;
        const probability = calcProbability(jointCount, conditionCount);
        const status: DataStatus = data.status ?? 'pending';
        const newParam: CondProbParam = {
          id: generateId(),
          condition: data.condition ?? '',
          outcome: data.outcome ?? '',
          jointCount,
          conditionCount,
          probability,
          status,
          reviewStatus: 'pending',
          explanation: generateExplanation(probability, status, jointCount, conditionCount),
          isBoundary: data.isBoundary ?? (probability < 0.05 || probability > 0.95),
          boundaryNote: data.boundaryNote,
          createdAt: now,
          updatedAt: now,
        };
        set((st) => ({ params: [newParam, ...st.params] }));
      },

      updateParam: (id, patch, reason = '参数调整') => {
        const { params, changelogs } = get();
        const target = params.find((p) => p.id === id);
        if (!target) return;

        const logs: ChangeLog[] = [];
        const merged: CondProbParam = { ...target, ...patch, updatedAt: Date.now() };
        merged.probability = calcProbability(merged.jointCount, merged.conditionCount);
        merged.explanation = generateExplanation(
          merged.probability,
          merged.status,
          merged.jointCount,
          merged.conditionCount,
        );

        (Object.keys(patch) as Array<keyof CondProbParam>).forEach((key) => {
          const oldV = String(target[key]);
          const newV = String(merged[key]);
          if (oldV !== newV) {
            logs.push(
              buildChangelog(id, key, oldV, newV, reason, target.reviewStatus, merged.reviewStatus),
            );
          }
        });
        if (patch.status || patch.jointCount !== undefined || patch.conditionCount !== undefined) {
          if (!logs.find((l) => l.field === 'explanation')) {
            logs.push(
              buildChangelog(
                id,
                'explanation',
                target.explanation,
                merged.explanation,
                reason,
                target.reviewStatus,
                merged.reviewStatus,
              ),
            );
          }
        }

        set({
          params: params.map((p) => (p.id === id ? merged : p)),
          changelogs: [...logs, ...changelogs],
        });
      },

      deleteParam: (id) => {
        set((st) => ({
          params: st.params.filter((p) => p.id !== id),
          changelogs: st.changelogs.filter((c) => c.paramId !== id),
        }));
      },

      updateStatus: (id, status, reason) => {
        get().updateParam(id, { status }, reason);
      },

      approveParam: (id, reason) => {
        get().updateParam(id, { reviewStatus: 'approved', status: 'available' }, reason || '人工复核通过');
      },

      rejectParam: (id, reason) => {
        get().updateParam(id, { reviewStatus: 'rejected', status: 'recollect' }, reason || '复核不通过，需重新采集');
      },

      toggleBoundary: (id, note) => {
        const target = get().params.find((p) => p.id === id);
        if (!target) return;
        get().updateParam(
          id,
          { isBoundary: !target.isBoundary, boundaryNote: note ?? target.boundaryNote },
          target.isBoundary ? '取消边界标记' : '标记为边界样例',
        );
      },

      prepareImport: (incoming) => {
        const { params } = get();
        const existingMap = new Map(params.map((p) => [normalizeKey(p.condition, p.outcome), p]));
        const conflicts: ImportConflict[] = [];
        incoming.forEach((p) => {
          const key = normalizeKey(p.condition, p.outcome);
          const existing = existingMap.get(key);
          if (existing) {
            conflicts.push({ incoming: p, existing, resolution: 'skip' });
          }
        });
        set({ importConflicts: conflicts });
        return conflicts;
      },

      resolveConflict: (idx, resolution) => {
        set((st) => {
          const next = [...st.importConflicts];
          if (next[idx]) next[idx] = { ...next[idx], resolution };
          return { importConflicts: next };
        });
      },

      applyImport: () => {
        const { params, importConflicts, changelogs } = get();
        const existingMap = new Map(params.map((p) => [normalizeKey(p.condition, p.outcome), p]));
        let added = 0;
        let updated = 0;
        let skipped = 0;
        const newParams = [...params];
        const newLogs: ChangeLog[] = [];

        importConflicts.forEach((c) => {
          existingMap.set(normalizeKey(c.existing.condition, c.existing.outcome), c.existing);
          if (c.resolution === 'skip') {
            skipped++;
          } else if (c.resolution === 'keep') {
            skipped++;
          } else if (c.resolution === 'overwrite') {
            const idx = newParams.findIndex((p) => p.id === c.existing.id);
            if (idx >= 0) {
              const merged: CondProbParam = {
                ...newParams[idx],
                jointCount: c.incoming.jointCount,
                conditionCount: c.incoming.conditionCount,
                status: c.incoming.status,
                updatedAt: Date.now(),
              };
              merged.probability = calcProbability(merged.jointCount, merged.conditionCount);
              merged.explanation = generateExplanation(
                merged.probability,
                merged.status,
                merged.jointCount,
                merged.conditionCount,
              );
              newLogs.push(
                buildChangelog(
                  merged.id,
                  'import',
                  JSON.stringify({
                    jointCount: newParams[idx].jointCount,
                    conditionCount: newParams[idx].conditionCount,
                    status: newParams[idx].status,
                  }),
                  JSON.stringify({
                    jointCount: merged.jointCount,
                    conditionCount: merged.conditionCount,
                    status: merged.status,
                  }),
                  '导入覆盖',
                  newParams[idx].reviewStatus,
                  merged.reviewStatus,
                ),
              );
              newParams[idx] = merged;
            }
            updated++;
          }
        });
        set({
          params: newParams,
          changelogs: [...newLogs, ...changelogs],
          importConflicts: [],
        });
        return { added, updated, skipped };
      },

      clearImport: () => set({ importConflicts: [] }),

      getChangelogs: (paramId) => {
        return get().changelogs.filter((c) => c.paramId === paramId).sort((a, b) => b.timestamp - a.timestamp);
      },
    }),
    {
      name: 'cond-prob-teaching-card',
      partialize: (state) => ({
        params: state.params,
        changelogs: state.changelogs,
        filterStatus: state.filterStatus,
        showSampleBanner: state.showSampleBanner,
        boundaryOnly: state.boundaryOnly,
      }),
      onRehydrateStorage: () => (state) => {
        state?.initSample();
      },
    },
  ),
);
