import type { Conflict, TraceRecord } from '@/types';

const traceRecords1: TraceRecord[] = [
  {
    id: 'trace_01_1',
    timestamp: 1640995200,
    source: 'main_model',
    action: '检测到线缆穿越',
    note: '主模型显示 cable_01 和 cable_02 在坐标(-8.2, 2.8, -4.8)处相交',
    user: 'system',
  },
  {
    id: 'trace_01_2',
    timestamp: 1640995260,
    source: 'equipment_box',
    action: '补充证据',
    note: '设备箱记录显示 cable_01 实际布线与模型偏差0.3米',
    user: 'tech_01',
  },
  {
    id: 'trace_01_3',
    timestamp: 1640995320,
    source: 'musician_report',
    action: '乐手确认',
    note: '吉他手表示彩排时注意到左侧线缆有缠绕',
    user: 'musician_02',
  },
];

const traceRecords2: TraceRecord[] = [
  {
    id: 'trace_02_1',
    timestamp: 1640995200,
    source: 'main_model',
    action: '检测到设备遮挡',
    note: '主模型显示 cable_08 路径与 equipment_03 监听音箱相交',
    user: 'system',
  },
  {
    id: 'trace_02_2',
    timestamp: 1640995380,
    source: 'equipment_box',
    action: '补证核实',
    note: '现场测量确认监听音箱位置比模型靠前0.5米',
    user: 'tech_02',
  },
];

const traceRecords3: TraceRecord[] = [
  {
    id: 'trace_03_1',
    timestamp: 1640995200,
    source: 'main_model',
    action: '检测到走位冲突',
    note: '第22秒时，musician_01 和 musician_02 距离仅0.4米',
    user: 'system',
  },
  {
    id: 'trace_03_2',
    timestamp: 1640995440,
    source: 'musician_report',
    action: '乐手上报',
    note: '主唱彩排时反映此处容易与吉他手碰撞',
    user: 'musician_01',
  },
];

const traceRecords4: TraceRecord[] = [
  {
    id: 'trace_04_1',
    timestamp: 1640995200,
    source: 'main_model',
    action: '检测到线缆穿越',
    note: 'cable_11 电源线与 cable_05 音频线在坐标(-2, 0.6, -7)处交叉',
    user: 'system',
  },
];

const traceRecords5: TraceRecord[] = [
  {
    id: 'trace_05_1',
    timestamp: 1640995200,
    source: 'main_model',
    action: '检测到走位冲突',
    note: '第42秒时，musician_01 和 musician_03 距离仅0.35米',
    user: 'system',
  },
];

export const conflicts: Conflict[] = [
  {
    id: 'conflict_01',
    type: 'cable_cross',
    severity: 'critical',
    timestamp: 5,
    objectIds: ['cable_01', 'cable_02'],
    description: 'cable_cross between cable_01 and cable_02 at (-8.2, 2.8, -4.8)',
    humanReadableDesc: '左侧主音箱的两条音频线在空中缠绕了，可能产生信号干扰',
    traceRecords: traceRecords1,
    screenshotIds: [],
    resolved: false,
  },
  {
    id: 'conflict_02',
    type: 'equipment_block',
    severity: 'warning',
    timestamp: 15,
    objectIds: ['cable_08', 'equipment_03'],
    description: 'equipment_block cable_08 by equipment_03',
    humanReadableDesc: '左侧监听音箱挡住了吉他手去往调音台的信号线，建议调整音箱位置或改走线方式',
    traceRecords: traceRecords2,
    screenshotIds: [],
    resolved: false,
  },
  {
    id: 'conflict_03',
    type: 'route_conflict',
    severity: 'critical',
    timestamp: 22,
    objectIds: ['musician_01', 'musician_02'],
    description: 'route_conflict musician_01 and musician_02 at t=22s',
    humanReadableDesc: '第22秒时，主唱走到吉他手位置附近，两人距离仅0.4米，容易撞到一起',
    traceRecords: traceRecords3,
    screenshotIds: [],
    resolved: false,
  },
  {
    id: 'conflict_04',
    type: 'cable_cross',
    severity: 'warning',
    timestamp: 35,
    objectIds: ['cable_11', 'cable_05'],
    description: 'cable_cross between cable_11 (power) and cable_05 (audio)',
    humanReadableDesc: '左侧电源线和监听音频线交叉了，电源干扰可能导致监听音箱出现杂音',
    traceRecords: traceRecords4,
    screenshotIds: [],
    resolved: false,
  },
  {
    id: 'conflict_05',
    type: 'route_conflict',
    severity: 'warning',
    timestamp: 42,
    objectIds: ['musician_01', 'musician_03'],
    description: 'route_conflict musician_01 and musician_03 at t=42s',
    humanReadableDesc: '第42秒时，主唱走到贝斯手位置附近，建议调整走位节奏或扩大安全距离',
    traceRecords: traceRecords5,
    screenshotIds: [],
    resolved: false,
  },
  {
    id: 'conflict_06',
    type: 'equipment_block',
    severity: 'info',
    timestamp: 50,
    objectIds: ['cable_10', 'equipment_06'],
    description: 'equipment_block cable_10 by equipment_06',
    humanReadableDesc: '贝斯效果器板压在输出线上，虽然目前不影响使用，但长时间可能损坏线缆接头',
    traceRecords: [],
    screenshotIds: [],
    resolved: false,
  },
];
