export interface ParamChange {
  paramName: string;
  beforeValue: string;
  afterValue: string;
}

export interface Attachment {
  id: string;
  recordId: string;
  name: string;
  type: string;
  isLateArrival: boolean;
  impactDescription?: string;
  originalConclusion?: string;
  revisedConclusion?: string;
  paramChanges?: ParamChange[];
}

export interface AnomalyPoint {
  id: string;
  recordId: string;
  source: 'alarm' | 'manual_note' | 'late_attachment';
  description: string;
  explanation: string;
}

export interface EquipmentRecord {
  id: string;
  equipmentCode: string;
  recordType: 'smooth' | 'supplementary' | 'anomalous';
  ratedTension: number;
  measuredTension: number;
  paramVersion: string;
  paramVersionHistory: string[];
  judgment: string;
  nameplateId: string;
  attachments: Attachment[];
  anomalyPoints: AnomalyPoint[];
}

export interface NameplateData {
  id: string;
  equipmentCode: string;
  ratedTension: number;
  calibrationDate: string;
  calibrationUnit: string;
  originalSpec: string;
}

export interface JudgmentHistory {
  id: string;
  recordId: string;
  operator: string;
  timestamp: string;
  previousJudgment: string;
  newJudgment: string;
  reason: string;
}
