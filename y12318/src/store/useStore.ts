import { create } from "zustand";
import type {
  SalesRecord,
  PromoCalendar,
  InventorySnapshot,
  OutOfStockRecord,
  ReplenishmentSuggestion,
  EvidenceItem,
  ConflictItem,
  VersionDiff,
  DataSourceStatus,
} from "@/types";
import {
  sampleSalesHistory,
  samplePromoCalendarV1,
  samplePromoCalendarV2,
  sampleInventorySnapshot,
  sampleOutOfStock,
  sampleSuggestions,
  sampleEvidences,
  sampleConflicts,
} from "@/data/sampleData";

interface AppState {
  salesHistory: SalesRecord[];
  promoCalendarV1: PromoCalendar[];
  promoCalendarV2: PromoCalendar[];
  inventorySnapshot: InventorySnapshot[];
  outOfStockRecords: OutOfStockRecord[];
  suggestions: ReplenishmentSuggestion[];
  evidences: EvidenceItem[];
  conflicts: ConflictItem[];
  versionDiffs: VersionDiff[];
  dataSources: DataSourceStatus[];
  consistencyRate: number;
  sampleLoaded: boolean;

  loadSampleData: () => void;
  setSalesHistory: (data: SalesRecord[]) => void;
  setPromoCalendarV2: (data: PromoCalendar[]) => void;
  setInventorySnapshot: (data: InventorySnapshot[]) => void;
  setOutOfStockRecords: (data: OutOfStockRecord[]) => void;
  setDataSourceLoading: (id: string, loading: boolean) => void;
  setDataSourceLoaded: (id: string, rowCount: number, fileName: string) => void;
  computeVersionDiffs: () => void;
  computeConflicts: () => void;
  computeConsistency: () => void;
  getSuggestionBySku: (skuId: string) => ReplenishmentSuggestion | undefined;
  getEvidencesBySku: (skuId: string) => EvidenceItem[];
  exportConsistencyCheck: () => { passed: boolean; details: string[] };
}

const initialDataSources: DataSourceStatus[] = [
  { id: "sales", name: "销售历史", loaded: false, rowCount: 0, fileName: "", loading: false },
  { id: "promo", name: "促销日历", loaded: false, rowCount: 0, fileName: "", loading: false },
  { id: "inventory", name: "库存快照", loaded: false, rowCount: 0, fileName: "", loading: false },
  { id: "oos", name: "缺货记录", loaded: false, rowCount: 0, fileName: "", loading: false },
];

function computeVersionDiffsFromData(v1: PromoCalendar[], v2: PromoCalendar[]): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  const v1Map = new Map(v1.map((p) => [p.calendarId, p]));
  const v2Map = new Map(v2.map((p) => [p.calendarId, p]));

  for (const [id, p2] of v2Map) {
    const p1 = v1Map.get(id);
    if (!p1) {
      diffs.push({ field: "促销档期", oldValue: "-", newValue: p2.promoName, diffType: "added" });
    } else {
      if (p1.endDate !== p2.endDate) {
        diffs.push({ field: `${p1.promoName}-结束日期`, oldValue: p1.endDate, newValue: p2.endDate, diffType: "modified" });
      }
      if (p1.discountRate !== p2.discountRate) {
        diffs.push({ field: `${p1.promoName}-折扣率`, oldValue: String(p1.discountRate), newValue: String(p2.discountRate), diffType: "modified" });
      }
      if (p1.promoName !== p2.promoName) {
        diffs.push({ field: "促销名称", oldValue: p1.promoName, newValue: p2.promoName, diffType: "modified" });
      }
    }
  }

  for (const [id, p1] of v1Map) {
    if (!v2Map.has(id)) {
      diffs.push({ field: "促销档期", oldValue: p1.promoName, newValue: "-", diffType: "deleted" });
    }
  }

  return diffs;
}

