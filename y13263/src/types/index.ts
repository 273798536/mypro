export type FeedbackStatus = "pending" | "active" | "withdrawn" | "suspended";
export type ChangeType = "create" | "supplement" | "withdraw" | "edit";
export type LocationStatus = "active" | "merged" | "pending_review";
export type PlanStatus = "draft" | "reviewing" | "suspended" | "confirmed";
export type RiskLevel = "low" | "medium" | "high";
export type EventType =
  | "import"
  | "supplement"
  | "withdraw"
  | "merge"
  | "suspend"
  | "confirm"
  | "calculate";

export interface FeedbackVersion {
  id: string;
  feedbackId: string;
  contentBefore: string | null;
  contentAfter: string;
  changeType: ChangeType;
  operator: string;
  remark?: string;
  createdAt: string;
}

export interface ResidentFeedback {
  id: string;
  locationId: string;
  locationNameRaw: string;
  content: string;
  status: FeedbackStatus;
  source: string;
  reporterName?: string;
  createdAt: string;
  versions: FeedbackVersion[];
  duplicateOf?: string;
}

export interface LocationAlias {
  id: string;
  locationId: string;
  aliasName: string;
  isMerged: boolean;
  firstSeenAt: string;
  lng?: number;
  lat?: number;
}

export interface Location {
  id: string;
  canonicalName: string;
  lng: number;
  lat: number;
  status: LocationStatus;
  aliases: LocationAlias[];
  feedbackCount: number;
}

export interface LocationPair {
  id: string;
  aliasA: LocationAlias;
  aliasB: LocationAlias;
  nameSimilarity: number;
  coordinateDistance: number;
  reviewed: boolean;
}

export interface MergeEvidence {
  id: string;
  aliasAId: string;
  aliasBId: string;
  targetLocationId: string;
  nameSimilarity: number;
  coordinateDistance: number;
  evidenceText: string;
  confirmedBy: string;
  confirmedAt: string;
}

export interface PlanScheme {
  id: string;
  name: string;
  cost: number;
  duration: number;
  effectiveness: number;
  riskLevel: RiskLevel;
  isAnomaly: boolean;
  anomalyReason?: string;
  anomalyFeedbackIds?: string[];
}

export interface ImportFeedbackRaw {
  locationName: string;
  content: string;
  source: string;
  reporterName?: string;
  lng?: number;
  lat?: number;
  status?: "pending" | "active";
}

export interface CalculationBasis {
  formula: string;
  parameters: Record<string, number>;
  sourceFeedbackIds: string[];
  updatedAt: string;
}

export interface PlanVersion {
  id: string;
  planId: string;
  snapshotBefore: string;
  snapshotAfter: string;
  remark: string;
  createdAt: string;
}

export interface ChangeSnapshot {
  id: string;
  planId: string;
  title: string;
  description: string;
  beforeState: string;
  afterState: string;
  screenshotNote: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  planId: string;
  eventType: EventType;
  description: string;
  operator: string;
  createdAt: string;
  relatedFeedbackIds?: string[];
}

export interface DrainagePlan {
  id: string;
  locationId: string;
  name: string;
  status: PlanStatus;
  schemes: PlanScheme[];
  currentCalculation: CalculationBasis;
  versions: PlanVersion[];
  snapshots: ChangeSnapshot[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  feedbacks: ResidentFeedback[];
  locations: Location[];
  mergeEvidences: MergeEvidence[];
  locationPairs: LocationPair[];
  plans: DrainagePlan[];
  currentOperator: string;
}

export interface AppActions {
  importFeedbacks: (rawList: ImportFeedbackRaw[]) => void;
  addFeedback: (data: ImportFeedbackRaw) => void;
  supplementFeedback: (feedbackId: string, newContent: string, remark?: string) => void;
  withdrawFeedback: (feedbackId: string, reason: string) => void;
  suspendFeedback: (feedbackId: string, reason: string) => void;
  confirmSuspended: (feedbackId: string) => void;
  detectLocationPairs: () => void;
  mergeLocations: (pairId: string, evidenceText: string) => void;
  rejectMerge: (pairId: string) => void;
  recalculatePlan: (planId: string, remark?: string) => void;
  createPlanForLocation: (locationId: string) => void;
  getFeedbacksByLocation: (locationId: string) => ResidentFeedback[];
  getActiveFeedbacksByLocation: (locationId: string) => ResidentFeedback[];
  resetAll: () => void;
}

export type AppStore = AppState & AppActions;
