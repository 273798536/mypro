// 机器人关节配置
export interface RobotJoint {
  id: string;
  name: string;
  index: number;
  minAngle: number;
  maxAngle: number;
  maxTorque: number;
  position: [number, number, number];
  color: string;
}

// 机器人连杆配置
export interface RobotLink {
  id: string;
  name: string;
  length: number;
  mass: number;
  parentJoint: string;
  childJoint: string;
  hasLoad: boolean;
  loadMass: number;
}

// 机器人配置
export interface RobotConfig {
  id: string;
  name: string;
  joints: RobotJoint[];
  links: RobotLink[];
  defaultPayload: number;
}

// 角度数据点
export interface AngleDataPoint {
  jointId: string;
  angle: number;
  timestamp: number;
}

// 负载数据点
export interface LoadDataPoint {
  linkId: string;
  mass: number;
  centerOfMass: [number, number, number];
  timestamp: number;
}

// 数据源
export interface DataSource<T> {
  id: string;
  name: string;
  source: string;
  data: T[];
  importedAt: string;
}

// 扭矩数据点
export interface TorquePoint {
  timestamp: number;
  value: number;
  angle: number;
  load: number;
}

// 扭矩验算结果
export interface TorqueResult {
  jointId: string;
  jointName: string;
  curve: TorquePoint[];
  maxTorque: number;
  minTorque: number;
  threshold: number;
  isOverLimit: boolean;
  overLimitPoints: number[];
}

// 冲突类型
export type ConflictType = 'angle' | 'load' | 'joint';

// 冲突记录
export interface ConflictRecord {
  id: string;
  type: ConflictType;
  rowIndex: number;
  field: string;
  valueA: string | number;
  valueB: string | number;
  resolved: boolean;
  resolution?: 'A' | 'B' | 'custom';
  customValue?: string | number;
  description: string;
}

// 问题类型
export type IssueType = 'missing_load' | 'angle_out_of_range' | 'fixture_misuse' | 'torque_over_limit';

// 问题严重程度
export type IssueSeverity = 'warning' | 'error' | 'critical';

// 问题记录
export interface IssueRecord {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  position: string;
  description: string;
  referenceId: string;
  timestamp: string;
  screenshotPath?: string;
}

// 验算报告
export interface VerificationReport {
  id: string;
  title: string;
  createdAt: string;
  robotConfig: RobotConfig;
  torqueResults: TorqueResult[];
  conflicts: ConflictRecord[];
  issues: IssueRecord[];
  summary: {
    totalJoints: number;
    overLimitJoints: number;
    criticalIssues: number;
    warnings: number;
    recommendations: string[];
  };
}

// 应用状态
export interface AppState {
  robotConfig: RobotConfig | null;
  angleData: DataSource<AngleDataPoint> | null;
  loadData: DataSource<LoadDataPoint> | null;
  torqueResults: TorqueResult[];
  conflicts: ConflictRecord[];
  issues: IssueRecord[];
  currentReport: VerificationReport | null;
  selectedJointId: string | null;
  isCalculating: boolean;
}

// 应用操作
export interface AppActions {
  setRobotConfig: (config: RobotConfig) => void;
  setAngleData: (data: DataSource<AngleDataPoint>) => void;
  setLoadData: (data: DataSource<LoadDataPoint>) => void;
  calculateTorque: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'A' | 'B' | 'custom', customValue?: string | number) => void;
  selectJoint: (jointId: string | null) => void;
  generateReport: () => VerificationReport;
  clearAll: () => void;
}
