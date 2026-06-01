import type {
  SalesRecord,
  PromoCalendar,
  InventorySnapshot,
  OutOfStockRecord,
  ReplenishmentSuggestion,
  EvidenceItem,
  ConflictItem,
} from "@/types";

export const sampleSalesHistory: SalesRecord[] = [
  { skuId: "SKU-001", saleDate: "2026-05-15", saleQty: 120, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-001", saleDate: "2026-05-16", saleQty: 95, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-16T08:00:00Z" },
  { skuId: "SKU-001", saleDate: "2026-05-17", saleQty: 210, remark: "促销拉量(原:正常销售)", remarkVersion: "v2", updatedAt: "2026-05-18T10:30:00Z" },
  { skuId: "SKU-001", saleDate: "2026-05-18", saleQty: 180, remark: "促销拉量", remarkVersion: "v2", updatedAt: "2026-05-18T10:30:00Z" },
  { skuId: "SKU-002", saleDate: "2026-05-15", saleQty: 45, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-002", saleDate: "2026-05-16", saleQty: 52, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-16T08:00:00Z" },
  { skuId: "SKU-002", saleDate: "2026-05-17", saleQty: 48, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-17T08:00:00Z" },
  { skuId: "SKU-003", saleDate: "2026-05-15", saleQty: 300, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-003", saleDate: "2026-05-16", saleQty: 320, remark: "需求突增(原:正常销售)", remarkVersion: "v2", updatedAt: "2026-05-17T09:00:00Z" },
  { skuId: "SKU-003", saleDate: "2026-05-17", saleQty: 350, remark: "需求突增", remarkVersion: "v2", updatedAt: "2026-05-17T09:00:00Z" },
  { skuId: "SKU-004", saleDate: "2026-05-15", saleQty: 80, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-004", saleDate: "2026-05-16", saleQty: 75, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-16T08:00:00Z" },
  { skuId: "SKU-005", saleDate: "2026-05-15", saleQty: 200, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-005", saleDate: "2026-05-16", saleQty: 195, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-16T08:00:00Z" },
  { skuId: "SKU-005", saleDate: "2026-05-17", saleQty: 50, remark: "缺货影响(原:正常销售)", remarkVersion: "v2", updatedAt: "2026-05-18T11:00:00Z" },
  { skuId: "SKU-006", saleDate: "2026-05-15", saleQty: 160, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-006", saleDate: "2026-05-16", saleQty: 155, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-16T08:00:00Z" },
  { skuId: "SKU-006", saleDate: "2026-05-17", saleQty: 170, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-17T08:00:00Z" },
  { skuId: "SKU-007", saleDate: "2026-05-15", saleQty: 90, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-007", saleDate: "2026-05-16", saleQty: 85, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-16T08:00:00Z" },
  { skuId: "SKU-008", saleDate: "2026-05-15", saleQty: 250, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-15T08:00:00Z" },
  { skuId: "SKU-008", saleDate: "2026-05-16", saleQty: 240, remark: "正常销售", remarkVersion: "v1", updatedAt: "2026-05-16T08:00:00Z" },
  { skuId: "SKU-008", saleDate: "2026-05-17", saleQty: 260, remark: "促销拉量(原:正常销售)", remarkVersion: "v2", updatedAt: "2026-05-18T09:30:00Z" },
];

export const samplePromoCalendarV1: PromoCalendar[] = [
  { calendarId: "P001", version: 1, startDate: "2026-05-17", endDate: "2026-05-19", promoType: "满减", promoName: "520大促", discountRate: 0.8 },
  { calendarId: "P002", version: 1, startDate: "2026-05-25", endDate: "2026-05-27", promoType: "折扣", promoName: "月末清仓", discountRate: 0.7 },
  { calendarId: "P003", version: 1, startDate: "2026-06-01", endDate: "2026-06-03", promoType: "买赠", promoName: "儿童节特惠", discountRate: 0.85 },
];

export const samplePromoCalendarV2: PromoCalendar[] = [
  { calendarId: "P001", version: 2, startDate: "2026-05-17", endDate: "2026-05-20", promoType: "满减", promoName: "520大促(延期)", discountRate: 0.75 },
  { calendarId: "P002", version: 2, startDate: "2026-05-25", endDate: "2026-05-27", promoType: "折扣", promoName: "月末清仓", discountRate: 0.7 },
  { calendarId: "P004", version: 2, startDate: "2026-06-05", endDate: "2026-06-07", promoType: "限时", promoName: "年中大促预热", discountRate: 0.65 },
];

export const sampleInventorySnapshot: InventorySnapshot[] = [
  { skuId: "SKU-001", snapshotDate: "2026-05-18", onHandQty: 150, inTransitQty: 50, availableQty: 200, conclusion: "库存充足" },
  { skuId: "SKU-002", snapshotDate: "2026-05-18", onHandQty: 30, inTransitQty: 10, availableQty: 40, conclusion: "库存偏低" },
  { skuId: "SKU-003", snapshotDate: "2026-05-18", onHandQty: 15, inTransitQty: 0, availableQty: 15, conclusion: "库存告急" },
  { skuId: "SKU-004", snapshotDate: "2026-05-18", onHandQty: -5, inTransitQty: 20, availableQty: 15, conclusion: "负库存" },
  { skuId: "SKU-005", snapshotDate: "2026-05-18", onHandQty: 8, inTransitQty: 0, availableQty: 8, conclusion: "严重缺货" },
  { skuId: "SKU-006", snapshotDate: "2026-05-18", onHandQty: 200, inTransitQty: 30, availableQty: 230, conclusion: "库存充足" },
  { skuId: "SKU-007", snapshotDate: "2026-05-18", onHandQty: 45, inTransitQty: 0, availableQty: 45, conclusion: "库存适中" },
  { skuId: "SKU-008", snapshotDate: "2026-05-18", onHandQty: -3, inTransitQty: 10, availableQty: 7, conclusion: "负库存" },
];

export const sampleOutOfStock: OutOfStockRecord[] = [
  { recordId: "OOS-001", skuId: "SKU-003", oosDate: "2026-05-18", oosQty: 85, lostSalesEst: 42, source: "POS系统", evidenceType: "shortage" },
  { recordId: "OOS-002", skuId: "SKU-005", oosDate: "2026-05-17", oosQty: 145, lostSalesEst: 78, source: "门店报损", evidenceType: "shortage" },
  { recordId: "OOS-003", skuId: "SKU-005", oosDate: "2026-05-18", oosQty: 160, lostSalesEst: 88, source: "POS系统", evidenceType: "shortage" },
  { recordId: "OOS-004", skuId: "SKU-004", oosDate: "2026-05-18", oosQty: 5, lostSalesEst: 3, source: "系统盘点", evidenceType: "negative_inventory" },
  { recordId: "OOS-005", skuId: "SKU-008", oosDate: "2026-05-18", oosQty: 3, lostSalesEst: 2, source: "系统盘点", evidenceType: "negative_inventory" },
  { recordId: "OOS-006", skuId: "SKU-002", oosDate: "2026-05-19", oosQty: 12, lostSalesEst: 6, source: "POS系统", evidenceType: "shortage" },
];

export const sampleSuggestions: ReplenishmentSuggestion[] = [
  { skuId: "SKU-001", skuName: "纯牛奶 1L", category: "乳制品", store: "华东仓", suggestedQty: 300, safetyStock: 180, currentStock: 200, confidence: 0.92, priority: "medium", probabilityP50: 130, probabilityP75: 165, probabilityP90: 210, hasAnomaly: true, anomalyTypes: ["remark_change"] },
  { skuId: "SKU-002", skuName: "有机鸡蛋 10枚", category: "蛋品", store: "华东仓", suggestedQty: 80, safetyStock: 60, currentStock: 40, confidence: 0.85, priority: "high", probabilityP50: 48, probabilityP75: 58, probabilityP90: 72, hasAnomaly: false, anomalyTypes: [] },
  { skuId: "SKU-003", skuName: "进口牛排 200g", category: "肉制品", store: "华北仓", suggestedQty: 500, safetyStock: 250, currentStock: 15, confidence: 0.78, priority: "critical", probabilityP50: 280, probabilityP75: 340, probabilityP90: 420, hasAnomaly: true, anomalyTypes: ["demand_surge"] },
  { skuId: "SKU-004", skuName: "蓝莓 125g", category: "水果", store: "华南仓", suggestedQty: 120, safetyStock: 80, currentStock: -5, confidence: 0.71, priority: "critical", probabilityP50: 75, probabilityP75: 95, probabilityP90: 115, hasAnomaly: true, anomalyTypes: ["negative_inventory", "arrival_delay"] },
  { skuId: "SKU-005", skuName: "大米 5kg", category: "粮食", store: "华东仓", suggestedQty: 400, safetyStock: 150, currentStock: 8, confidence: 0.88, priority: "critical", probabilityP50: 160, probabilityP75: 200, probabilityP90: 260, hasAnomaly: true, anomalyTypes: ["shortage", "remark_change"] },
  { skuId: "SKU-006", skuName: "橄榄油 500ml", category: "调味品", store: "华东仓", suggestedQty: 50, safetyStock: 120, currentStock: 230, confidence: 0.95, priority: "low", probabilityP50: 140, probabilityP75: 155, probabilityP90: 175, hasAnomaly: false, anomalyTypes: [] },
  { skuId: "SKU-007", skuName: "全麦面包 400g", category: "烘焙", store: "华南仓", suggestedQty: 60, safetyStock: 50, currentStock: 45, confidence: 0.82, priority: "medium", probabilityP50: 42, probabilityP75: 52, probabilityP90: 65, hasAnomaly: false, anomalyTypes: [] },
  { skuId: "SKU-008", skuName: "三文鱼 300g", category: "海鲜", store: "华北仓", suggestedQty: 200, safetyStock: 100, currentStock: -3, confidence: 0.74, priority: "critical", probabilityP50: 110, probabilityP75: 140, probabilityP90: 180, hasAnomaly: true, anomalyTypes: ["negative_inventory", "remark_change"] },
];

export const sampleEvidences: EvidenceItem[] = [
  { evidenceId: "E-001", skuId: "SKU-001", eventDate: "2026-05-18", eventType: "remark_change", description: "销售备注从\"正常销售\"变更为\"促销拉量\"，与促销日历P001关联", sourceTable: "sales_history", isOverride: true, originalValue: "正常销售", overriddenValue: "促销拉量", severity: "medium" },
  { evidenceId: "E-002", skuId: "SKU-003", eventDate: "2026-05-17", eventType: "demand_surge", description: "销量从日均150突增至350，增幅133%，需人工核验是否为真实需求", sourceTable: "sales_history", isOverride: false, originalValue: "", overriddenValue: "", severity: "high" },
  { evidenceId: "E-003", skuId: "SKU-003", eventDate: "2026-05-18", eventType: "shortage", description: "POS系统记录缺货85件，预估损失销售42件", sourceTable: "out_of_stock", isOverride: false, originalValue: "", overriddenValue: "", severity: "high" },
  { evidenceId: "E-004", skuId: "SKU-004", eventDate: "2026-05-18", eventType: "negative_inventory", description: "系统盘点显示负库存(-5)，新版本库存快照已覆盖为0", sourceTable: "inventory_snapshot", isOverride: true, originalValue: "-5", overriddenValue: "0", severity: "high" },
  { evidenceId: "E-005", skuId: "SKU-004", eventDate: "2026-05-17", eventType: "arrival_delay", description: "原计划5/17到货20件延迟至5/20，延迟3天", sourceTable: "inventory_snapshot", isOverride: false, originalValue: "2026-05-17", overriddenValue: "2026-05-20", severity: "medium" },
  { evidenceId: "E-006", skuId: "SKU-005", eventDate: "2026-05-17", eventType: "shortage", description: "门店报损缺货145件，POS系统次日确认缺货160件", sourceTable: "out_of_stock", isOverride: false, originalValue: "", overriddenValue: "", severity: "high" },
  { evidenceId: "E-007", skuId: "SKU-005", eventDate: "2026-05-18", eventType: "remark_change", description: "销售备注从\"正常销售\"变更为\"缺货影响\"，销售量从195降至50", sourceTable: "sales_history", isOverride: true, originalValue: "正常销售", overriddenValue: "缺货影响", severity: "high" },
  { evidenceId: "E-008", skuId: "SKU-008", eventDate: "2026-05-18", eventType: "negative_inventory", description: "负库存(-3)被新版本快照覆盖为0，原始记录已不可见", sourceTable: "inventory_snapshot", isOverride: true, originalValue: "-3", overriddenValue: "0", severity: "high" },
  { evidenceId: "E-009", skuId: "SKU-008", eventDate: "2026-05-18", eventType: "remark_change", description: "销售备注从\"正常销售\"变更为\"促销拉量\"，与促销日历P001关联", sourceTable: "sales_history", isOverride: true, originalValue: "正常销售", overriddenValue: "促销拉量", severity: "medium" },
  { evidenceId: "E-010", skuId: "SKU-001", eventDate: "2026-05-17", eventType: "promo_override", description: "促销日历v2将520大促结束日从5/19延至5/20，折扣从0.8加深至0.75", sourceTable: "promo_calendar", isOverride: true, originalValue: "结束5/19,折扣0.8", overriddenValue: "结束5/20,折扣0.75", severity: "medium" },
  { evidenceId: "E-011", skuId: "SKU-005", eventDate: "2026-05-18", eventType: "shortage", description: "POS系统确认缺货160件，预估损失销售88件", sourceTable: "out_of_stock", isOverride: false, originalValue: "", overriddenValue: "", severity: "high" },
];

export const sampleConflicts: ConflictItem[] = [
  { skuId: "SKU-001", salesConclusion: "促销拉量导致销量上升", inventoryConclusion: "库存充足，无需补货", severity: "low", description: "销售端认为促销拉量需要补货，但库存快照显示当前库存可覆盖" },
  { skuId: "SKU-003", salesConclusion: "需求突增需紧急补货", inventoryConclusion: "库存告急但未触发紧急", severity: "high", description: "销售历史显示需求突增133%，库存快照仅标注告急而非紧急" },
  { skuId: "SKU-005", salesConclusion: "缺货影响销售大幅下降", inventoryConclusion: "严重缺货", severity: "medium", description: "结论一致但口径不同：销售端强调销量下降，库存端强调缺货量" },
  { skuId: "SKU-008", salesConclusion: "促销拉量导致销量上升", inventoryConclusion: "负库存", severity: "high", description: "销售端认为是促销效应，但库存快照显示负库存，矛盾严重" },
];
