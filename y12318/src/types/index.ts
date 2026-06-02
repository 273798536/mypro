export interface SalesRecord {
  skuId: string;
  saleDate: string;
  saleQty: number;
  remark: string;
  remarkVersion: string;
  updatedAt: string;
}

export interface PromoCalendar {
  calendarId: string;
  version: number;
  startDate: string;
  endDate: string;
  promoType: string;
  promoName: string;
  discountRate: number;
}

export interface InventorySnapshot {
  skuId: string;
  skuName?: string;
  category?: string;
  store?: string;
  snapshotDate: string;
  onHandQty: number;
  inTransitQty: number;
  availableQty: number;
  conclusion: string;
}

export interface OutOfStockRecord {
  recordId: string;
  skuId: string;
  oosDate: string;
  oosQty: number;
  lostSalesEst: number;
  source: string;
  evidenceType: string;
}

export interface ReplenishmentSuggestion {
  skuId: string;
  skuName: string;
  category: string;
  store: string;
  suggestedQty: number;
  safetyStock: number;
  currentStock: number;
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  probabilityP50: number;
  probabilityP75: number;
  probabilityP90: number;
  hasAnomaly: boolean;
  anomalyTypes: string[];
}

export interface EvidenceItem {
  evidenceId: string;
  skuId: string;
  eventDate: string;
  eventType: "shortage" | "negative_inventory" | "demand_surge" | "arrival_delay" | "remark_change" | "promo_override";
  description: string;
  sourceTable: string;
  isOverride: boolean;
  originalValue: string;
  overriddenValue: string;
  severity: "high" | "medium" | "low";
}

export interface VersionDiff {
  field: string;
  oldValue: string;
  newValue: string;
  diffType: "added" | "modified" | "deleted";
}

export interface ConflictItem {
  skuId: string;
  salesConclusion: string;
  inventoryConclusion: string;
  severity: "high" | "medium" | "low";
  description: string;
}

export interface DataSourceStatus {
  id: "sales" | "promo" | "inventory" | "oos";
  name: string;
  loaded: boolean;
  rowCount: number;
  fileName: string;
  loading: boolean;
}
