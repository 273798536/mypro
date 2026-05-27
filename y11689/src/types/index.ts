export interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetPlan {
  id: string;
  projectId: string;
  date: string;
  plannedBudget: number;
  category: string;
  owner: string;
  source: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  owner: string;
  source: string;
  isDuplicate?: boolean;
  revisionHistory: Revision[];
  createdAt: string;
}

export interface RevenueForecast {
  id: string;
  projectId: string;
  date: string;
  forecastAmount: number;
  actualAmount?: number;
  description: string;
  owner: string;
  source: string;
  isDelayed?: boolean;
  expectedDate?: string;
  revisionHistory: Revision[];
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  plannedDate: string;
  actualDate?: string;
  status: 'pending' | 'completed' | 'delayed' | 'at_risk';
  owner: string;
  description: string;
  createdAt: string;
}

export interface Owner {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface Revision {
  id: string;
  timestamp: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  operator: string;
}

export type RiskType = 'revenue_delay' | 'expense_duplicate' | 'milestone_misalignment' | 'budget_overrun';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Risk {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  relatedItemId: string;
  relatedItemType: 'expense' | 'revenue' | 'milestone';
  description: string;
  detectedAt: string;
  resolved: boolean;
  position?: { x: number; y: number; z: number };
}

export interface BurnDataPoint {
  date: string;
  timestamp: number;
  budget: number;
  actualSpent: number;
  forecastRevenue: number;
  cumulativeBudget: number;
  cumulativeSpent: number;
  cumulativeRevenue: number;
  risks: Risk[];
}

export interface SurfacePoint {
  x: number;
  y: number;
  z: number;
  value: number;
  date: string;
}

export interface ViewState {
  timeSlice: number;
  selectedOwnerId: string | null;
  selectedDataPoint: BurnDataPoint | null;
  cameraPosition: [number, number, number];
  isPlaying: boolean;
  showLabels: boolean;
  showGrid: boolean;
}

export type DataSourceType = 'budget' | 'expense' | 'revenue' | 'milestone';

export interface DataSourceInfo {
  type: DataSourceType;
  id: string;
  name: string;
  lastUpdated: string;
  recordCount: number;
}
