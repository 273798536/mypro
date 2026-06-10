export type BatchStatus = 'pending' | 'processing' | 'completed' | 'exception';

export type ThicknessAlgorithm = 'standard' | 'degraded_cli';

export type ResultStatus = 'pass' | 'pending' | 'fail';

export interface Reagent {
  id: string;
  name: string;
  catalogNo: string;
  casNo?: string;
  category: string;
  specification: string;
  stock: number;
  unit: string;
  minStock: number;
  manufacturer: string;
  batchNo: string;
  expiryDate: string;
  location: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReagentTransaction {
  id: string;
  reagentId: string;
  type: 'in' | 'out';
  quantity: number;
  relatedBatchId?: string;
  operator: string;
  remark?: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  batchNo: string;
  materialNo: string;
  materialName: string;
  substrateType: string;
  coatingType: string;
  operator: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  remark?: string;
}

export interface ThicknessParameters {
  wavelength: number;
  refractiveIndex: number;
  reflectance?: number;
  transmittance?: number;
}

export interface ThicknessRecord {
  id: string;
  batchId: string;
  version: number;
  algorithm: ThicknessAlgorithm;
  blankControlComplete: boolean;
  parameters: ThicknessParameters;
  thicknessNm: number;
  confidenceMin: number;
  confidenceMax: number;
  source: 'web' | 'cli';
  operator: string;
  status: ResultStatus;
  remark?: string;
  createdAt: string;
}

export interface SpectrumRecord {
  id: string;
  batchId: string;
  spectrumFile?: string;
  capturedAt: string;
  interpreted: boolean;
  interpretedBy?: string;
  interpretedAt?: string;
  interpretationRemark?: string;
  interpretationStatus?: ResultStatus;
  consistentWithThickness?: boolean;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}
