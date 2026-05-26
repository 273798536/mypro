export interface Container {
  id: string;
  bay: number;
  row: number;
  tier: number;
  size: 20 | 40;
  type: 'dry' | 'reefer' | 'tank' | 'open';
  dangerousGoods: {
    level: number;
    class: string;
  };
  booking: {
    trainId: string;
    pickupOrder: number;
    appointmentTime: string;
    status: 'pending' | 'ready' | 'completed' | 'expired';
  };
  source: {
    origin: string;
    lastModified: string;
    modifyHistory: ModifyRecord[];
  };
}

export interface ModifyRecord {
  timestamp: string;
  field: string;
  oldValue: any;
  newValue: any;
  operator: string;
}

export interface Alert {
  id: string;
  type: 'stacked' | 'dangerous_adjacent' | 'expired';
  severity: 'warning' | 'danger';
  containerId: string;
  relatedContainers: string[];
  message: string;
  timestamp: string;
}

export interface Filters {
  containerId: string;
  bay: number | null;
  row: number | null;
  dangerousLevel: number[];
  trainId: string;
  pickupOrder: [number, number] | null;
  status: string[];
}

export interface SimulationState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  pickupSequence: string[];
  conflicts: string[];
}

export type ViewMode = 'normal' | 'danger' | 'pickup';
