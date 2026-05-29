export interface Slot {
  id: string;
  yardId: string;
  row: number;
  bay: number;
  tier: number;
  status: 'empty' | 'occupied' | 'reserved';
  isLocked: boolean;
  lockRecord?: LockRecord;
}

export interface Container {
  id: string;
  slotId: string;
  containerNo: string;
  size: '20GP' | '40GP' | '40HQ';
  type: 'dry' | 'reefer' | 'hazardous' | 'openTop';
  isHazardous: boolean;
  hazardClass?: string;
  voyageId: string;
  weight: number;
}

export interface Crane {
  id: string;
  name: string;
  type: 'rtg' | 'rmg' | 'qyc';
  position: { x: number; y: number; z: number };
  status: 'idle' | 'working' | 'maintenance';
  currentJobId?: string;
}

export interface Voyage {
  id: string;
  vesselName: string;
  voyageNo: string;
  eta: string;
  etd: string;
}

export interface Job {
  id: string;
  craneId: string;
  containerId: string;
  type: 'load' | 'unload' | 'move';
  scheduledTime: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface LockRecord {
  id: string;
  slotId: string;
  reason: string;
  lockedBy: string;
  lockedAt: string;
  expiresAt: string;
}

export interface DataSource {
  type: 'slot' | 'container' | 'crane' | 'voyage' | 'job';
  sourceFile: string;
  sourceLine?: number;
  sourceField?: string;
  recordId: string;
  value: string;
}

export interface TraceChain {
  id: string;
  ruleName: string;
  ruleVersion: string;
  dataSources: DataSource[];
  computedAt: string;
  previousDiff?: string;
}

export interface ActionItem {
  id: string;
  assignee: string;
  assigneeRole: string;
  documentToModify: string;
  documentSection: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Conflict {
  id: string;
  type: 'hazardous_adjacent' | 'crane_collision' | 'slot_duplicate' | 'rehandle_excessive' | 'hazardous_mixed' | 'suspended_container';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  status: 'open' | 'resolved' | 'ignored';
  involvedSlotIds: string[];
  involvedContainerIds: string[];
  involvedCraneIds: string[];
  traceChain: TraceChain;
  actionItems: ActionItem[];
}

export interface ViewConfig {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  createdAt: string;
  userId: string;
}

export interface ImpactAnalysis {
  modifiedSlotId: string;
  affectedContainers: string[];
  affectedJobs: string[];
  affectedCranes: string[];
  affectedVoyages: string[];
  newConflicts: string[];
  resolvedConflicts: string[];
  rehandleCountChange: number;
}

export interface YardData {
  id: string;
  name: string;
  rows: number;
  bays: number;
  tiers: number;
}

export interface YardState {
  yard: YardData;
  slots: Slot[];
  containers: Container[];
  cranes: Crane[];
  voyages: Voyage[];
  jobs: Job[];
  conflicts: Conflict[];
  selectedSlotId: string | null;
  selectedContainerId: string | null;
  selectedConflictId: string | null;
  currentVoyageId: string | null;
  viewConfigs: ViewConfig[];
  impactAnalysis: ImpactAnalysis | null;
  isImpactMode: boolean;
  modifiedSlotId: string | null;
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  rehandleCount: number;
  dataSources: {
    slots: { lastSync: string; count: number; source: string };
    containers: { lastSync: string; count: number; source: string };
    cranes: { lastSync: string; count: number; source: string };
  };
}
