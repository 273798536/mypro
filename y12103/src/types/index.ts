export interface SKU {
  id: string;
  skuId: string;
  name: string;
  skuName: string;
  category: string;
  unitCost: number;
  sellingPrice: number;
  leadTimeDays: number;
  reviewPeriodDays: number;
}

export interface SalesHistory {
  id: string;
  skuId: string;
  salesDate: string;
  quantitySold: number;
  storeId: string;
}

export interface InventorySnapshot {
  id: string;
  skuId: string;
  snapshotDate: string;
  currentStock: number;
  quantity: number;
  reservedStock: number;
  onOrderStock: number;
  warehouseId: string;
  warehouse: string;
}

export interface PromotionCalendar {
  id: string;
  skuId: string;
  startDate: string;
  endDate: string;
  promotionType: string;
  discountRate: number;
  expectedLift: number;
  isActive: boolean;
}

export type ForecastModel = 'poisson' | 'normal' | 'moving_average';

export interface ForecastResult {
  id: string;
  skuId: string;
  forecastDate: string;
  forecastMean: number;
  forecastStd: number;
  forecastLower95: number;
  forecastUpper95: number;
  standardDeviation: number;
  modelUsed: ForecastModel;
  versionId: string;
  historicalDemand: number[];
  zValue: number;
  mape: number;
  safetyStock: number;
  reorderPoint: number;
  affectedByPromotion: boolean;
  adjustedMean?: number;
}

export interface ReplenishmentSuggestion {
  id: string;
  skuId: string;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQuantity: number;
  suggestedOrderDate: string;
  expectedArrivalDate: string;
  serviceLevel: number;
  stockoutProbability: number;
  versionId: string;
  affectedByPromotion: boolean;
  promotionImpact?: {
    skuId: string;
    impactPercentage: number;
    fieldChanges: { field: string; oldValue: number; newValue: number }[];
  };
  currentStock: number;
  onOrderStock: number;
  forecastedDemand: number;
}

export type AnomalyType = 'demand_surge' | 'delivery_delay' | 'negative_stock';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalySeverity = Severity;

export interface AnomalyRecord {
  id: string;
  skuId: string;
  type: AnomalyType;
  anomalyType: AnomalyType;
  detectedAt: string;
  detectionDate: string;
  severity: Severity;
  description: string;
  impactAssessment: string;
  recommendation: string;
  versionId: string;
  details: Record<string, any>;
}

export interface DataVersion {
  id: string;
  versionId: string;
  name: string;
  versionName: string;
  createdAt: string;
  description: string;
  hasPromotionData: boolean;
  parentVersionId?: string;
  hash: string;
  inputDataHash: string;
  parameters: ForecastParameters;
  data: {
    skus: SKU[];
    salesHistory: SalesHistory[];
    inventorySnapshots: InventorySnapshot[];
    promotionCalendar?: PromotionCalendar[];
    replenishmentSuggestions: ReplenishmentSuggestion[];
    anomalyRecords: AnomalyRecord[];
    forecastResults: ForecastResult[];
  };
}

export interface ForecastParameters {
  serviceLevel: number;
  forecastHorizonDays: number;
  safetyStockMultiplier: number;
  demandSurgeThreshold: number;
}

export interface ComparisonResult {
  version1: DataVersion;
  version2: DataVersion;
  differences: {
    skuId: string;
    field: string;
    value1: any;
    value2: any;
    changeType: 'increase' | 'decrease' | 'added' | 'removed';
    changePercentage?: number;
  }[];
  promotionAffectedSkus: string[];
  summary: {
    totalSkus: number;
    changedSkus: number;
    avgImpactPercentage: number;
  };
  healthScoreChange: {
    leftOverall: number;
    rightOverall: number;
  };
  totalOrderQuantityChange: {
    left: number;
    right: number;
    change: number;
  };
  totalOrderValueChange: {
    left: number;
    right: number;
    change: number;
  };
  affectedByPromotionCount: number;
  statusChangedCount: number;
  skuComparisons: {
    skuId: string;
    left: ReplenishmentSuggestion;
    right: ReplenishmentSuggestion;
    promotionImpact?: {
      skuId: string;
      impactPercentage: number;
      fieldChanges: { field: string; oldValue: number; newValue: number }[];
    };
  }[];
}

export type ImportStep = 'sales' | 'inventory' | 'promotion' | 'complete';

export interface ImportState {
  step: ImportStep;
  salesImported: boolean;
  inventoryImported: boolean;
  promotionImported: boolean;
  salesRowCount: number;
  inventoryRowCount: number;
  promotionRowCount: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ValidationError[];
  rowCount: number;
  preview: T[];
}

export interface InventoryHealthScore {
  overall: number;
  stockoutRisk: number;
  overstockRisk: number;
  capitalEfficiency: number;
  turnoverScore: number;
}

export type StockStatus = 'healthy' | 'warning' | 'shortage' | 'overstock';

export interface SkuStockStatus {
  skuId: string;
  status: StockStatus;
  currentStock: number;
  safetyStock: number;
  daysOfStock: number;
}

export interface BoundaryCase {
  id: string;
  name: string;
  description: string;
  type: AnomalyType;
  scenario: string;
  inputData: {
    salesHistory: SalesHistory[];
    inventorySnapshot: InventorySnapshot[];
  };
  expectedOutput: {
    anomalyDetected: boolean;
    severity: Severity;
    replenishmentAdjustment: string;
  };
  explanation: string;
}
