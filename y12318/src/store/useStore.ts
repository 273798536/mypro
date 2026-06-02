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
  recomputeAll: () => void;
  computeVersionDiffs: () => void;
  computeConflicts: () => void;
  computeConsistency: () => void;
  computeSuggestions: () => void;
  computeEvidences: () => void;
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

  for (const [, p2] of v2Map) {
    const p1 = v1Map.get(p2.calendarId);
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

  for (const [, p1] of v1Map) {
    if (!v2Map.has(p1.calendarId)) {
      diffs.push({ field: "促销档期", oldValue: p1.promoName, newValue: "-", diffType: "deleted" });
    }
  }

  return diffs;
}

function computeSuggestionsFromData(
  salesHistory: SalesRecord[],
  inventorySnapshot: InventorySnapshot[],
  outOfStockRecords: OutOfStockRecord[]
): ReplenishmentSuggestion[] {
  const suggestions: ReplenishmentSuggestion[] = [];

  const salesBySku = new Map<string, SalesRecord[]>();
  salesHistory.forEach((r) => {
    const arr = salesBySku.get(r.skuId) || [];
    arr.push(r);
    salesBySku.set(r.skuId, arr);
  });

  const oosBySku = new Map<string, OutOfStockRecord[]>();
  outOfStockRecords.forEach((r) => {
    const arr = oosBySku.get(r.skuId) || [];
    arr.push(r);
    oosBySku.set(r.skuId, arr);
  });

  inventorySnapshot.forEach((snap) => {
    const sales = salesBySku.get(snap.skuId) || [];
    const oos = oosBySku.get(snap.skuId) || [];

    const avgDemand = sales.length > 0
      ? sales.reduce((sum, r) => sum + r.saleQty, 0) / sales.length
      : 0;

    const variance = sales.length > 1
      ? sales.reduce((sum, r) => sum + Math.pow(r.saleQty - avgDemand, 2), 0) / (sales.length - 1)
      : Math.pow(avgDemand * 0.3, 2);
    const stdDev = Math.sqrt(Math.max(0, variance));

    const leadTime = 7;
    const z = 1.65;
    const safetyStock = Math.max(1, Math.round(z * stdDev * Math.sqrt(leadTime)));
    const currentStock = snap.availableQty;
    const suggestedQty = Math.max(0, Math.round(safetyStock * 2.5 - currentStock));

    let confidence = 0.5;
    if (sales.length >= 3) confidence += 0.15;
    if (sales.length >= 5) confidence += 0.1;
    if (sales.length >= 7) confidence += 0.05;
    if (oos.length === 0) confidence += 0.1;
    if (oos.length > 0) confidence -= 0.05;
    confidence = Math.min(0.99, Math.max(0.3, confidence));

    let priority: ReplenishmentSuggestion["priority"] = "low";
    const ratio = currentStock / Math.max(1, safetyStock);
    if (snap.onHandQty < 0) priority = "critical";
    else if (ratio < 0.3) priority = "critical";
    else if (ratio < 0.6) priority = "high";
    else if (ratio < 1.0) priority = "medium";

    const anomalyTypes: string[] = [];
    if (snap.onHandQty < 0) anomalyTypes.push("negative_inventory");
    if (sales.some((r) => r.remarkVersion !== "v1")) anomalyTypes.push("remark_change");
    if (avgDemand > 0 && sales.some((r) => r.saleQty > avgDemand * 2)) anomalyTypes.push("demand_surge");
    if (oos.some((o) => o.evidenceType === "shortage")) anomalyTypes.push("shortage");
    if (oos.some((o) => o.evidenceType === "arrival_delay")) anomalyTypes.push("arrival_delay");

    suggestions.push({
      skuId: snap.skuId,
      skuName: snap.skuName || snap.skuId,
      category: snap.category || "未分类",
      store: snap.store || "默认仓库",
      suggestedQty,
      safetyStock,
      currentStock,
      confidence: +confidence.toFixed(2),
      priority,
      probabilityP50: Math.round(avgDemand),
      probabilityP75: Math.round(avgDemand + stdDev * 0.67),
      probabilityP90: Math.round(avgDemand + stdDev * 1.28),
      hasAnomaly: anomalyTypes.length > 0,
      anomalyTypes,
    });
  });

  return suggestions;
}

