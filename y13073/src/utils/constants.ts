export const PROCESS_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理', color: 'bg-yellow-500' },
  { value: 'processing', label: '处理中', color: 'bg-blue-500' },
  { value: 'completed', label: '已完成', color: 'bg-green-500' },
  { value: 'error', label: '异常', color: 'bg-red-500' },
];

export const ANOMALY_TYPE_OPTIONS = [
  { value: 'boundary', label: '边界值异常', color: 'text-orange-400' },
  { value: 'mutation', label: '突变异常', color: 'text-red-400' },
  { value: 'incomplete', label: '数据不完整', color: 'text-yellow-400' },
  { value: 'gap', label: '时间轴缺段', color: 'text-purple-400' },
];

export const STANDARD_FIELDS = [
  { field: 'source', label: '来源', locked: true },
  { field: 'processStatus', label: '处理状态', locked: true },
  { field: 'x', label: 'X坐标', locked: false },
  { field: 'y', label: 'Y坐标(高程)', locked: false },
  { field: 'timestamp', label: '时间戳', locked: false },
  { field: 'layer', label: '图层', locked: false },
];

export const COLORS = {
  primary: '#1E3A8A',
  secondary: '#3B82F6',
  accent: '#60A5FA',
  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#10B981',
  background: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  grid: '#1E293B',
} as const;

export const CHART_CONFIG = {
  width: 1200,
  height: 500,
  margin: { top: 40, right: 60, bottom: 60, left: 80 },
  minZoom: 0.5,
  maxZoom: 4,
} as const;

export const ANOMALY_DETECTION_CONFIG = {
  iqrMultiplier: 1.5,
  mutationThreshold: 0.3,
  gapThresholdMultiplier: 3,
} as const;

export const STORAGE_KEYS = {
  savedViews: 'profile_chart_saved_views',
  fieldMappings: 'profile_chart_field_mappings',
} as const;
