// ============================================================
// 医院物流机器人时序回放 - 演示数据
// 包含 3 个数据集：顺利记录 / 补录记录 / 异常记录
// ============================================================

const CAD_LAYERS = [
  { id: 'L-001', name: '住院部3F-建筑结构', type: 'structure', active: true, originalNote: '此图层标示墙体、柱子、电梯井等建筑主体结构，坐标原点位于电梯厅东南角。' },
  { id: 'L-002', name: '住院部3F-病房编号', type: 'room', active: true, originalNote: '病房编号规则：3 + 两位数序号；301~312 南向，313~320 北向。护理站位于308对面。' },
  { id: 'L-003', name: '住院部3F-机器人通道', type: 'path', active: true, originalNote: '机器人主通道宽度≥1.2m，优先走东侧走廊；遇行人需在避让点（P03/P08/P15）停靠等待。' },
  { id: 'L-004', name: '住院部3F-配送点位', type: 'point', active: true, originalNote: '每个配送点设 RFID 地标；标准停留 20s，超时阈值 60s；相邻点默认合并警告需人工复核。' },
];

const MATERIALS = [
  {
    id: 'M-CAD-001',
    name: 'CAD_住院部3F_20241115.dwg',
    type: 'cad',
    uploadedBy: '小赵',
    uploadedAt: '2024-11-15 10:12',
    modified: false,
    versions: [
      { v: 1, date: '2024-11-15 10:12', note: '初版：根据建筑蓝图绘制，点位间距按 5m 网格布设。', diff: null },
    ],
  },
  {
    id: 'M-ATT-002',
    name: '晚到附件_点位说明补充.pdf',
    type: 'attachment',
    uploadedBy: '小赵',
    uploadedAt: '2024-11-18 16:44',
    modified: true,
    versions: [
      { v: 1, date: '2024-11-18 16:44', note: '初版：P09 与 P10 间距实际 2.1m，小于设计 5m，建议合并告警。', diff: 'P09/P10 合并告警规则' },
      { v: 2, date: '2024-11-19 09:20', note: '口径修订：相邻点位不合并告警，必须逐点追溯至 CAD 图层原始说法。', diff: '相邻点独立告警，禁止合并' },
    ],
  },
  {
    id: 'M-ORAL-003',
    name: '口头说明_临时避让规则',
    type: 'oral',
    uploadedBy: '小赵',
    uploadedAt: '2024-11-20 08:30',
    modified: true,
    versions: [
      { v: 1, date: '2024-11-20 08:30', note: '早间口头传达：8:00~9:00 医护交班时段，机器人可在 P11 长时间停靠。', diff: 'P11 停靠阈值放宽至 180s' },
      { v: 2, date: '2024-11-20 14:05', note: '口径修订：仅周一三五早交班可放宽，周二四仍按 60s 执行。', diff: '停靠阈值放宽限定周一三五' },
    ],
  },
];

// 楼层平面布局（SVG 坐标，600 x 380 视图）
const FLOOR_PLAN = {
  width: 600,
  height: 380,
  walls: [
    'M 30 30 L 570 30 L 570 350 L 30 350 Z',
    'M 30 190 L 570 190',
  ],
  rooms: [
    { id: 'R301', label: '301', x: 40, y: 40, w: 120, h: 140 },
    { id: 'R302', label: '302', x: 170, y: 40, w: 120, h: 140 },
    { id: 'R303', label: '303', x: 300, y: 40, w: 120, h: 140 },
    { id: 'R304', label: '护理站', x: 430, y: 40, w: 130, h: 140 },
    { id: 'R313', label: '313', x: 40, y: 200, w: 120, h: 140 },
    { id: 'R314', label: '314', x: 170, y: 200, w: 120, h: 140 },
    { id: 'R315', label: '315', x: 300, y: 200, w: 120, h: 140 },
    { id: 'R316', label: '药品柜', x: 430, y: 200, w: 130, h: 140 },
  ],
  corridor: { x: 40, y: 175, w: 520, h: 30 },
};

// ============ 通用点位模板 ============
function makePoint(idx, code, label, x, y, plannedT, actualT, status, extra = {}) {
  return {
    id: `P${String(idx).padStart(2, '0')}`,
    code,
    label,
    x, y,
    plannedTime: plannedT,
    actualTime: actualT,
    delaySec: actualT - plannedT,
    status,
    cadLayerRef: extra.cadLayerRef || 'L-004',
    materials: extra.materials || [],
    anomaly: extra.anomaly || null,
    trace: extra.trace || [],
    confirmed: extra.confirmed || false,
    confirmedBy: extra.confirmedBy || null,
    confirmedAt: extra.confirmedAt || null,
  };
}

