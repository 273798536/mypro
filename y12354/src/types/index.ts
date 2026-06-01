export interface IVCurveData {
  id: string;
  serialNumber: string;
  voltage: number[];
  current: number[];
  temperature: number;
  irradiance: number;
  timestamp: number;
  hash: string;
}

export interface TraceNode {
  id: string;
  name: string;
  type: 'curveFitting' | 'temperatureCorrection' | 'faultClassification';
  input: any;
  output: any;
  parameters: Record<string, any>;
  status: 'success' | 'warning' | 'error';
  duration: number;
}

export interface Abnormality {
  id: string;
  parameter: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'error';
  description: string;
  explanation: string;
}

export interface DiagnosisResult {
  id: string;
  curveId: string;
  inputHash: string;
  parameters: {
    voc: number;
    isc: number;
    vm: number;
    im: number;
    ff: number;
    rs: number;
    rsh: number;
  };
  abnormalities: Abnormality[];
  traceNodes: TraceNode[];
  faultLevel: 'normal' | 'warning' | 'error';
  createdAt: number;
}

export interface Clue {
  id: string;
  type: 'curve' | 'temperature' | 'photo' | 'note';
  name: string;
  url?: string;
  data?: any;
  timestamp: number;
}

export interface DiagnosisEvent {
  id: string;
  title: string;
  description: string;
  curves: string[];
  clues: Clue[];
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
}

export interface Problem {
  id: string;
  type: 'temperatureNotCorrected' | 'shadingMisjudgment' | 'serialNumberConfusion';
  typeName: string;
  triggerSource: string;
  stuckPoint: string;
  nextStep: string;
  status: 'pending' | 'resolved';
  diagnosisId: string;
  createdAt: number;
}
