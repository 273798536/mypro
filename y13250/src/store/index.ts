import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Point,
  Material,
  MergeRelation,
  MergeEvidence,
  Anomaly,
  Remark,
  OperationLog,
  PageSummary,
  HighlightState,
  VersionCompareState,
  PointStatus,
  MergeStatus,
} from '@/types';
import { mockAnomalies, mockLogs, mockMaterials, mockMerges, mockPoints, mockRemarks, mockSummary } from '@/data/mockData';
import { suggestMergePairs, computeMergeGroupCanonical, detectCaliberChanged } from '@/utils/detector';
import { exportAll } from '@/utils/exporter';

interface StoreState {
  points: Point[];
  materials: Material[];
  merges: MergeRelation[];
  anomalies: Anomaly[];
  remarks: Remark[];
  logs: OperationLog[];
  summary: PageSummary;
  selectedMergeId: string | null;
  selectedPointId: string | null;
  logsExpanded: boolean;
  highlight: HighlightState;
  versionCompare: VersionCompareState;
}

interface StoreActions {
  setSelectedMerge: (id: string | null) => void;
  setSelectedPoint: (id: string | null) => void;
  setLogsExpanded: (v: boolean) => void;
  setHighlight: (h: HighlightState) => void;
  openVersionCompare: (materialId: string, vA: number, vB: number) => void;
  closeVersionCompare: () => void;
  confirmPendingMerge: (mergeId: string, decide: 'merge' | 'split') => void;
  resolveAnomaly: (anomalyId: string) => void;
  addRemark: (target: { mergeId?: string; pointId?: string }, author: string, content: string) => void;
  rerunMerge: () => void;
  triggerExport: () => { ok: boolean; count: number };
  addLog: (log: Omit<OperationLog, 'id' | 'timestamp'>) => void;
  resetToMock: () => void;
  recomputeSummary: () => void;
}

const uid = (p = 'id') =>
  `${p}_${Math.random().toString(36).slice(2, 6)}${Date.now().toString(36).slice(-4)}`;

