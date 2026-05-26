export type MergeStrategy = "ignore" | "overwrite" | "append";

export type AuditEntry = {
  id: string;
  time: string;
  source: string;
  strategy: MergeStrategy;
  diff?: { field: string; from: unknown; to: unknown }[];
  operator: string;
};

export type Vec3 = { x: number; y: number; z: number };

export type Coil = {
  id: string;
  name: string;
  weight: number;
  length: number;
  diameter: number;
  cog: { x: number; y: number };
  audit: AuditEntry[];
};

export type Spreader = {
  id: string;
  name: string;
  capacity: number;
  offsetLimit: number;
  audit: AuditEntry[];
};

export type Rail = {
  id: string;
  name: string;
  points: Vec3[];
  capacity: number;
  audit: AuditEntry[];
};

export type ZoneType = "safe" | "restricted" | "danger";

export type Zone = {
  id: string;
  name: string;
  type: ZoneType;
  polygon: { x: number; z: number }[];
  audit: AuditEntry[];
};

export type Task = {
  id: string;
  name: string;
  coilId: string;
  spreaderId: string;
  railId: string;
  zones: string[];
  start: Vec3;
  end: Vec3;
  audit: AuditEntry[];
};

export type ActionType = "move" | "lift" | "rotate";

export type StepEvent = {
  t: number;
  action: ActionType;
  position: { x: number; y: number; z: number; rot: number };
  cogOffset: number;
  onRail: boolean;
  inZone: ZoneType | null;
  crossing: boolean;
  score: number;
  penalty?: {
    type: "cog" | "rail" | "zone" | "crossing";
    amount: number;
    message: string;
  };
};

export type Grade = "S" | "A" | "B" | "C" | "F";

export type Report = {
  id: string;
  taskId: string;
  taskName: string;
  totalScore: number;
  finalGrade: Grade;
  events: StepEvent[];
  accidents: StepEvent[];
  finishedAt: string;
  exportedAt?: string;
};

export type GameState = {
  status: "idle" | "running" | "finished" | "terminated";
  position: { x: number; y: number; z: number; rot: number };
  score: number;
  step: number;
  events: StepEvent[];
  lastPenalty?: StepEvent["penalty"];
};
