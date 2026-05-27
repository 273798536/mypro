import * as THREE from 'three';

export type ParticleType = 'electron' | 'proton' | 'neutron' | 'muon' | 'pion' | 'kaon';

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface Particle {
  id: string;
  type: ParticleType;
  charge: number;
  mass: number;
  velocity: Vector3Data;
  color: string;
  trajectoryPoints: Vector3Data[];
  source: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  isVisible: boolean;
}

export interface DecayEvent {
  id: string;
  particleId: string;
  position: Vector3Data;
  decayProducts: string[];
  timestamp: number;
  isActive: boolean;
}

export interface MagneticField {
  strength: number;
  direction: Vector3Data;
  isVisible: boolean;
}

export type ImportMode = 'ignore' | 'overwrite' | 'append';

export type ValidationErrorType = 'trajectory_break' | 'field_direction' | 'wrong_label' | 'missing_field';

export interface ValidationError {
  type: ValidationErrorType;
  particleId?: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: ValidationError[];
  importMode: ImportMode;
  filename: string;
  importedAt: string;
}

export interface ModificationRecord {
  id: string;
  particleId?: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  modifiedAt: string;
  source: string;
}

export interface ParticleInfo {
  name: string;
  symbol: string;
  charge: number;
  mass: number;
  color: string;
  description: string;
}

export const PARTICLE_INFO: Record<ParticleType, ParticleInfo> = {
  electron: {
    name: '电子',
    symbol: 'e⁻',
    charge: -1,
    mass: 0.511,
    color: '#10b981',
    description: '轻子，带负电荷，质量极小'
  },
  proton: {
    name: '质子',
    symbol: 'p⁺',
    charge: 1,
    mass: 938.27,
    color: '#ef4444',
    description: '重子，带正电荷，构成原子核'
  },
  neutron: {
    name: '中子',
    symbol: 'n',
    charge: 0,
    mass: 939.57,
    color: '#f59e0b',
    description: '重子，电中性，构成原子核'
  },
  muon: {
    name: 'μ子',
    symbol: 'μ⁻',
    charge: -1,
    mass: 105.66,
    color: '#8b5cf6',
    description: '轻子，类似电子但质量更大'
  },
  pion: {
    name: 'π介子',
    symbol: 'π⁺',
    charge: 1,
    mass: 139.57,
    color: '#3b82f6',
    description: '介子，传递强相互作用'
  },
  kaon: {
    name: 'K介子',
    symbol: 'K⁺',
    charge: 1,
    mass: 493.67,
    color: '#ec4899',
    description: '奇异介子，包含奇异夸克'
  }
};
