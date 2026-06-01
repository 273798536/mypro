export interface Volunteer {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  skills: string[];
  mealBreak: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  hasCredential: boolean;
  credentialType?: string;
  status: 'active' | 'inactive' | 'onLeave';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  description?: string;
}

export interface TimeSlot {
  id: string;
  stageId: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
}

export interface Position {
  id: string;
  name: string;
  stageId: string;
  timeSlotId: string;
  requiredSkills: string[];
  headcount: number;
  description?: string;
}

export type ConflictType = 'mealBreak' | 'credential' | 'headcount' | 'skill' | 'overlap';
export type ConflictSeverity = 'error' | 'warning';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  affectedEntries: string[];
  details: Record<string, unknown>;
}

export interface ScheduleEntry {
  id: string;
  volunteerId: string;
  positionId: string;
  timeSlotId: string;
  stageId: string;
  status: 'scheduled' | 'swapped' | 'cancelled';
  conflicts: Conflict[];
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  id: string;
  type: 'volunteers' | 'positions' | 'stages';
  name: string;
  version: string;
  timestamp: string;
  source: string;
  recordCount: number;
}

export interface VersionChange {
  type: 'add' | 'remove' | 'update' | 'swap';
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: string;
}

export interface ScheduleVersion {
  id: string;
  name: string;
  timestamp: string;
  snapshot: {
    volunteers: Volunteer[];
    entries: ScheduleEntry[];
  };
  changes: VersionChange[];
  createdBy: string;
}

export interface AppState {
  volunteers: Volunteer[];
  stages: Stage[];
  timeSlots: TimeSlot[];
  positions: Position[];
  scheduleEntries: ScheduleEntry[];
  dataSources: DataSource[];
  versions: ScheduleVersion[];
  activeDate: string;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: Conflict[];
  warnings: string[];
}

export interface ScheduleStats {
  totalVolunteers: number;
  scheduledVolunteers: number;
  pendingVolunteers: number;
  totalConflicts: number;
  conflictByType: Record<ConflictType, number>;
  positionsFilled: number;
  totalPositions: number;
}

export const SKILLS = [
  '音响调试',
  '灯光控制',
  '观众引导',
  '后台协调',
  '艺人接待',
  '医疗急救',
  '安检',
  '媒体对接',
  '摄影摄像',
  '翻译',
  '舞台搭建',
  '设备维护'
];

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  mealBreak: '餐休冲突',
  credential: '证件缺失',
  headcount: '岗位缺人',
  skill: '技能不匹配',
  overlap: '时段重叠'
};

export const CONFLICT_TYPE_COLORS: Record<ConflictType, string> = {
  mealBreak: '#F59E0B',
  credential: '#EF4444',
  headcount: '#F97316',
  skill: '#8B5CF6',
  overlap: '#EC4899'
};
