export const UNITS = {
  thermalConductivity: 'W/(m·K)',
  thickness: 'm',
  area: 'm²',
  temperature: '°C',
  temperatureDiff: 'K',
  heatFlowDensity: 'W/m²',
  heatFlowRate: 'W',
  thermalResistance: 'm²·K/W',
  uValue: 'W/(m²·K)',
  energy: 'kWh',
  energyMonthly: 'kWh/month',
  energyCost: '元/月',
  psiValue: 'W/(m·K)',
  chiValue: 'W/K',
  length: 'm',
  density: 'kg/m³',
  specificHeat: 'J/kg·K',
  percentage: '%',
  days: '天',
} as const;

export const APPLICABLE_SCOPE = {
  residential: '居住建筑（住宅、公寓等）',
  commercial: '公共建筑（办公楼、商场等）',
  industrial: '工业建筑（厂房、仓库等）',
  all: '各类民用与工业建筑',
} as const;

export const FAILURE_REASONS = {
  missingThermalConductivity: '材料导热率缺失，无法计算热阻',
  missingThickness: '材料厚度缺失，无法计算热阻',
  invalidTemperature: '室内外温度设置无效',
  reversedTemperature: '室内温度低于室外温度，热流方向反向',
  noNodes: '墙体构造节点为空',
  calculationError: '计算过程中发生异常',
} as const;

export const CONFLICT_TYPE_LABELS = {
  material_thickness: '材料厚度冲突',
  thermal_conductivity: '导热率冲突',
  material_assignment: '材料分配冲突',
} as const;

export const ISSUE_TYPE_LABELS = {
  missing_parameter: '参数缺失',
  duplicate_node: '节点重复',
  reversed_temperature: '温差反向',
} as const;

export const ISSUE_SEVERITY_LABELS = {
  error: '错误',
  warning: '警告',
} as const;

export const STATUS_LABELS = {
  draft: '草稿',
  conflict_pending: '待处理冲突',
  validation_failed: '校验未通过',
  ready: '就绪',
  calculating: '计算中',
  completed: '已完成',
  failed: '失败',
} as const;

export const BRIDGE_TYPE_LABELS = {
  linear: '线性热桥',
  point: '点状热桥',
  planar: '面状热桥',
} as const;

export const ENERGY_PRICE_PER_KWH = 0.8;

export const CALCULATION_PRECISION = 4;
