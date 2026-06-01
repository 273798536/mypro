export type FluidType = 'water' | 'steam' | 'air' | 'refrigerant';

export type UnitSystem = 'metric' | 'imperial';

export type DiameterUnit = 'mm' | 'cm' | 'm' | 'inch';

export type LengthUnit = 'm' | 'km' | 'ft';

export type FlowUnit = 'm³/h' | 'L/s' | 'm³/s' | 'gpm';

export type PressureUnit = 'Pa' | 'kPa' | 'bar' | 'psi' | 'mH2O';

export type ValveType = 'gate' | 'globe' | 'ball' | 'butterfly' | 'check';

export type ElbowAngle = 45 | 90 | 180;

export interface PipeSegment {
  id: string;
  name: string;
  diameter: number;
  diameterUnit: DiameterUnit;
  length: number;
  lengthUnit: LengthUnit;
  roughness: number;
  elbowCount: number;
  elbowAngle: ElbowAngle;
  notes?: string;
}

export interface ValveConfig {
  id: string;
  valveType: ValveType;
  openingPercentage: number;
  isHalfOpen: boolean;
  snapshotTimestamp: number;
}

export interface Branch {
  id: string;
  name: string;
  flowRateRatio: number;
  segments: PipeSegment[];
  valveConfig: ValveConfig;
  isMissingData: boolean;
  missingFields: string[];
}

export interface FluidProperties {
  type: FluidType;
  temperature: number;
  density: number;
  viscosity: number;
}

export interface UnitValidationResult {
  field: string;
  value: number;
  currentUnit: string;
  suggestedUnit?: string;
  errorType: 'none' | 'suspicious' | 'invalid' | 'inconsistent';
  message: string;
  confidence: number;
}

export interface IntermediateResult {
  id: string;
  name: string;
  value: number;
  unit: string;
  formula: string;
  inputs: Record<string, { value: number; unit: string }>;
  timestamp: number;
}

export interface PressureDropResult {
  segmentId: string;
  reynoldsNumber: IntermediateResult;
  frictionFactor: IntermediateResult;
  frictionLoss: IntermediateResult;
  localLoss: IntermediateResult;
  valveLoss: IntermediateResult;
  totalLoss: IntermediateResult;
  flowVelocity: IntermediateResult;
}

export interface ContradictionResult {
  type: 'diameter_flow_mismatch' | 'segment_inconsistent' | 'unit_error' | 'branch_missing';
  severity: 'warning' | 'error';
  message: string;
  evidence: {
    fieldA: { name: string; value: number; unit: string };
    fieldB?: { name: string; value: number; unit: string };
    valveSnapshot?: ValveConfig;
    suggestion: string;
  };
}

export interface EvidenceSnapshot {
  id: string;
  type: 'valve_state' | 'unit_correction' | 'branch_addition' | 'parameter_change';
  description: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  timestamp: number;
  userNote?: string;
}

export interface CalculationSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  unitSystem: UnitSystem;
  fluid: FluidProperties;
  totalFlowRate: number;
  flowRateUnit: FlowUnit;
  mainSegments: PipeSegment[];
  branches: Branch[];
  mainValve: ValveConfig;
  results: {
    segmentResults: Record<string, PressureDropResult>;
    branchResults: Record<string, PressureDropResult>;
    totalPressureDrop: number;
    pressureDropUnit: PressureUnit;
    contradictions: ContradictionResult[];
    unitValidations: UnitValidationResult[];
    evidenceChain: EvidenceSnapshot[];
  } | null;
  status: 'draft' | 'calculating' | 'completed' | 'error';
}

export interface ExportReport {
  sessionId: string;
  generatedAt: number;
  summary: {
    totalPressureDrop: number;
    unit: PressureUnit;
    totalFlowRate: number;
    flowUnit: FlowUnit;
    contradictionCount: number;
    warningCount: number;
  };
  fullResults: CalculationSession['results'];
  inputParameters: {
    fluid: FluidProperties;
    segments: PipeSegment[];
    branches: Branch[];
    valve: ValveConfig;
  };
}