function computeEvidencesFromData(
  salesHistory: SalesRecord[],
  inventorySnapshot: InventorySnapshot[],
  outOfStockRecords: OutOfStockRecord[],
  promoCalendarV1: PromoCalendar[],
  promoCalendarV2: PromoCalendar[],
): EvidenceItem[] {
  const evidences: EvidenceItem[] = [];
  let id = 1;
  const nextId = () => `E-${String(id++).padStart(3, "0")}`;

  salesHistory.forEach((r) => {
    if (r.remarkVersion !== "v1" || r.remark.includes("(原:")) {
      const match = r.remark.match(/^(.*?)\(原:(.*?)\)$/);
      const newValue = match ? match[1] : r.remark;
      const originalValue = match ? match[2] : "正常销售";
      evidences.push({
        evidenceId: nextId(),
        skuId: r.skuId,
        eventDate: r.saleDate,
        eventType: "remark_change",
        description: `销售备注从"${originalValue}"变更为"${newValue}"`,
        sourceTable: "sales_history",
        isOverride: true,
        originalValue,
        overriddenValue: newValue,
        severity: "medium",
      });
    }
  });

  inventorySnapshot.forEach((snap) => {
    if (snap.onHandQty < 0) {
      evidences.push({
        evidenceId: nextId(),
        skuId: snap.skuId,
        eventDate: snap.snapshotDate,
        eventType: "negative_inventory",
        description: `系统显示负库存(${snap.onHandQty})，新版本快照可能已覆盖为0`,
        sourceTable: "inventory_snapshot",
        isOverride: true,
        originalValue: String(snap.onHandQty),
        overriddenValue: "0",
        severity: "high",
      });
    }
  });

  const salesBySku = new Map<string, SalesRecord[]>();
  salesHistory.forEach((r) => {
    const arr = salesBySku.get(r.skuId) || [];
    arr.push(r);
    salesBySku.set(r.skuId, arr);
  });

  salesBySku.forEach((records, skuId) => {
    if (records.length < 2) return;
    const avg = records.reduce((s, r) => s + r.saleQty, 0) / records.length;
    records.forEach((r) => {
      if (avg > 0 && r.saleQty > avg * 2) {
        evidences.push({
          evidenceId: nextId(),
          skuId,
          eventDate: r.saleDate,
          eventType: "demand_surge",
          description: `销量${r.saleQty}远超日均${avg.toFixed(0)}，增幅${((r.saleQty / avg - 1) * 100).toFixed(0)}%`,
          sourceTable: "sales_history",
          isOverride: false,
          originalValue: "",
          overriddenValue: "",
          severity: "high",
        });
      }
    });
  });

  outOfStockRecords.forEach((r) => {
    evidences.push({
      evidenceId: nextId(),
      skuId: r.skuId,
      eventDate: r.oosDate,
      eventType: r.evidenceType === "negative_inventory" ? "negative_inventory" : "shortage",
      description: `${r.source}记录缺货${r.oosQty}件，预估损失${r.lostSalesEst}件`,
      sourceTable: "out_of_stock",
      isOverride: false,
      originalValue: "",
      overriddenValue: "",
      severity: r.oosQty > 50 ? "high" : "medium",
    });
  });

  if (promoCalendarV1.length > 0 && promoCalendarV2.length > 0) {
    const v1Map = new Map(promoCalendarV1.map((p) => [p.calendarId, p]));
    promoCalendarV2.forEach((p2) => {
      const p1 = v1Map.get(p2.calendarId);
      if (p1 && (p1.endDate !== p2.endDate || p1.discountRate !== p2.discountRate)) {
        evidences.push({
          evidenceId: nextId(),
          skuId: "*",
          eventDate: p2.startDate,
          eventType: "promo_override",
          description: `促销日历v2: ${p2.promoName}变更（结束日${p1.endDate}→${p2.endDate}，折扣${p1.discountRate}→${p2.discountRate}）`,
          sourceTable: "promo_calendar",
          isOverride: true,
          originalValue: `结束${p1.endDate},折扣${p1.discountRate}`,
          overriddenValue: `结束${p2.endDate},折扣${p2.discountRate}`,
          severity: "medium",
        });
      }
    });
  }

  return evidences;
}

function computeConflictsFromData(
  salesHistory: SalesRecord[],
  inventorySnapshot: InventorySnapshot[],
  outOfStockRecords: OutOfStockRecord[],
): ConflictItem[] {
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

  return conflicts;
}

