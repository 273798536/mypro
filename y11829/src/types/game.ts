export type VipLevel = 0 | 1 | 2 | 3;
export type BusinessType = "deposit" | "withdraw" | "transfer" | "loan" | "card";
export type CounterStatus = "idle" | "serving" | "cooldown" | "broken";
export type GamePhase = "idle" | "playing" | "paused" | "ended";
export type ServiceResult = "completed" | "interrupted" | "broken";

export interface Customer {
  id: string;
  name: string;
  vipLevel: VipLevel;
  isAppointment: boolean;
  appointmentDeadline: number | null;
  businessType: BusinessType;
  serviceTime: number;
  originalQueueIndex: number;
  arriveTick: number;
  status: "waiting" | "serving" | "completed" | "expired" | "interrupted";
}

export interface CounterServiceRecord {
  customer: Customer;
  startTime: number;
  endTime: number;
  result: ServiceResult;
}

export interface Counter {
  id: string;
  label: string;
  status: CounterStatus;
  currentCustomer: Customer | null;
  remainingTime: number;
  cooldownRemaining: number;
  brokenRemaining: number;
  serviceHistory: CounterServiceRecord[];
  totalCooldownTicks: number;
  totalBrokenTicks: number;
  pendingCustomer: Customer | null;
}

export type GameEventType =
  | "customer_arrive"
  | "vip_preempt"
  | "service_start"
  | "service_complete"
  | "service_interrupted"
  | "appointment_expired"
  | "counter_broken"
  | "counter_cooldown_start"
  | "counter_recovered"
  | "queue_reorder";

export interface GameEvent {
  id: string;
  tick: number;
  type: GameEventType;
  data: {
    customerId?: string;
    counterId?: string;
    details: string;
    affectedCustomers?: string[];
    affectedCounters?: string[];
  };
}

export interface Score {
  served: number;
  vipHandled: number;
  appointmentExpired: number;
  interruptedCount: number;
  brokenCount: number;
}

export interface QueueSnapshot {
  tick: number;
  beforeIds: string[];
  afterIds: string[];
  trigger: string;
}

export interface GameState {
  phase: GamePhase;
  tick: number;
  queue: Customer[];
  counters: Counter[];
  events: GameEvent[];
  score: Score;
  snapshots: QueueSnapshot[];
  scenarioId: string;
  feedbackMessages: FeedbackMessage[];
  allCustomers: Customer[];
  completedCustomerIds: string[];
  failedCustomerIds: string[];
}

export interface FeedbackMessage {
  id: string;
  tick: number;
  type: "success" | "warning" | "error" | "info";
  message: string;
  customerRef?: string;
  counterRef?: string;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  counterCount: number;
  schedule: ScheduledEvent[];
}

export interface ScheduledEvent {
  tick: number;
  type: "customer_arrive" | "counter_broken";
  payload: CustomerArrivePayload | CounterBrokenPayload;
}

export interface CustomerArrivePayload {
  customers: Array<{
    name: string;
    vipLevel: VipLevel;
    isAppointment: boolean;
    appointmentWindow?: number;
    businessType: BusinessType;
    serviceTime: number;
  }>;
}

export interface CounterBrokenPayload {
  counterIndex: number;
  brokenDuration: number;
}
