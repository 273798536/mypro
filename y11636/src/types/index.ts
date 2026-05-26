export type Priority = 'critical' | 'urgent' | 'normal' | 'low';

export type PatientStatus = 'waiting' | 'in_room' | 'completed' | 'discharged';

export type EventType = 'timeout' | 're_evaluate' | 'critical_miss' | 'priority_change' | 'room_assign' | 'room_complete' | 'patient_arrive' | 'idle_room';

export type RoomStatus = 'idle' | 'occupied' | 'cleaning';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export type ImportMode = 'ignore' | 'overwrite' | 'append';

export interface PriorityChange {
  timestamp: number;
  oldPriority: Priority;
  newPriority: Priority;
  reason: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  symptoms: string[];
  initialPriority: Priority;
  currentPriority: Priority;
  waitTime: number;
  maxWaitTime: number;
  arrivalTime: number;
  status: PatientStatus;
  roomId?: string;
  source: string;
  reEvaluateCount: number;
  history: PriorityChange[];
  treatmentTime: number;
  avatar?: string;
}

export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  currentPatientId?: string;
  remainingTime: number;
  totalTime: number;
  idleTime: number;
}

export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: number;
  message: string;
  patientId?: string;
  roomId?: string;
  pointsChange: number;
  details?: Record<string, any>;
  read: boolean;
}

export interface GameState {
  status: GameStatus;
  startTime: number;
  elapsedTime: number;
  totalTime: number;
  score: number;
  maxScore: number;
  patients: Patient[];
  rooms: Room[];
  events: GameEvent[];
  currentPatientIndex: number;
  speed: number;
}

export interface GameRecord {
  id: string;
  startTime: number;
  endTime: number;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  criticalMissCount: number;
  timeoutCount: number;
  reEvaluateCount: number;
  events: GameEvent[];
  patientSnapshots: Patient[];
}

export interface ImportResult {
  success: boolean;
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string; points: number; maxWait: number }> = {
  critical: {
    label: '危重',
    color: 'text-red-600',
    bgColor: 'bg-red-100 border-red-400',
    points: 100,
    maxWait: 60,
  },
  urgent: {
    label: '急症',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 border-orange-400',
    points: 50,
    maxWait: 180,
  },
  normal: {
    label: '普通',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 border-blue-400',
    points: 20,
    maxWait: 600,
  },
  low: {
    label: '轻症',
    color: 'text-green-600',
    bgColor: 'bg-green-100 border-green-400',
    points: 10,
    maxWait: 1200,
  },
};

export const EVENT_CONFIG: Record<EventType, { label: string; color: string; icon: string }> = {
  timeout: {
    label: '等候超时',
    color: 'text-yellow-600',
    icon: 'clock',
  },
  re_evaluate: {
    label: '复评事件',
    color: 'text-purple-600',
    icon: 'refresh-cw',
  },
  critical_miss: {
    label: '危重漏分',
    color: 'text-red-600',
    icon: 'alert-triangle',
  },
  priority_change: {
    label: '优先级变更',
    color: 'text-indigo-600',
    icon: 'arrow-up-down',
  },
  room_assign: {
    label: '诊室分配',
    color: 'text-blue-600',
    icon: 'door-open',
  },
  room_complete: {
    label: '诊疗完成',
    color: 'text-green-600',
    icon: 'check-circle',
  },
  patient_arrive: {
    label: '新患者到达',
    color: 'text-cyan-600',
    icon: 'user-plus',
  },
  idle_room: {
    label: '诊室空闲',
    color: 'text-gray-600',
    icon: 'clock',
  },
};