function computeConsistencyFromData(
  inventorySnapshot: InventorySnapshot[],
  conflicts: ConflictItem[],
): number {
  if (inventorySnapshot.length === 0) return 100;
  const conflictSkus = new Set(conflicts.map((c) => c.skuId));
  const consistent = inventorySnapshot.filter((s) => !conflictSkus.has(s.skuId)).length;
  return Math.round((consistent / inventorySnapshot.length) * 100);
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
    const suggestions = computeSuggestionsFromData(sampleSalesHistory, sampleInventorySnapshot, sampleOutOfStock);
    const evidences = computeEvidencesFromData(sampleSalesHistory, sampleInventorySnapshot, sampleOutOfStock, samplePromoCalendarV1, samplePromoCalendarV2);
    const conflicts = computeConflictsFromData(sampleSalesHistory, sampleInventorySnapshot, sampleOutOfStock);
    const consistencyRate = computeConsistencyFromData(sampleInventorySnapshot, conflicts);
    set({
      salesHistory: sampleSalesHistory,
      promoCalendarV1: samplePromoCalendarV1,
      promoCalendarV2: samplePromoCalendarV2,
      inventorySnapshot: sampleInventorySnapshot,
      outOfStockRecords: sampleOutOfStock,
      suggestions,
      evidences,
      conflicts,
      versionDiffs: computeVersionDiffsFromData(samplePromoCalendarV1, samplePromoCalendarV2),
      consistencyRate,
      dataSources: initialDataSources.map((ds) => {
        const counts: Record<string, number> = {
          sales: sampleSalesHistory.length,
          promo: samplePromoCalendarV1.length + samplePromoCalendarV2.length,
          inventory: sampleInventorySnapshot.length,
          oos: sampleOutOfStock.length,
        };
        return { ...ds, loaded: true, rowCount: counts[ds.id] || 0, fileName: "样例数据" };
      }),
      sampleLoaded: true,
    });
  },

  setSalesHistory: (data) => {
    set({ salesHistory: data });
    get().recomputeAll();
  },

  setPromoCalendarV2: (data) => {
    set({ promoCalendarV2: data });
    get().recomputeAll();
  },

  setInventorySnapshot: (data) => {
    set({ inventorySnapshot: data });
    get().recomputeAll();
  },

  setOutOfStockRecords: (data) => {
    set({ outOfStockRecords: data });
    get().recomputeAll();
  },

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

  recomputeAll: () => {
    const { salesHistory, inventorySnapshot, outOfStockRecords, promoCalendarV1, promoCalendarV2 } = get();
    const suggestions = computeSuggestionsFromData(salesHistory, inventorySnapshot, outOfStockRecords);
    const evidences = computeEvidencesFromData(salesHistory, inventorySnapshot, outOfStockRecords, promoCalendarV1, promoCalendarV2);
    const conflicts = computeConflictsFromData(salesHistory, inventorySnapshot, outOfStockRecords);
    const consistencyRate = computeConsistencyFromData(inventorySnapshot, conflicts);
    const versionDiffs = computeVersionDiffsFromData(promoCalendarV1, promoCalendarV2);
    set({ suggestions, evidences, conflicts, consistencyRate, versionDiffs });
  },

  computeVersionDiffs: () => {
    const { promoCalendarV1, promoCalendarV2 } = get();
    set({ versionDiffs: computeVersionDiffsFromData(promoCalendarV1, promoCalendarV2) });
  },

  computeConflicts: () => {
    const { salesHistory, inventorySnapshot, outOfStockRecords } = get();
    set({ conflicts: computeConflictsFromData(salesHistory, inventorySnapshot, outOfStockRecords) });
  },

  computeConsistency: () => {
    const { inventorySnapshot, conflicts } = get();
    set({ consistencyRate: computeConsistencyFromData(inventorySnapshot, conflicts) });
  },

  computeSuggestions: () => {
    const { salesHistory, inventorySnapshot, outOfStockRecords } = get();
    set({ suggestions: computeSuggestionsFromData(salesHistory, inventorySnapshot, outOfStockRecords) });
  },

  computeEvidences: () => {
    const { salesHistory, inventorySnapshot, outOfStockRecords, promoCalendarV1, promoCalendarV2 } = get();
    set({ evidences: computeEvidencesFromData(salesHistory, inventorySnapshot, outOfStockRecords, promoCalendarV1, promoCalendarV2) });
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
