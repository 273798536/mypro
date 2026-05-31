import type { ThresholdConfig } from '../types';

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  brakeDistance: {
    warningMinRate: 0.85,
    warningMaxRate: 1.15,
    seriousMinRate: 0.70,
    seriousMaxRate: 1.30,
  },
  speedGap: {
    warningThreshold: 0.15,
    seriousThreshold: 0.30,
  },
  brakeDelay: {
    warningThreshold: 0.2,
    seriousThreshold: 0.5,
  },
  load: {
    warningRate: 0.9,
    overloadRate: 1.1,
  },
  friction: {
    baseCoefficient: 0.10,
    loadInfluenceCoefficient: 0.3,
  },
  brakeDistanceWarning: 0.15,
  brakeDistanceSerious: 0.30,
  speedGapWarning: 0.15,
  speedGapSerious: 0.30,
  brakeDelayWarning: 0.2,
  brakeDelaySerious: 0.5,
  overloadThreshold: 1.1,
  baseFrictionCoefficient: 0.10,
  loadInfluenceFactor: 0.3,
};

export const GRAVITY_ACCELERATION = 9.8;

export const ABNORMAL_LEVEL_LABELS: Record<string, string> = {
  normal: '正常',
  warning: '警告',
  serious: '严重',
  overload: '超限',
};

export const ABNORMAL_LEVEL_COLORS: Record<string, string> = {
  normal: '#065F46',
  warning: '#92400E',
  serious: '#C2410C',
  overload: '#991B1B',
};

export const ABNORMAL_TYPE_LABELS: Record<string, string> = {
  speed_gap: '速度缺口',
  brake_delay: '制动延迟',
  overload: '载荷超限',
  brake_distance: '制动距离异常',
  missing_data: '数据缺失',
};

export const BAD_ROW_ERROR_LABELS: Record<string, string> = {
  empty: '空行',
  missing_col: '缺列',
  invalid_value: '无效值',
  remark: '备注行',
};

export const TRACE_STEP_LABELS: Record<string, string> = {
  profile: '电梯档案',
  raw: '原始数据',
  cleaning: '数据清洗',
  calculation: '制动距离计算',
  threshold: '阈值校验',
  abnormal: '异常检测',
};

export const BRAKE_DISTANCE_FORMULA = 'S = v² / (2 × g × f)';

export const MENU_ITEMS = [
  { path: '/', label: '仪表盘', icon: 'LayoutDashboard' },
  { path: '/import', label: '数据导入', icon: 'FileUp' },
  { path: '/cleaning', label: '数据清洗', icon: 'Filter' },
  { path: '/calculation', label: '验算结果', icon: 'Calculator' },
  { path: '/review', label: '异常复核', icon: 'AlertTriangle' },
  { path: '/charts', label: '图表分析', icon: 'BarChart3' },
  { path: '/export', label: '报告导出', icon: 'FileDown' },
  { path: '/settings', label: '系统设置', icon: 'Settings' },
];