// ============ 数据集 1：顺利记录 ============
const DATASET_NORMAL = {
  id: 'normal',
  title: '顺利记录 - 2024-11-21 白班',
  campus: '东院区',
  floor: '住院部 3F',
  robot: 'LR-2047',
  shift: '白班 08:00-16:00',
  points: [
    makePoint(1, 'START', '电梯厅起点', 70, 190, 28800, 28800, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(2, 'DELIVER', '301 病房门口', 100, 100, 28920, 28935, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(3, 'DELIVER', '302 病房门口', 230, 100, 29100, 29122, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(4, 'WAIT', 'P04 避让点', 290, 190, 29220, 29250, 'ok', { materials: ['M-CAD-001', 'M-ORAL-003'] }),
    makePoint(5, 'DELIVER', '303 病房门口', 360, 100, 29400, 29418, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(6, 'DELIVER', '护理站交接', 495, 100, 29580, 29610, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(7, 'RETURN', '返程途径 P04', 290, 190, 29820, 29835, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(8, 'END', '电梯厅终点', 70, 190, 30000, 30012, 'ok', { materials: ['M-CAD-001'] }),
  ],
  history: [
    { time: '2024-11-21 16:05', actor: '系统', action: '自动记录生成', detail: '白班任务完成，8 个点位全部按时到达，无异常。' },
  ],
};

// ============ 数据集 2：补录记录 ============
const DATASET_SUPPLEMENT = {
  id: 'supplement',
  title: '补录记录 - 2024-11-20 中班',
  campus: '东院区',
  floor: '住院部 3F',
  robot: 'LR-2047',
  shift: '中班 16:00-24:00',
  points: [
    makePoint(1, 'START', '电梯厅起点', 70, 190, 57600, 57600, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(2, 'DELIVER', '313 病房门口', 100, 270, 57720, 57755, 'delay', {
      materials: ['M-CAD-001', 'M-ATT-002'],
      trace: [
        { step: 1, desc: '系统初始记录：延误 35s，未触发告警阈值。' },
        { step: 2, desc: '现场同事补录：313 门口家属临时堆放行李，机器人绕行。', source: '补录人-李护士', time: '2024-11-20 22:10' },
      ],
      confirmed: true,
      confirmedBy: '李护士',
      confirmedAt: '2024-11-20 22:12',
    }),
    makePoint(3, 'DELIVER', '314 病房门口', 230, 270, 57900, 57908, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(4, 'DELIVER', '315 病房门口', 360, 270, 58080, 58420, 'delay', {
      materials: ['M-CAD-001', 'M-ORAL-003'],
      trace: [
        { step: 1, desc: '系统初始记录：延误 340s，触发严重延迟告警。' },
        { step: 2, desc: '方案经理小赵口头说明：中班病人 CT 返回高峰，315 门口通道临时占用。', source: '口头说明-小赵', time: '2024-11-20 17:50' },
        { step: 3, desc: '人工补录：已核实当时情况，标注为"环境拥堵导致"，不计入机器人考核。', source: '补录人-王工', time: '2024-11-21 09:30' },
      ],
      confirmed: true,
      confirmedBy: '王工',
      confirmedAt: '2024-11-21 09:30',
    }),
    makePoint(5, 'DELIVER', '药品柜取药', 495, 270, 58500, 58530, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(6, 'RETURN', '返程电梯厅', 70, 190, 58800, 58825, 'ok', { materials: ['M-CAD-001'] }),
  ],
  history: [
    { time: '2024-11-21 09:15', actor: '系统', action: '原始记录生成', detail: '中班任务完成，检测到 2 处延迟（P02 35s / P04 340s）。' },
    { time: '2024-11-21 09:22', actor: '李护士', action: '补录 P02 备注', detail: '添加家属行李占道说明，确认 P02 不追究。' },
    { time: '2024-11-21 09:30', actor: '王工', action: '补录 P04 备注并确认', detail: '关联口头说明，确认 P04 为环境因素。' },
  ],
};

// ============ 数据集 3：异常记录 ============
const DATASET_ANOMALY = {
  id: 'anomaly',
  title: '异常记录 - 2024-11-19 夜班',
  campus: '东院区',
  floor: '住院部 3F',
  robot: 'LR-2047',
  shift: '夜班 00:00-08:00',
  points: [
    makePoint(1, 'START', '电梯厅起点', 70, 190, 3600, 3600, 'ok', { materials: ['M-CAD-001'] }),
    makePoint(2, 'DELIVER', 'P09 药品柜前', 460, 190, 3780, 3805, 'ok', { materials: ['M-CAD-001', 'M-ATT-002'] }),
    makePoint(3, 'DELIVER', 'P10 护理站侧', 480, 150, 3840, 4140, 'anomaly', {
      materials: ['M-CAD-001', 'M-ATT-002'],
      anomaly: {
        code: 'ANOM-20241119-001',
        type: '路径偏离 + 长时间停靠',
        severity: 'high',
        description: 'P09 与 P10 间距仅 2.1m（按 M-ATT-002 v1 口径原本合并告警；v2 修订后独立追溯）。机器人在 P09→P10 间实际停留 300s，远超 60s 阈值，期间电量由 78% 跌至 62%。',
        rootCause: '待人工确认',
      },
      trace: [
        { step: 1, desc: '系统检测：P09→P10 段异常停留 300s。', source: '自动' },
        { step: 2, desc: '初版口径（M-ATT-002 v1）：与 P09 合并为"相邻点位延迟告警"，被误判为普通延误。', source: '旧口径' },
        { step: 3, desc: '修订口径（M-ATT-002 v2，11-19 09:20）：相邻点独立告警，本点位提升为异常，可追溯到 CAD 图层 L-004 "相邻点默认合并警告需人工复核"原始说法。', source: '新口径' },
      ],
      confirmed: false,
    }),
    makePoint(4, 'DELIVER', '303 病房门口', 360, 100, 4200, 4560, 'anomaly', {
      materials: ['M-CAD-001'],
      anomaly: {
        code: 'ANOM-20241119-002',
        type: '未到达指定位置',
        severity: 'high',
        description: '机器人在 P04 避让点附近停留 360s 后跳过 303 直接前往护理站，患者口服药未送达。',
        rootCause: '避让点传感器误触发，路径规划模块跳过当前任务节点。',
      },
      trace: [
        { step: 1, desc: '系统日志：P04 避让点红外传感器持续触发（实际无人）。', source: '自动诊断' },
        { step: 2, desc: 'CAD 图层 L-003 原始说法：机器人遇行人需在避让点（P03/P08/P15）停靠等待——但 P04 并非设计避让点。', source: 'CAD L-003' },
        { step: 3, desc: '推断：避让点列表配置错误，P04 被误加入。建议核对 CAD 图与机器人配置表。', source: '工程师初步分析' },
      ],
      confirmed: false,
    }),
    makePoint(5, 'DELIVER', '护理站交接', 495, 100, 4800, 4850, 'delay', {
      materials: ['M-CAD-001'],
      trace: [
        { step: 1, desc: '因 P10 和 303 的连锁延误导致护理站交接晚到 50s。', source: '系统推断' },
      ],
      confirmed: false,
    }),
    makePoint(6, 'RETURN', '返程电梯厅', 70, 190, 5100, 5140, 'ok', { materials: ['M-CAD-001'] }),
  ],
  history: [
    { time: '2024-11-19 01:30', actor: '系统', action: '自动异常检测', detail: '检测到 P10 长时间停留（300s），但因 M-ATT-002 v1 口径被合并为普通延误。' },
    { time: '2024-11-19 09:20', actor: '小赵', action: '修订口径（M-ATT-002 v2）', detail: '相邻点不再合并告警，P10 由"延误"提升为"异常"。' },
    { time: '2024-11-19 10:05', actor: '王工', action: '初步根因分析', detail: '怀疑 P04 避让点配置错误，建议灰度发布前复核。' },
  ],
};

const DATASETS = {
  normal: DATASET_NORMAL,
  supplement: DATASET_SUPPLEMENT,
  anomaly: DATASET_ANOMALY,
};

const STATE = {
  currentDatasetId: 'anomaly',
  selectedPointId: null,
  hoverPointId: null,
  currentTime: 0,
  playing: false,
  speed: 1,
  cad: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
  activeLayers: CAD_LAYERS.filter(l => l.active).map(l => l.id),
  savedViews: [],
};
