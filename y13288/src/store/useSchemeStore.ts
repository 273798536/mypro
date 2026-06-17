import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Scheme, Material, LocationPoint, MergeRecord, AnomalyRecord, AnomalyStatus } from "@/types";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const DEMO_SCHEME: Scheme = {
  id: "scheme-1",
  name: "菜场卸货方案比选",
  conclusion: "推荐方案B：东门卸货区集中管理，错峰进入，夜间备货补充",
  materials: [
    {
      id: "mat-1",
      schemeId: "scheme-1",
      type: "meeting_minutes",
      content: "第三次协调会纪要：东门卸货区面积需扩大至80㎡，高峰时段7:00-9:00禁止社会车辆进入",
      source: "第三次协调会",
      createdAt: "2025-01-15T09:00:00",
      relatedMaterialIds: ["mat-4"],
    },
    {
      id: "mat-2",
      schemeId: "scheme-1",
      type: "opinion_form",
      content: "交管部门意见：建议卸货时段避开学生上学高峰，东门路口需增设右转禁令标志",
      source: "交管部门反馈表",
      createdAt: "2025-01-18T14:30:00",
      relatedMaterialIds: [],
    },
    {
      id: "mat-3",
      schemeId: "scheme-1",
      type: "opinion_form",
      content: "旧版意见：西门路口可考虑作为备用卸货通道，但路宽不足6米，大型货车无法通行",
      source: "第一轮征询旧表",
      createdAt: "2025-01-10T10:00:00",
      relatedMaterialIds: [],
    },
    {
      id: "mat-4",
      schemeId: "scheme-1",
      type: "supplementary_note",
      content: "后补备注：东门卸货区扩容后需同步增设消防通道标识，此为消防验收必要条件",
      source: "消防科补充",
      createdAt: "2025-02-01T11:00:00",
      relatedMaterialIds: ["mat-1", "mat-5"],
    },
    {
      id: "mat-5",
      schemeId: "scheme-1",
      type: "conclusion",
      content: "最终结论：推荐方案B，东门卸货区集中管理，错峰进入，夜间备货补充。消防标识须在扩容方案中一并落实",
      source: "综合评定",
      createdAt: "2025-02-05T16:00:00",
      relatedMaterialIds: ["mat-4"],
    },
  ],
  locationPoints: [
    { id: "lp-1", rawName: "东门路交叉口", canonicalName: "东门路交叉口", schemeId: "scheme-1", mergedFrom: [] },
    { id: "lp-2", rawName: "东门路口", canonicalName: "", schemeId: "scheme-1", mergedFrom: [] },
    { id: "lp-3", rawName: "西门路口", canonicalName: "西门路口", schemeId: "scheme-1", mergedFrom: [] },
    { id: "lp-4", rawName: "南门卸货通道", canonicalName: "南门卸货通道", schemeId: "scheme-1", mergedFrom: [] },
  ],
  mergeRecords: [],
  anomalies: [],
};

interface SchemeStore {
  schemes: Scheme[];
  activeSchemeId: string | null;

  setActiveScheme: (id: string) => void;
  addScheme: (name: string) => Scheme;
  addMaterial: (schemeId: string, material: Omit<Material, "id" | "schemeId" | "createdAt" | "relatedMaterialIds">) => Material;
  updateConclusion: (schemeId: string, conclusion: string) => void;
  addLocationPoint: (schemeId: string, rawName: string) => LocationPoint;
  mergePoints: (schemeId: string, pointIds: string[], canonicalName: string, reason: string, operator: string) => MergeRecord;
  addAnomaly: (schemeId: string, mergeRecordId: string, description: string, suggestion: string) => AnomalyRecord;
  handleAnomaly: (schemeId: string, anomalyId: string, status: AnomalyStatus, handler: string) => void;
  revertMerge: (schemeId: string, mergeRecordId: string) => void;

  getScheme: (id: string) => Scheme | undefined;
  getActiveScheme: () => Scheme | undefined;
  detectSimilarPoints: (schemeId: string) => Array<{ pointA: LocationPoint; pointB: LocationPoint; similarity: number }>;
  detectAdjacentAnomalies: (schemeId: string) => void;
  getSchemeStats: (schemeId: string) => { totalMaterials: number; pendingAnomalies: number; confirmedMerges: number; needEvidence: number };
}

function calcSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(""));
  const setB = new Set(b.split(""));
  let intersection = 0;
  setA.forEach((ch) => { if (setB.has(ch)) intersection++; });
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

const ADJACENT_PAIRS: Array<[string, string]> = [
  ["东门", "西门"],
  ["东门", "南门"],
  ["西门", "南门"],
];

function isAdjacentPair(nameA: string, nameB: string): boolean {
  const keys = ADJACENT_PAIRS.flat();
  const aKey = keys.find((k) => nameA.includes(k));
  const bKey = keys.find((k) => nameB.includes(k));
  if (!aKey || !bKey) return false;
  return ADJACENT_PAIRS.some(([x, y]) => (x === aKey && y === bKey) || (x === bKey && y === aKey));
}

export const useSchemeStore = create<SchemeStore>()(
  persist(
    (set, get) => ({
      schemes: [DEMO_SCHEME],
      activeSchemeId: "scheme-1",

      setActiveScheme: (id) => set({ activeSchemeId: id }),

      addScheme: (name) => {
        const scheme: Scheme = { id: uid(), name, materials: [], locationPoints: [], mergeRecords: [], anomalies: [] };
        set((s) => ({ schemes: [...s.schemes, scheme], activeSchemeId: scheme.id }));
        return scheme;
      },

      addMaterial: (schemeId, input) => {
        const material: Material = { ...input, id: uid(), schemeId, createdAt: new Date().toISOString(), relatedMaterialIds: [] };
        set((s) => ({
          schemes: s.schemes.map((sc) => (sc.id === schemeId ? { ...sc, materials: [...sc.materials, material] } : sc)),
        }));
        return material;
      },

      updateConclusion: (schemeId, conclusion) =>
        set((s) => ({
          schemes: s.schemes.map((sc) => (sc.id === schemeId ? { ...sc, conclusion } : sc)),
        })),

      addLocationPoint: (schemeId, rawName) => {
        const point: LocationPoint = { id: uid(), rawName, canonicalName: rawName, schemeId, mergedFrom: [] };
        set((s) => ({
          schemes: s.schemes.map((sc) => (sc.id === schemeId ? { ...sc, locationPoints: [...sc.locationPoints, point] } : sc)),
        }));
        return point;
      },

      mergePoints: (schemeId, pointIds, canonicalName, reason, operator) => {
        const scheme = get().schemes.find((s) => s.id === schemeId);
        if (!scheme) throw new Error("Scheme not found");
        const points = scheme.locationPoints.filter((p) => pointIds.includes(p.id));
        const pointA = points[0];
        const pointB = points[1];
        const isAdjacentWarning = pointA && pointB ? isAdjacentPair(pointA.rawName, pointB.rawName) : false;
        const record: MergeRecord = {
          id: uid(),
          pointIds,
          reason,
          operator,
          timestamp: new Date().toISOString(),
          isAdjacentWarning,
          evidenceSnapshot: { originalA: pointA?.rawName ?? "", originalB: pointB?.rawName ?? "" },
        };
        set((s) => ({
          schemes: s.schemes.map((sc) => {
            if (sc.id !== schemeId) return sc;
            return {
              ...sc,
              mergeRecords: [...sc.mergeRecords, record],
              locationPoints: sc.locationPoints.map((p) =>
                pointIds.includes(p.id) ? { ...p, canonicalName, mergedFrom: [...p.mergedFrom, record.id] } : p
              ),
            };
          }),
        }));
        if (isAdjacentWarning) {
          get().addAnomaly(
            schemeId,
            record.id,
            `归并点位"${pointA?.rawName}"与"${pointB?.rawName}"属于相邻路口，可能被错误合并`,
            `请确认两个路口是否确为同一地点。如确认无误请点击"确认归并"，否则请"拆分回退"`
          );
        }
        return record;
      },

      addAnomaly: (schemeId, mergeRecordId, description, suggestion) => {
        const anomaly: AnomalyRecord = { id: uid(), mergeRecordId, type: "adjacent_mismatch", description, suggestion, status: "pending" };
        set((s) => ({
          schemes: s.schemes.map((sc) => (sc.id === schemeId ? { ...sc, anomalies: [...sc.anomalies, anomaly] } : sc)),
        }));
        return anomaly;
      },

      handleAnomaly: (schemeId, anomalyId, status, handler) =>
        set((s) => ({
          schemes: s.schemes.map((sc) =>
            sc.id === schemeId
              ? { ...sc, anomalies: sc.anomalies.map((a) => (a.id === anomalyId ? { ...a, status, handledBy: handler, handledAt: new Date().toISOString() } : a)) }
              : sc
          ),
        })),

      revertMerge: (schemeId, mergeRecordId) => {
        const scheme = get().schemes.find((s) => s.id === schemeId);
        if (!scheme) return;
        const record = scheme.mergeRecords.find((r) => r.id === mergeRecordId);
        if (!record) return;
        set((s) => ({
          schemes: s.schemes.map((sc) => {
            if (sc.id !== schemeId) return sc;
            return {
              ...sc,
              locationPoints: sc.locationPoints.map((p) => {
                if (record.pointIds.includes(p.id)) {
                  return { ...p, canonicalName: p.rawName, mergedFrom: p.mergedFrom.filter((m) => m !== mergeRecordId) };
                }
                return p;
              }),
              mergeRecords: sc.mergeRecords.filter((r) => r.id !== mergeRecordId),
            };
          }),
        }));
      },

      getScheme: (id) => get().schemes.find((s) => s.id === id),
      getActiveScheme: () => {
        const s = get();
        return s.schemes.find((sc) => sc.id === s.activeSchemeId);
      },

      detectSimilarPoints: (schemeId) => {
        const scheme = get().schemes.find((s) => s.id === schemeId);
        if (!scheme) return [];
        const results: Array<{ pointA: LocationPoint; pointB: LocationPoint; similarity: number }> = [];
        const unmerged = scheme.locationPoints.filter((p) => p.mergedFrom.length === 0);
        for (let i = 0; i < unmerged.length; i++) {
          for (let j = i + 1; j < unmerged.length; j++) {
            const sim = calcSimilarity(unmerged[i].rawName, unmerged[j].rawName);
            if (sim >= 0.5 && unmerged[i].rawName !== unmerged[j].rawName) {
              results.push({ pointA: unmerged[i], pointB: unmerged[j], similarity: sim });
            }
          }
        }
        return results.sort((a, b) => b.similarity - a.similarity);
      },

      detectAdjacentAnomalies: (schemeId) => {
        const scheme = get().schemes.find((s) => s.id === schemeId);
        if (!scheme) return;
        scheme.mergeRecords.forEach((record) => {
          if (!record.isAdjacentWarning) return;
          const existing = scheme.anomalies.find((a) => a.mergeRecordId === record.id);
          if (existing) return;
          const pA = scheme.locationPoints.find((p) => p.id === record.pointIds[0]);
          const pB = scheme.locationPoints.find((p) => p.id === record.pointIds[1]);
          get().addAnomaly(
            schemeId,
            record.id,
            `归并点位"${pA?.rawName}"与"${pB?.rawName}"属于相邻路口，可能被错误合并`,
            `请确认两个路口是否确为同一地点。如确认无误请点击"确认归并"，否则请"拆分回退"`
          );
        });
      },

      getSchemeStats: (schemeId) => {
        const scheme = get().schemes.find((s) => s.id === schemeId);
        if (!scheme) return { totalMaterials: 0, pendingAnomalies: 0, confirmedMerges: 0, needEvidence: 0 };
        const totalMaterials = scheme.materials.length;
        const pendingAnomalies = scheme.anomalies.filter((a) => a.status === "pending").length;
        const confirmedMerges = scheme.mergeRecords.length;
        const needEvidence = scheme.materials.filter((m) => m.type === "supplementary_note" && m.relatedMaterialIds.length === 0).length;
        return { totalMaterials, pendingAnomalies, confirmedMerges, needEvidence };
      },
    }),
    { name: "scheme-store" }
  )
);
