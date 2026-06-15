import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PointStore,
  RawPoint,
  MergedPoint,
  HistoryRecord,
  HistoryAction,
  PointStatus,
  Note,
} from '../types';
import { generateId } from '../utils/geo';
import { createDemoData } from '../utils/demoData';

const OPERATOR = '交通工程师-老何';

function createHistoryRecord(
  action: HistoryAction,
  targetType: 'rawPoint' | 'mergedPoint',
  targetId: string,
  before: any,
  after: any
): HistoryRecord {
  return {
    id: generateId(),
    action,
    targetType,
    targetId,
    before,
    after,
    operator: OPERATOR,
    timestamp: new Date().toISOString(),
  };
}

export const usePointStore = create<PointStore>()(
  persist(
    (set, get) => ({
      rawPoints: [],
      mergedPoints: [],
      history: [],
      currentBatch: '',

      importRawPoints: (points, source) => {
        const batchId = `BATCH-${Date.now().toString().slice(-8)}`;
        const now = new Date().toISOString();

        const newRawPoints: RawPoint[] = points.map((p, index) => ({
          ...p,
          id: generateId(),
          importBatch: batchId,
          createdAt: new Date(Date.now() - (points.length - index) * 1000).toISOString(),
        }));

        const newMergedPoints: MergedPoint[] = newRawPoints.map((rp) => ({
          id: generateId(),
          canonicalName: rp.rawName,
          status: 'pending' as PointStatus,
          rawPointIds: [rp.id],
          canonicalLat: rp.rawLat,
          canonicalLng: rp.rawLng,
          notes: [],
          hasSupplementaryNote: false,
          createdAt: now,
          updatedAt: now,
        }));

        const importRecord = createHistoryRecord(
          'import',
          'rawPoint',
          `batch-${batchId}`,
          null,
          { count: points.length, batch: batchId, source }
        );

        set((state) => ({
          rawPoints: [...state.rawPoints, ...newRawPoints],
          mergedPoints: [...state.mergedPoints, ...newMergedPoints],
          history: [importRecord, ...state.history],
          currentBatch: batchId,
        }));
      },

      confirmPoint: (id) => {
        const state = get();
        const point = state.mergedPoints.find((p) => p.id === id);
        if (!point) return;

        const before = { status: point.status };
        const after = { status: 'confirmed' as PointStatus };
        const record = createHistoryRecord('status', 'mergedPoint', id, before, after);

        set((state) => ({
          mergedPoints: state.mergedPoints.map((p) =>
            p.id === id ? { ...p, status: 'confirmed', updatedAt: new Date().toISOString() } : p
          ),
          history: [record, ...state.history],
        }));
      },

      markOnsite: (id) => {
        const state = get();
        const point = state.mergedPoints.find((p) => p.id === id);
        if (!point) return;

        const before = { status: point.status };
        const after = { status: 'onsite' as PointStatus };
        const record = createHistoryRecord('status', 'mergedPoint', id, before, after);

        set((state) => ({
          mergedPoints: state.mergedPoints.map((p) =>
            p.id === id ? { ...p, status: 'onsite', updatedAt: new Date().toISOString() } : p
          ),
          history: [record, ...state.history],
        }));
      },

      markConflict: (id) => {
        const state = get();
        const point = state.mergedPoints.find((p) => p.id === id);
        if (!point) return;

        const before = { status: point.status };
        const after = { status: 'conflict' as PointStatus };
        const record = createHistoryRecord('status', 'mergedPoint', id, before, after);

        set((state) => ({
          mergedPoints: state.mergedPoints.map((p) =>
            p.id === id ? { ...p, status: 'conflict', updatedAt: new Date().toISOString() } : p
          ),
          history: [record, ...state.history],
        }));
      },

      withdrawStatus: (id) => {
        const state = get();
        const point = state.mergedPoints.find((p) => p.id === id);
        if (!point) return;

        const before = { status: point.status };
        const after = { status: 'pending' as PointStatus };
        const record = createHistoryRecord('withdraw', 'mergedPoint', id, before, after);

        set((state) => ({
          mergedPoints: state.mergedPoints.map((p) =>
            p.id === id ? { ...p, status: 'pending', updatedAt: new Date().toISOString() } : p
          ),
          history: [record, ...state.history],
        }));
      },

      mergePoints: (rawPointIds, canonicalName, canonicalLat, canonicalLng) => {
        const state = get();
        const now = new Date().toISOString();

        const existingMerged = state.mergedPoints.filter((mp) =>
          mp.rawPointIds.some((id) => rawPointIds.includes(id))
        );

        const rawNames = rawPointIds
          .map((id) => state.rawPoints.find((rp) => rp.id === id)?.rawName)
          .filter(Boolean);

        const newMerged: MergedPoint = {
          id: generateId(),
          canonicalName,
          status: 'pending',
          rawPointIds,
          canonicalLat,
          canonicalLng,
          notes: [],
          hasSupplementaryNote: false,
          createdAt: now,
          updatedAt: now,
        };

        const record = createHistoryRecord('merge', 'mergedPoint', newMerged.id, null, {
          canonicalName,
          rawPointIds,
          rawNames,
          mergedFrom: existingMerged.map((m) => ({ id: m.id, name: m.canonicalName })),
        });

        set((state) => ({
          mergedPoints: [
            ...state.mergedPoints.filter((mp) => !existingMerged.some((em) => em.id === mp.id)),
            newMerged,
          ],
          history: [record, ...state.history],
        }));
      },

      addNote: (mergedPointId, content, isSupplementary) => {
        const state = get();
        const point = state.mergedPoints.find((p) => p.id === mergedPointId);
        if (!point) return;

        const newNote: Note = {
          id: generateId(),
          content,
          isSupplementary,
          createdAt: new Date().toISOString(),
        };

        const before = { notes: point.notes };
        const after = { notes: [...point.notes, newNote] };
        const record = createHistoryRecord('note', 'mergedPoint', mergedPointId, before, after);

        set((state) => ({
          mergedPoints: state.mergedPoints.map((p) =>
            p.id === mergedPointId
              ? {
                  ...p,
                  notes: [...p.notes, newNote],
                  hasSupplementaryNote: p.hasSupplementaryNote || isSupplementary,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
          history: [record, ...state.history],
        }));
      },

      loadDemoData: () => {
        const demoData = createDemoData();
        set(demoData);
      },

      clearAllData: () => {
        set({
          rawPoints: [],
          mergedPoints: [],
          history: [],
          currentBatch: '',
        });
      },

      exportHistory: () => {
        const state = get();
        const exportData = {
          exportTime: new Date().toISOString(),
          operator: OPERATOR,
          rawPoints: state.rawPoints,
          mergedPoints: state.mergedPoints,
          history: state.history,
        };
        return JSON.stringify(exportData, null, 2);
      },

      exportHistoryCSV: () => {
        const state = get();
        const headers = [
          '操作时间',
          '操作类型',
          '操作人',
          '目标类型',
          '目标ID',
          '操作前状态',
          '操作后状态',
        ];

        const rows = state.history.map((h) => [
          h.timestamp,
          h.action,
          h.operator,
          h.targetType,
          h.targetId,
          JSON.stringify(h.before),
          JSON.stringify(h.after),
        ]);

        const csv = [headers, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        return '\uFEFF' + csv;
      },
    }),
    {
      name: 'bus-harbor-points-storage',
      partialize: (state) => ({
        rawPoints: state.rawPoints,
        mergedPoints: state.mergedPoints,
        history: state.history,
        currentBatch: state.currentBatch,
      }),
    }
  )
);
