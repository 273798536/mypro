export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Charge {
  id: string;
  position: Vec3;
  charge: number;
  color: string;
  preset?: 'monopole' | 'dipole' | 'quadrupole' | null;
}

export interface ExperimentState {
  charges: Charge[];
  showFieldLines: boolean;
  showEquipotential: boolean;
  selectedChargeId: string | null;
  cameraPosition: Vec3;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  state: ExperimentState;
  name: string;
  note: string;
}

export interface FieldValue {
  position: Vec3;
  electricField: Vec3;
  potential: number;
  fieldMagnitude: number;
}

export interface Warning {
  id: string;
  type: 'overlap' | 'divergence' | 'color_warning';
  message: string;
  timestamp: number;
  dismissed: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  description: string;
  state: ExperimentState;
}

export interface FieldLineData {
  points: Vec3[];
  chargeId: string;
  isPositive: boolean;
}
