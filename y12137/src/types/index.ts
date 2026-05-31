export interface Task {
  id: string;
  name: string;
  status: 'pending' | 'calculating' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  totalRiskCount?: number;
  safetyScore?: number;
  isDuplicate?: boolean;
  packageCount?: number;
}

export interface RawDataPackage {
  id: string;
  taskId: string;
  type: 'waypoint_plan' | 'payload_weight' | 'wind_field' | 'battery' | 'mixed';
  source: string;
  content: any;
  importedBy: string;
  importedAt: string;
  isProcessed: boolean;
}

export interface EnergyModelResult {
  totalEnergyRequired: number;
  remainingEnergy: number;
  energyCurve: EnergyPoint[];
  effectiveDistance: number;
  averagePower: number;
  maxPower: number;
  hasWindSuddenChange: boolean;
  windSuddenChangePoint?: number;
  windSpeedIncrease?: number;
  energyIncreasePercentage?: number;
}

export interface EnergyPoint {
  distance: number;
  power: number;
  energyConsumed: number;
  batteryLevel: number;
  windSpeed: number;
  altitude: number;
}

export interface ReturnThresholdResult {
  minBatteryLevel: number;
  maxSafeDistance: number;
  returnUrgency: 'low' | 'medium' | 'high' | 'critical';
  safetyScore: number;
  distanceMargin: number;
  batteryMargin: number;
  windAdjustmentFactor: number;
}

export interface Risk {
  id: string;
  type: RiskType;
  level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  sourcePackageId?: string;
  affectedDistance?: number;
  energyIncrease?: number;
  recommendation: string;
}

export type RiskType = 
  | 'headwind_sudden_change'
  | 'battery_aging'
  | 'no_fly_zone_detour'
  | 'insufficient_battery'
  | 'payload_exceed'
  | 'wind_exceed_limit'
  | 'altitude_exceed';

export interface CalculationResult {
  id: string;
  taskId: string;
  energyModel: EnergyModelResult;
  returnThreshold: ReturnThresholdResult;
  risks: Risk[];
  calculatedAt: string;
  safetyScore: number;
  isDuplicate?: boolean;
  duplicateOfTaskId?: string;
}

export interface CorrectionLog {
  id: string;
  taskId: string;
  action: 'correction' | 'import' | 'calculation' | 'report' | 'status_change';
  parameter: string;
  oldValue: any;
  newValue: any;
  correctedBy: string;
  reason: string;
  timestamp: string;
  sourcePackageId?: string;
}

export interface TraceNode {
  id: string;
  type: 'raw_data' | 'calculation_step' | 'correction' | 'result';
  description: string;
  value: any;
  source: string;
  timestamp: string;
  previousNodeId?: string;
  sourcePackageId?: string;
}

export interface SourceTrace {
  id: string;
  resultId: string;
  traceChain: TraceNode[];
  created_at: string;
}

export interface Report {
  taskId: string;
  taskName: string;
  generatedAt: string;
  summary: {
    totalEnergy: number;
    minBatteryLevel: number;
    safetyScore: number;
    riskCount: number;
    criticalRiskCount: number;
  };
  risks: Risk[];
  energyModel: EnergyModelResult;
  returnThreshold: ReturnThresholdResult;
  dataSources: {
    source: string;
    type: string;
    preview: string;
    packageId: string;
  }[];
  correctionHistory: CorrectionLog[];
  calculationTrace: TraceNode[];
  conclusions: string[];
  recommendations: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface TaskCreateRequest {
  name: string;
  description?: string;
}

export interface ImportPackageRequest {
  type: string;
  content: any;
  source: string;
  importedBy: string;
}

export interface ImportMixedPackageRequest {
  mixedData: any;
  source: string;
  importedBy: string;
}

export interface CorrectionRequest {
  parameter: string;
  oldValue: any;
  newValue: any;
  reason: string;
  correctedBy: string;
}