export const useStore = create<AppState>((set, get) => ({
  salesHistory: [],
  promoCalendarV1: [],
  promoCalendarV2: [],
  inventorySnapshot: [],
  outOfStockRecords: [],
  suggestions: [],
  evidences: [],
  conflicts: [],
  versionDiffs: [],
  dataSources: initialDataSources,
  consistencyRate: 100,
  sampleLoaded: false,

  loadSampleData: () => {
    set({
      salesHistory: sampleSalesHistory,
      promoCalendarV1: samplePromoCalendarV1,
      promoCalendarV2: samplePromoCalendarV2,
      inventorySnapshot: sampleInventorySnapshot,
      outOfStockRecords: sampleOutOfStock,
      suggestions: sampleSuggestions,
      evidences: sampleEvidences,
      conflicts: sampleConflicts,
      versionDiffs: computeVersionDiffsFromData(samplePromoCalendarV1, samplePromoCalendarV2),
      dataSources: initialDataSources.map((ds) => {
        const counts: Record<string, number> = {
          sales: sampleSalesHistory.length,
          promo: samplePromoCalendarV1.length + samplePromoCalendarV2.length,
          inventory: sampleInventorySnapshot.length,
          oos: sampleOutOfStock.length,
        };
        return { ...ds, loaded: true, rowCount: counts[ds.id] || 0, fileName: "样例数据" };
      }),
      consistencyRate: 62.5,
      sampleLoaded: true,
    });
  },

  setSalesHistory: (data) => set({ salesHistory: data }),
  setPromoCalendarV2: (data) => {
    set({ promoCalendarV2: data });
    get().computeVersionDiffs();
  },
  setInventorySnapshot: (data) => set({ inventorySnapshot: data }),
  setOutOfStockRecords: (data) => set({ outOfStockRecords: data }),

  setDataSourceLoading: (id, loading) =>
    set((state) => ({
      dataSources: state.dataSources.map((ds) => (ds.id === id ? { ...ds, loading } : ds)),
    })),

  setDataSourceLoaded: (id, rowCount, fileName) =>
    set((state) => ({
      dataSources: state.dataSources.map((ds) =>
        ds.id === id ? { ...ds, loaded: true, loading: false, rowCount, fileName } : ds
      ),
    })),

  computeVersionDiffs: () => {
    const { promoCalendarV1, promoCalendarV2 } = get();
    set({ versionDiffs: computeVersionDiffsFromData(promoCalendarV1, promoCalendarV2) });
  },

  computeConflicts: () => {
    const { salesHistory, inventorySnapshot, outOfStockRecords } = get();
    const conflicts: ConflictItem[] = [];

    const skuSales = new Map<string, SalesRecord[]>();
    salesHistory.forEach((r) => {
      const arr = skuSales.get(r.skuId) || [];
      arr.push(r);
      skuSales.set(r.skuId, arr);
    });

    inventorySnapshot.forEach((snap) => {
      const records = skuSales.get(snap.skuId) || [];
      const hasRemarkChange = records.some((r) => r.remarkVersion !== "v1");
      const oosForSku = outOfStockRecords.filter((o) => o.skuId === snap.skuId);

      if (hasRemarkChange && snap.conclusion === "库存充足") {
        conflicts.push({
          skuId: snap.skuId,
          salesConclusion: "销售备注变更，可能需补货",
          inventoryConclusion: snap.conclusion,
          severity: "low",
          description: `SKU ${snap.skuId} 销售备注有变更但库存快照显示充足`,
        });
      }

      if (oosForSku.length > 0 && (snap.conclusion === "库存充足" || snap.conclusion === "库存适中")) {
        conflicts.push({
          skuId: snap.skuId,
          salesConclusion: "存在缺货记录",
          inventoryConclusion: snap.conclusion,
          severity: "high",
          description: `SKU ${snap.skuId} 有${oosForSku.length}条缺货记录但库存快照未反映`,
        });
      }
    });

    set({ conflicts });
  },

  computeConsistency: () => {
    const { conflicts, inventorySnapshot } = get();
    if (inventorySnapshot.length === 0) {
      set({ consistencyRate: 100 });
      return;
    }
    const conflictSkus = new Set(conflicts.map((c) => c.skuId));
    const consistent = inventorySnapshot.filter((s) => !conflictSkus.has(s.skuId)).length;
    set({ consistencyRate: Math.round((consistent / inventorySnapshot.length) * 100) });
  },

  getSuggestionBySku: (skuId) => get().suggestions.find((s) => s.skuId === skuId),
  getEvidencesBySku: (skuId) => get().evidences.filter((e) => e.skuId === skuId),

  exportConsistencyCheck: () => {
    const { inventorySnapshot, suggestions, conflicts } = get();
    const details: string[] = [];
    let passed = true;

    inventorySnapshot.forEach((snap) => {
      const suggestion = suggestions.find((s) => s.skuId === snap.skuId);
      if (suggestion) {
        const snapshotSaysOk = snap.conclusion === "库存充足" || snap.conclusion === "库存适中";
        const suggestionSaysOk = suggestion.priority === "low";
        if (snapshotSaysOk !== suggestionSaysOk) {
          passed = false;
          details.push(`SKU ${snap.skuId}: 库存快照结论"${snap.conclusion}"与补货建议优先级"${suggestion.priority}"不一致`);
        }
      }
    });

    conflicts.forEach((c) => {
      if (c.severity === "high") {
        passed = false;
        details.push(`SKU ${c.skuId}: ${c.description}`);
      }
    });

    return { passed, details };
  },
}));
