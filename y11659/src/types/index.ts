export type MaterialType = 'container' | 'license_plate' | 'booking_note' | 'dangerous_mark';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'quick' | 'custom';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type UserAction = 'release' | 'intercept';

export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export type ErrorType = 
  | 'booking_mismatch' 
  | 'dangerous_missed' 
  | 'queue_timeout' 
  | 'wrong_intercept'
  | 'container_number_wrong';

export interface ContainerData {
  containerNumber: string;
  size: '20ft' | '40ft' | '45ft';
  type: string;
}

export interface LicensePlateData {
  plateNumber: string;
  vehicleType: string;
}

export interface BookingNoteData {
  bookingNumber: string;
  containerNumber: string;
  plateNumber: string;
  cargoType: string;
  isDangerous: boolean;
  dangerousClass?: string;
  valid: boolean;
}

export interface DangerousMarkData {
  classNumber: string;
  className: string;
  hasMark: boolean;
}

export interface Material {
  id: string;
  type: MaterialType;
  source: string;
  imageUrl?: string;
  data: ContainerData | LicensePlateData | BookingNoteData | DangerousMarkData;
  importTime: number;
  importBatch: string;
}

export interface VehicleMaterials {
  container: Material;
  licensePlate: Material;
  bookingNote: Material;
  dangerousMark?: Material;
}

export interface Vehicle {
  id: string;
  materials: VehicleMaterials;
  correctAction: UserAction;
  interceptReason?: string[];
  difficulty: Difficulty;
}

export interface QueueItem {
  vehicleId: string;
  waitTime: number;
}

export interface OperationRecord {
  vehicleId: string;
  userAction: UserAction;
  userReasons?: string[];
  inputContainerNumber?: string;
  isCorrect: boolean;
  scoreChange: number;
  errorType?: ErrorType;
  operationTime: number;
  waitTime: number;
  timestamp: number;
}

export interface GameRecord {
  id: string;
  playerName: string;
  startTime: number;
  endTime: number;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  operations: OperationRecord[];
  errorTypes: Record<string, number>;
}

export interface GameSettings {
  gameMode: GameMode;
  totalTime: number;
  vehicleCount: number;
  timeoutThreshold: number;
  difficulty: Difficulty | 'mixed';
}

export interface GameState {
  status: GameStatus;
  currentVehicleIndex: number;
  vehicles: Vehicle[];
  queue: QueueItem[];
  score: number;
  combo: number;
  timeRemaining: number;
  operations: OperationRecord[];
  settings: GameSettings;
  currentVehicleStartTime: number;
}

export interface ImportConfig {
  strategy: ImportStrategy;
  batchName: string;
}

export interface MaterialStoreState {
  materials: Material[];
  vehicles: Vehicle[];
  importHistory: { batchName: string; time: number; count: number }[];
  addMaterials: (materials: Material[], config: ImportConfig) => { added: number; skipped: number; updated: number };
  generateVehicles: (count: number, difficulty: Difficulty | 'mixed') => Vehicle[];
  clearAll: () => void;
}

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  booking_mismatch: '预约不匹配',
  dangerous_missed: '危品漏拦',
  queue_timeout: '队列超时',
  wrong_intercept: '误拦正常',
  container_number_wrong: '箱号输入错误',
};

export const DIFFICULTY_LABELS: Record<Difficulty | 'mixed', string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  mixed: '混合',
};
