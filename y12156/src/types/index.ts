export type MaterialCategory = 'concrete' | 'masonry' | 'insulation' | 'wood' | 'metal' | 'glass' | 'other';

export interface Material {
  id: string;
  name: string;
  thermalConductivity: number;
  thickness?: number;
  density: number;
  specificHeat: number;
  category: MaterialCategory;
  maintainedBy: string;
  lastUpdated: Date;
  sourceRecord?: string;
}

export type NodeType = 'linear' | 'point';
export type NodePosition = 'internal' | 'external';

export interface ConstructionNode {
  id: string;
  nodeCode?: string;
  name: string;
  layerOrder?: number;
  materialId: string;
  thickness: number;
  area?: number;
  length?: number;
  type: NodeType;
  position?: NodePosition;
  isThermalBridge?: boolean;
  bridgeType?: 'linear' | 'point' | 'planar';
  psiValue?: number;
  chiValue?: number;
  bridgeLength?: number;
  maintainedBy: string;
  lastUpdated: Date;
  sourceRecord?: string;
}

export interface WallConstruction {
  id: string;
  name: string;
  nodes: ConstructionNode[];
  maintainedBy: string;
  lastUpdated: Date;
}

export interface MaterialLibrary {
  id: string;
  name: string;
  materials: Material[];
  maintainedBy: string;
  lastUpdated: Date;
}

export interface EnvironmentParams {
  indoorTemperature: number;
  outdoorTemperature: number;
  calculationPeriod: number;
  relativeHumidity?: number;
}

export type ConflictType = 'material_thickness' | 'thermal_conductivity' | 'material_assignment';

export interface DataConflict {
  id: string;
  type: ConflictType;
  fieldName: string;
  nodeId: string;
  materialId: string;
  constructionValue: number | string;
  materialValue: number | string;
  constructionSource: string;
  materialSource: string;
  constructionMaintainer: string;
  materialMaintainer: string;
  resolved: boolean;
  resolvedValue?: number | string;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNote?: string;
}

export type IssueType = 'missing_parameter' | 'duplicate_node' | 'reversed_temperature';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  humanReadableExplanation: string;
  sourceRecordId: string;
  sourceRecordType: 'node' | 'material' | 'environment';
  fieldName?: string;
  expectedValue?: number | string;
  actualValue?: number | string;
}

export interface HeatFlowNode {
  nodeId: string;
  nodeName: string;
  nodeCode: string;
  heatFlowDensity: number;
  heatFlowRate: number;
  thermalResistance: number;
  temperatureDrop: number;
  calculationDetails: {
    formula: string;
    inputs: Record<string, number>;
  };
  isThermalBridge: boolean;
}

export type CalculationStatus = 'success' | 'failed' | 'partial';

export interface CalculationResult {
  id: string;
  calculationId: string;
  status: CalculationStatus;
  totalHeatLoss: number;
  totalHeatLossMonthly?: number;
  averageUValue: number;
  heatFlowNodes: HeatFlowNode[];
  thermalBridgeLoss: number;
  thermalBridgeLossRatio: number;
  monthlyEnergyConsumption: {
    kwh: number;
    cost?: number;
  };
  applicableScope: string;
  failureReasons: string[];
  dataSourceChain: Array<{
    type: 'construction' | 'material' | 'environment';
    id: string;
    name: string;
    maintainer: string;
  }>;
  calculatedAt: Date;
  units: {
    [key: string]: string;
  };
}

export type TaskStatus = 'draft' | 'conflict_pending' | 'validation_failed' | 'ready' | 'calculating' | 'completed' | 'failed';

export interface ThermalBridgeCalculation {
  id: string;
  name: string;
  wallConstruction: WallConstruction;
  materialLibrary: MaterialLibrary;
  environmentParams: EnvironmentParams;
  conflicts: DataConflict[];
  validationIssues: ValidationIssue[];
  result?: CalculationResult;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportData {
  calculation: ThermalBridgeCalculation;
  result: CalculationResult;
  generatedAt: Date;
  summary: {
    totalHeatLoss: number;
    thermalBridgeLoss: number;
    bridgeLossRatio: number;
    monthlyEnergyCost: number;
    issuesCount: number;
    conflictsCount: number;
  };
}
