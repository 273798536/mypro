import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Point,
  Material,
  MaterialSource,
  MaterialVersion,
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

export interface NewMaterialInput {
  title: string;
  source: MaterialSource;
  uploader: string;
  content: string;
  changeNote: string;
  pointMentions: string[];
  updateExistingMaterialId?: string;
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
  rerunMerge: (options?: { skipLog?: boolean }) => void;
  triggerExport: () => { ok: boolean; count: number };
  addLog: (log: Omit<OperationLog, 'id' | 'timestamp'>) => void;
  addMaterial: (input: NewMaterialInput) => { materialId: string; isCaliberChanged: boolean; createdPointIds: string[] };
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

      addMaterial: input => {
        const s = get();
        const mentions = input.pointMentions.map(n => n.trim()).filter(Boolean);

        const relatedPointIds: string[] = [];
        const createdPointIds: string[] = [];
        const newPoints: Point[] = [...s.points];

        mentions.forEach(name => {
          const exist = newPoints.find(p => p.name === name || p.aliases.includes(name));
          if (exist) {
            relatedPointIds.push(exist.id);
          } else {
            const np: Point = {
              id: uid('pt'),
              name,
              location: name,
              status: 'normal',
              aliases: [],
              materialIds: [],
              createdAt: nowISO(),
            };
            newPoints.push(np);
            createdPointIds.push(np.id);
            relatedPointIds.push(np.id);
          }
        });

        const versionTimestamp = nowISO();
        let targetMaterial: Material;
        let isCaliberChanged = false;
        let prevV: number | null = null;

        if (input.updateExistingMaterialId) {
          const existing = s.materials.find(m => m.id === input.updateExistingMaterialId);
          if (!existing) {
            return { materialId: '', isCaliberChanged: false, createdPointIds: [] };
          }
          const nv: MaterialVersion = {
            id: uid('mv'),
            version: existing.currentVersion + 1,
            content: input.content,
            timestamp: versionTimestamp,
            changer: input.uploader,
            changeNote: input.changeNote || '更新口径/内容',
            pointMentions: mentions,
          };
          const nextVersions = [...existing.versions, nv];
          const detected = detectCaliberChanged(nextVersions);
          isCaliberChanged = detected.changed;
          prevV = existing.currentVersion;
          targetMaterial = {
            ...existing,
            title: input.title || existing.title,
            source: input.source,
            uploader: input.uploader,
            uploadTime: versionTimestamp,
            currentVersion: nv.version,
            versions: nextVersions,
            caliberChanged: existing.caliberChanged || isCaliberChanged,
            relatedPointIds: Array.from(new Set([...existing.relatedPointIds, ...relatedPointIds])),
          };
        } else {
          const v1: MaterialVersion = {
            id: uid('mv'),
            version: 1,
            content: input.content,
            timestamp: versionTimestamp,
            changer: input.uploader,
            changeNote: input.changeNote || '初版录入',
            pointMentions: mentions,
          };
          targetMaterial = {
            id: uid('mat'),
            title: input.title,
            source: input.source,
            uploader: input.uploader,
            uploadTime: versionTimestamp,
            currentVersion: 1,
            versions: [v1],
            caliberChanged: false,
            relatedPointIds,
          };
        }

        const newMaterials = input.updateExistingMaterialId
          ? s.materials.map(m => (m.id === input.updateExistingMaterialId ? targetMaterial : m))
          : [targetMaterial, ...s.materials];

        const finalPoints = newPoints.map(p => {
          if (!relatedPointIds.includes(p.id)) return p;
          const already = p.materialIds.includes(targetMaterial.id);
          return {
            ...p,
            materialIds: already ? p.materialIds : [...p.materialIds, targetMaterial.id],
          };
        });

        const finalAnomalies = [...s.anomalies];
        if (isCaliberChanged) {
          targetMaterial.relatedPointIds.forEach(pid => {
            const exist = finalAnomalies.find(
              a => a.pointId === pid && a.type === 'caliber_changed' && a.relatedMaterialId === targetMaterial.id,
            );
            if (!exist) {
              finalAnomalies.unshift({
                id: uid('an'),
                pointId: pid,
                type: 'caliber_changed',
                severity: 'high',
                description: `材料《${targetMaterial.title}》v${prevV}→v${targetMaterial.currentVersion} 改口径，归并依据需人工复核。`,
                relatedMaterialId: targetMaterial.id,
                relatedMergeId: finalPoints.find(p => p.id === pid)?.mergeId,
                resolved: false,
                detectedAt: nowISO(),
              });
            }
          });
        }
        mentions.forEach(name => {
          const pid = finalPoints.find(p => p.name === name || p.aliases.includes(name))?.id;
          if (!pid) return;
          const isNew = createdPointIds.includes(pid);
          if (isNew) {
            const existNameIncons = finalAnomalies.find(
              a => a.pointId === pid && a.type === 'name_inconsistency',
            );
            if (!existNameIncons && mentions.length > 1) {
              finalAnomalies.unshift({
                id: uid('an'),
                pointId: pid,
                type: 'name_inconsistency',
                severity: 'low',
                description: `材料《${targetMaterial.title}》同时提及多种写法：${mentions.join(' / ')}，需确认是否同地。`,
                relatedMaterialId: targetMaterial.id,
                resolved: false,
                detectedAt: nowISO(),
              });
            }
          }
        });

        set({
          materials: newMaterials,
          points: finalPoints,
          anomalies: finalAnomalies,
          selectedMergeId: null,
        });

        const actionName = input.updateExistingMaterialId ? '更新材料版本' : '新增材料';
        get().addLog({
          operator: input.uploader,
          action: actionName,
          target: `${targetMaterial.title}${input.updateExistingMaterialId ? ` v${prevV}→v${targetMaterial.currentVersion}` : ''}`,
          targetType: 'material',
          reason:
            (isCaliberChanged ? '【口径变更已打异常】' : '') +
            (input.changeNote || mentions.join('、') || '录入材料'),
        });

        createdPointIds.forEach(pid => {
          const pt = finalPoints.find(p => p.id === pid);
          if (pt) {
            get().addLog({
              operator: '系统（自动）',
              action: '从材料自动生成点位',
              target: pt.name,
              targetType: 'point',
              reason: `材料《${targetMaterial.title}》提及该点位名称，尚未建档`,
            });
          }
        });

        get().rerunMerge({ skipLog: true });

        if (isCaliberChanged && prevV != null) {
          get().openVersionCompare(targetMaterial.id, prevV, targetMaterial.currentVersion);
        }

        get().setHighlight({ type: 'material', id: targetMaterial.id, triggeredAt: Date.now() });
        get().recomputeSummary();

        return { materialId: targetMaterial.id, isCaliberChanged, createdPointIds };
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

      rerunMerge: (options) => {
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
        if (!options?.skipLog) {
          get().addLog({
            operator: '算法值班人',
            action: '重跑归并算法',
            target: `生成 ${newMerges.length} 组新归并`,
            targetType: 'system',
            reason: '手动触发重跑，保留历史备注与状态快照',
          });
        } else if (newMerges.length > 0) {
          get().addLog({
            operator: '系统（自动）',
            action: '新增材料后自动重跑归并',
            target: `生成 ${newMerges.length} 组新归并建议`,
            targetType: 'system',
            reason: '新录入材料产生新增点位，系统自动重算归并关系',
          });
        }
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
