export interface BallastVersion {
  id: string;
  shipModelId: string;
  version: string;
  foreTank: number;
  aftTank: number;
  portTank: number;
  starboardTank: number;
  totalBallast: number;
  remark: string;
  operator: string;
  createdAt: string;
  isDeleted: boolean;
}

export interface WeatherEvidence {
  id: string;
  stabilityResultId: string;
  weatherLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  windForce: number;
  waveHeight: number;
  influenceFactor: number;
  recordedAt: string;
}

export interface ManualCheckRecord {
  id: string;
  stabilityResultId: string;
  checker: string;
  checkItem: 'gravityOffset' | 'overload' | 'ballast' | 'consistency';
  checkResult: 'confirmed' | 'adjusted' | 'rejected';
  originalValue: any;
  adjustedValue?: any;
  remark: string;
  signature: string;
  createdAt: string;
}

export interface StabilityResult {
  id: string;
  shipModelId: string;
  cargoGridId: string;
  ballastVersionId: string;
  GM: number;
  heelAngle: number;
  trimAngle: number;
  centerOfGravity: {
    x: number;
    y: number;
    z: number;
  };
  centerOfBuoyancy: {
    x: number;
    y: number;
    z: number;
  };
  displacement: number;
  modelConclusion: 'safe' | 'warning' | 'danger';
  gridConclusion: 'safe' | 'warning' | 'danger';
  isConsistent: boolean;
  overloadCells: string[];
  gravityOffset: {
    distance: number;
    direction: string;
    allowable: number;
  };
  weatherEvidenceId?: string;
  manualCheckIds: string[];
  createdAt: string;
}

export interface ExportReport {
  id: string;
  stabilityResultId: string;
  shipModelId: string;
  cargoGridId: string;
  ballastVersionId: string;
  screenshot?: string;
  exportedAt: string;
  exporter: string;
}

export interface StabilityCalculationParams {
  shipModelId: string;
  cargoGridId: string;
  ballastVersionId: string;
  weatherLevel: number;
}