const nowISO = () => new Date().toISOString();

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      points: mockPoints,
      materials: mockMaterials,
      merges: mockMerges,
      anomalies: mockAnomalies,
      remarks: mockRemarks,
      logs: mockLogs,
      summary: mockSummary,
      selectedMergeId: 'mg_003',
      selectedPointId: null,
      logsExpanded: false,
      highlight: { type: null, id: null, triggeredAt: null },
      versionCompare: { materialId: null, vA: 1, vB: 1, open: false },

      setSelectedMerge: id => set({ selectedMergeId: id, selectedPointId: null }),
      setSelectedPoint: id => set({ selectedPointId: id }),
      setLogsExpanded: v => set({ logsExpanded: v }),
      setHighlight: h => set({ highlight: h }),

      openVersionCompare: (materialId, vA, vB) =>
        set({ versionCompare: { materialId, vA, vB, open: true } }),
      closeVersionCompare: () => set(s => ({ versionCompare: { ...s.versionCompare, open: false } })),

      addLog: log => {
        const next: OperationLog = { ...log, id: uid('lg'), timestamp: nowISO() };
        set(s => ({ logs: [next, ...s.logs] }));
      },

      recomputeSummary: () => {
        const s = get();
        const abnormalCount = s.anomalies.filter(a => !a.resolved).length;
        const pendingCount = s.merges.filter(m => m.status === 'pending_review').length;
        const mergedCount = s.merges.filter(
          m => m.status === 'auto_merged' || m.status === 'evidence_merged',
        ).length;
        set(state => ({
          summary: {
            ...state.summary,
            totalPoints: s.points.length,
            abnormalCount,
            pendingCount,
            mergedCount,
          },
        }));
      },

      confirmPendingMerge: (mergeId, decide) => {
        const s = get();
        const merge = s.merges.find(m => m.id === mergeId);
        if (!merge) return;
        let newStatus: MergeStatus = decide === 'merge' ? 'evidence_merged' : 'split';
        const newMerges = s.merges.map(m =>
          m.id === mergeId
            ? { ...m, status: newStatus, operator: '算法值班人', operateTime: nowISO() }
            : m,
        );
        const newPoints = s.points.map(p => {
          if (!merge.pointIds.includes(p.id)) return p;
          const status: PointStatus = decide === 'merge' ? 'merged' : 'normal';
          return { ...p, status, mergeId: decide === 'merge' ? p.mergeId : undefined };
        });
        const newAnomalies = s.anomalies.map(a =>
          a.relatedMergeId === mergeId && a.type === 'adjacent_conflict'
            ? { ...a, resolved: true }
            : a,
        );
        set({ merges: newMerges, points: newPoints, anomalies: newAnomalies });
        get().addLog({
          operator: '算法值班人',
          action: decide === 'merge' ? '人工确认归并' : '人工拆分为独立点位',
          target: merge.canonicalName,
          targetType: 'merge',
          reason: decide === 'merge' ? '相邻路口确认是同一区域' : '相邻路口确认是两处独立点位',
        });
        get().recomputeSummary();
      },

      resolveAnomaly: anomalyId => {
        set(s => ({
          anomalies: s.anomalies.map(a =>
            a.id === anomalyId ? { ...a, resolved: true } : a,
          ),
        }));
        const a = get().anomalies.find(x => x.id === anomalyId);
        if (a) {
          get().addLog({
            operator: '算法值班人',
            action: '异常标记为已解决',
            target: a.description.slice(0, 20) + (a.description.length > 20 ? '…' : ''),
            targetType: 'anomaly',
            reason: '人工核查确认无问题',
          });
        }
        get().recomputeSummary();
      },

      addRemark: (target, author, content) => {
        if (!content.trim()) return;
        const st = get();
        const targetName =
          target.mergeId
            ? st.merges.find(m => m.id === target.mergeId)?.canonicalName || target.mergeId
            : target.pointId
              ? st.points.find(p => p.id === target.pointId)?.name || target.pointId
              : '-';
        const rk: Remark = {
          id: uid('rk'),
          author,
          content: content.trim(),
          timestamp: nowISO(),
          ...(target.mergeId ? { mergeId: target.mergeId } : {}),
          ...(target.pointId ? { pointId: target.pointId } : {}),
        };
        set(s => ({ remarks: [...s.remarks, rk] }));
        get().addLog({
          operator: author,
          action: '新增备注',
          target: targetName,
          targetType: target.mergeId ? 'merge' : target.pointId ? 'point' : 'system',
          reason: content.slice(0, 30),
        });
      },

      rerunMerge: () => {
        const s = get();
        const pairs = suggestMergePairs(s.points);
        const visited = new Set<string>();
        const groups: string[][] = [];
        const parent = new Map<string, string>();
        const find = (x: string): string => {
          if (!parent.has(x)) parent.set(x, x);
          if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
          return parent.get(x)!;
        };
        const union = (a: string, b: string) => {
          const ra = find(a);
          const rb = find(b);
          if (ra !== rb) parent.set(ra, rb);
        };
        pairs.forEach(p => {
          union(p.a, p.b);
          visited.add(p.a);
          visited.add(p.b);
        });
        const groupMap = new Map<string, string[]>();
        visited.forEach(pid => {
          const r = find(pid);
          if (!groupMap.has(r)) groupMap.set(r, []);
          groupMap.get(r)!.push(pid);
        });
        groupMap.forEach(members => {
          if (members.length < 2) return;
          groups.push(members);
        });

        const pairsById = new Map(
          pairs.map(p => [`${p.a}|${p.b}`, p] as const),
        );
        const getPair = (a: string, b: string) =>
          pairsById.get(`${a}|${b}`) || pairsById.get(`${b}|${a}`);

        const newMerges: MergeRelation[] = groups.map((members, idx) => {
          const memberPoints = members.map(id => s.points.find(p => p.id === id)!).filter(Boolean);
          const evidences: MergeEvidence[] = [];
          let forcePending = false;
          let confSum = 0;
          let confCount = 0;
          for (let i = 0; i < memberPoints.length; i++) {
            for (let j = i + 1; j < memberPoints.length; j++) {
              const pair = getPair(memberPoints[i].id, memberPoints[j].id);
              if (!pair) continue;
              if (pair.forcePending) forcePending = true;
              confSum += pair.confidence;
              confCount++;
              const matA = s.materials.find(m =>
                m.relatedPointIds.includes(memberPoints[i].id),
              );
              const matB = s.materials.find(m =>
                m.relatedPointIds.includes(memberPoints[j].id),
              );
              evidences.push({
                id: uid('ev'),
                type: pair.reason,
                writingA: memberPoints[i].name,
                writingB: memberPoints[j].name,
                materialRefA: matA?.title || '-',
                materialRefB: matB?.title || '-',
              });
            }
          }
          const conf = confCount > 0 ? confSum / confCount : 0.6;
          return {
            id: `mg_new_${idx + 1}`,
            pointIds: members,
            canonicalName: computeMergeGroupCanonical(memberPoints),
            status: forcePending ? 'pending_review' : 'evidence_merged',
            confidence: conf,
            evidence: evidences,
            operator: '系统（重跑）',
            operateTime: nowISO(),
            evidenceNote: forcePending
              ? '重跑后仍含相邻路口冲突，已自动挂起待人工确认'
              : '重跑归并结果',
          };
        });

        const untouched = s.merges.filter(m => {
          const newIds = new Set(newMerges.flatMap(nm => nm.pointIds));
          return !m.pointIds.some(pid => newIds.has(pid));
        });

        const newMergeList = [...untouched, ...newMerges];
        const newPointStatus = new Map<string, { status: PointStatus; mergeId?: string }>();
        newMergeList.forEach(m => {
          m.pointIds.forEach(pid => {
            newPointStatus.set(pid, {
              status: m.status === 'pending_review' ? 'pending' : 'merged',
              mergeId: m.id,
            });
          });
        });
        const newPoints = s.points.map(p => {
          const ov = newPointStatus.get(p.id);
          return ov ? { ...p, status: ov.status, mergeId: ov.mergeId } : { ...p, status: 'normal' as PointStatus, mergeId: undefined };
        });

        // 重新检测口径变更异常
        const newAnomalyBase = s.anomalies.map(a =>
          a.type === 'caliber_changed' || a.type === 'adjacent_conflict'
            ? { ...a, resolved: false }
            : a,
        );
        s.materials.forEach(mat => {
          const { changed } = detectCaliberChanged(mat.versions);
          if (changed) {
            mat.relatedPointIds.forEach(pid => {
              const exist = newAnomalyBase.find(
                a => a.pointId === pid && a.type === 'caliber_changed' && a.relatedMaterialId === mat.id,
              );
              if (!exist) {
                newAnomalyBase.push({
                  id: uid('an'),
                  pointId: pid,
                  type: 'caliber_changed',
                  severity: 'high',
                  description: `材料《${mat.title}》存在口径变更，归并依据需人工复核。`,
                  relatedMaterialId: mat.id,
                  relatedMergeId: newPoints.find(p => p.id === pid)?.mergeId,
                  resolved: false,
                  detectedAt: nowISO(),
                });
              }
            });
          }
        });

        set({
          merges: newMergeList,
          points: newPoints,
          anomalies: newAnomalyBase,
          summary: {
            ...get().summary,
            lastRerunTime: nowISO(),
            currentVersion: `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}-r${Math.floor(Math.random() * 90 + 10)}`,
          },
        });
        get().addLog({
          operator: '算法值班人',
          action: '重跑归并算法',
          target: `生成 ${newMerges.length} 组新归并`,
          targetType: 'system',
          reason: '手动触发重跑，保留历史备注与状态快照',
        });
        get().recomputeSummary();
      },

      triggerExport: () => {
        const s = get();
        try {
          const r = exportAll({
            points: s.points,
            materials: s.materials,
            merges: s.merges,
            anomalies: s.anomalies,
            logs: s.logs,
            remarks: s.remarks,
          });
          set(state => ({ summary: { ...state.summary, lastExportTime: nowISO() } }));
          get().addLog({
            operator: '算法值班人/社区运营-阿宁',
            action: '导出归并结果 + 操作日志',
            target: `归并${r.mergeCount}组/异常${r.anomalyCount}条/日志${r.logCount}条`,
            targetType: 'system',
            reason: '月底汇报用 / 留档',
          });
          return { ok: true, count: r.mergeCount + r.anomalyCount + r.logCount };
        } catch (e: any) {
          return { ok: false, count: 0 };
        }
      },

      resetToMock: () => {
        set({
          points: mockPoints,
          materials: mockMaterials,
          merges: mockMerges,
          anomalies: mockAnomalies,
          remarks: mockRemarks,
          logs: mockLogs,
          summary: mockSummary,
          selectedMergeId: 'mg_003',
          selectedPointId: null,
        });
        get().recomputeSummary();
      },
    }),
    {
      name: 'night-market-merge-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        points: state.points,
        materials: state.materials,
        merges: state.merges,
        anomalies: state.anomalies,
        remarks: state.remarks,
        logs: state.logs,
        summary: state.summary,
      }),
    },
  ),
);
