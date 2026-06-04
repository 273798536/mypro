import type {
  AnnotationTask,
  SkeletonFrame,
  CollisionPoint,
  BoneConnection,
  ScoreSheet,
  OperationRecord,
  LayerVersion,
  ReviewConfirm,
  SkeletonNode,
} from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 10);

const BASE_NODES: Omit<SkeletonNode, 'id'>[] = [
  { name: '头顶', x: 400, y: 100, confidence: 0.95, part: 'head' },
  { name: '颈部', x: 400, y: 140, confidence: 0.92, part: 'head' },
  { name: '左肩', x: 340, y: 180, confidence: 0.88, part: 'torso' },
  { name: '右肩', x: 460, y: 180, confidence: 0.89, part: 'torso' },
  { name: '左肘', x: 300, y: 260, confidence: 0.85, part: 'arm' },
  { name: '右肘', x: 500, y: 260, confidence: 0.86, part: 'arm' },
  { name: '左腕', x: 280, y: 340, confidence: 0.82, part: 'arm' },
  { name: '右腕', x: 520, y: 340, confidence: 0.83, part: 'arm' },
  { name: '胸部', x: 400, y: 200, confidence: 0.90, part: 'torso' },
  { name: '腹部', x: 400, y: 260, confidence: 0.88, part: 'torso' },
  { name: '左髋', x: 360, y: 320, confidence: 0.87, part: 'torso' },
  { name: '右髋', x: 440, y: 320, confidence: 0.88, part: 'torso' },
  { name: '左膝', x: 340, y: 420, confidence: 0.84, part: 'leg' },
  { name: '右膝', x: 460, y: 420, confidence: 0.85, part: 'leg' },
  { name: '左踝', x: 330, y: 520, confidence: 0.80, part: 'leg' },
  { name: '右踝', x: 470, y: 520, confidence: 0.81, part: 'leg' },
];

export const BONE_CONNECTIONS: BoneConnection[] = [
  { from: '头顶', to: '颈部', name: '头颈' },
  { from: '颈部', to: '左肩', name: '颈肩左' },
  { from: '颈部', to: '右肩', name: '颈肩右' },
  { from: '左肩', to: '左肘', name: '上臂左' },
  { from: '右肩', to: '右肘', name: '上臂右' },
  { from: '左肘', to: '左腕', name: '前臂左' },
  { from: '右肘', to: '右腕', name: '前臂右' },
  { from: '颈部', to: '胸部', name: '躯干上' },
  { from: '胸部', to: '腹部', name: '躯干中' },
  { from: '腹部', to: '左髋', name: '躯干下左' },
  { from: '腹部', to: '右髋', name: '躯干下右' },
  { from: '左髋', to: '左膝', name: '大腿左' },
  { from: '右髋', to: '右膝', name: '大腿右' },
  { from: '左膝', to: '左踝', name: '小腿左' },
  { from: '右膝', to: '右踝', name: '小腿右' },
];

const createNodes = (frameOffset: number, hasBadData: boolean = false): SkeletonNode[] => {
  return BASE_NODES.map((node, index) => {
    const offsetX = Math.sin(frameOffset * 0.3 + index * 0.5) * 15;
    const offsetY = Math.cos(frameOffset * 0.2 + index * 0.3) * 10;
    
    const badData = hasBadData && index === 7;
    
    return {
      ...node,
      id: generateId(),
      x: badData ? -9999 : node.x + offsetX,
      y: badData ? -9999 : node.y + offsetY,
      confidence: badData ? 0.1 : node.confidence - Math.random() * 0.1,
      isBadData: badData,
      isBoundary: index === 12,
    };
  });
};

export const MOCK_HISTORY: OperationRecord[] = [
  {
    id: 'HIST-001',
    type: 'annotate',
    operator: '王标注',
    timestamp: '2024-03-10 09:15:00',
    description: '开始第一次标注，导入原始数据共10帧',
  },
  {
    id: 'HIST-002',
    type: 'annotate',
    operator: '王标注',
    timestamp: '2024-03-10 10:30:00',
    description: '完成第1-5帧骨架节点标注',
  },
  {
    id: 'HIST-003',
    type: 'annotate',
    operator: '王标注',
    timestamp: '2024-03-10 14:00:00',
    description: '完成第6-10帧骨架节点标注',
  },
  {
    id: 'HIST-004',
    type: 'supplement',
    operator: '张工',
    timestamp: '2024-03-15 11:30:00',
    description: '补录评分表备注：原始评分表延迟到达，第3项分数待确认',
  },
  {
    id: 'HIST-005',
    type: 'rerun',
    operator: '李安全',
    timestamp: '2024-03-15 11:45:00',
    description: '第一次重复标注：因评分表更新，需重新标注第3-5帧',
    before: { frames: 10, collisions: 6 },
    after: { frames: 10, collisions: 8 },
  },
  {
    id: 'HIST-006',
    type: 'undo',
    operator: '李安全',
    timestamp: '2024-03-15 13:15:00',
    description: '撤销了左膝关节标注调整（将y坐标从425恢复为420）',
    before: { node: '左膝', x: 340, y: 425 },
    after: { node: '左膝', x: 340, y: 420 },
  },
  {
    id: 'HIST-007',
    type: 'annotate',
    operator: '李安全',
    timestamp: '2024-03-15 13:20:00',
    description: '调整右腕节点位置，修正第7帧坏数据',
    before: { node: '右腕', x: -9999, y: -9999 },
    after: { node: '右腕', x: 520, y: 340 },
  },
  {
    id: 'HIST-008',
    type: 'confirm',
    operator: '李安全',
    timestamp: '2024-03-15 14:00:00',
    description: '人工确认边界案例COL-002：右腕与右膝确实存在碰撞',
  },
  {
    id: 'HIST-009',
    type: 'confirm',
    operator: '李安全',
    timestamp: '2024-03-15 14:05:00',
    description: '人工确认边界案例COL-004：头顶与上方障碍物存在碰撞风险',
  },
  {
    id: 'HIST-010',
    type: 'rerun',
    operator: '李安全',
    timestamp: '2024-03-15 14:20:00',
    description: '第二次重复标注：修正边界案例后重新计算碰撞检测',
    before: { collisions: 8, boundary: 3 },
    after: { collisions: 5, boundary: 2 },
  },
];

export const MOCK_TASKS: AnnotationTask[] = [
  {
    id: 'task-001',
    taskId: 'TASK-001',
    name: '2024年第一季度安全培训-下蹲动作评估',
    status: 'reviewing',
    createdAt: '2024-03-10 09:00:00',
    updatedAt: '2024-03-15 14:30:00',
    assignee: '李安全（安全培训师）',
    annotator: '李安全',
    description: '生产车间员工下蹲作业姿态评估，含边界碰撞案例',
    annotationCount: 156,
    collisionCount: 8,
    boundaryCount: 3,
    rerunCount: 2,
    supplementCount: 1,
    badDataCount: 1,
    pendingConfirmCount: 3,
    operationHistory: MOCK_HISTORY,
  },
  {
    id: 'task-002',
    taskId: 'TASK-002',
    name: '2024年第一季度安全培训-抬举动作评估',
    status: 'in_progress',
    createdAt: '2024-03-12 10:00:00',
    updatedAt: '2024-03-14 16:00:00',
    assignee: '王标注（标注员）',
    annotator: '王标注',
    description: '仓库员工重物抬举姿态评估',
    annotationCount: 89,
    collisionCount: 5,
    boundaryCount: 1,
    rerunCount: 1,
    supplementCount: 0,
    badDataCount: 0,
    pendingConfirmCount: 1,
  },
  {
    id: 'task-003',
    taskId: 'TASK-003',
    name: '2024年第一季度安全培训-弯腰动作评估',
    status: 'completed',
    createdAt: '2024-03-08 08:30:00',
    updatedAt: '2024-03-13 11:00:00',
    assignee: '李安全（安全培训师）',
    annotator: '李安全',
    description: '物流员工弯腰拣货姿态评估',
    annotationCount: 234,
    collisionCount: 12,
    boundaryCount: 4,
    rerunCount: 0,
    supplementCount: 2,
    badDataCount: 0,
    pendingConfirmCount: 0,
  },
];

export const MOCK_FRAMES: SkeletonFrame[] = Array.from({ length: 10 }, (_, i) => ({
  id: `frame-${i + 1}`,
  frameId: `FRAME-${String(i + 1).padStart(3, '0')}`,
  timestamp: i * 100,
  status: i === 5 ? 'error' : i === 3 || i === 7 ? 'warning' : 'normal',
  layerId: 'LAYER-AFTER',
  nodes: createNodes(i, i === 5),
  hasBadData: i === 5,
}));

export const MOCK_FRAMES_BEFORE: SkeletonFrame[] = MOCK_FRAMES.map((frame) => ({
  ...frame,
  layerId: 'LAYER-BEFORE',
  nodes: frame.nodes.map((node) => ({
    ...node,
    id: generateId(),
    x: node.isBadData ? node.x : node.x + (Math.random() - 0.5) * 40,
    y: node.isBadData ? node.y : node.y + (Math.random() - 0.5) * 30,
    confidence: node.confidence - 0.1,
  })),
}));

export const MOCK_COLLISIONS: CollisionPoint[] = [
  {
    id: 'COL-001',
    nodes: ['左膝', '地面'],
    distance: 1.2,
    threshold: 1.5,
    severity: 'boundary',
    isFalsePositive: true,
    reason: '左膝与地面距离1.2cm，接近阈值1.5cm，系统误判为碰撞',
    description: '边界案例：左膝接近地面但未实际碰撞',
    frameIndex: 2,
    confirmed: false,
  },
  {
    id: 'COL-002',
    nodes: ['右腕', '右膝'],
    distance: 0.8,
    threshold: 2.0,
    severity: 'danger',
    isFalsePositive: false,
    reason: '右腕与右膝距离0.8cm，小于安全阈值2.0cm',
    description: '真实碰撞：手臂与腿部交叉',
    frameIndex: 4,
    confirmed: true,
    confirmedBy: '李安全',
    confirmedAt: '2024-03-15 10:20:00',
    comment: '确实存在碰撞风险，需重新标注',
  },
  {
    id: 'COL-003',
    nodes: ['左腕', '左髋'],
    distance: 1.8,
    threshold: 2.0,
    severity: 'boundary',
    isFalsePositive: false,
    reason: '左腕与左髋距离1.8cm，接近阈值2.0cm',
    description: '边界案例：手臂接近躯干',
    frameIndex: 6,
    confirmed: false,
  },
  {
    id: 'COL-004',
    nodes: ['头顶', '上方障碍物'],
    distance: 3.5,
    threshold: 5.0,
    severity: 'warning',
    isFalsePositive: false,
    reason: '头顶与上方障碍物距离3.5cm，小于安全阈值5.0cm',
    description: '警告：头部接近障碍物',
    frameIndex: 1,
    confirmed: true,
    confirmedBy: '李安全',
    confirmedAt: '2024-03-15 10:25:00',
    comment: '确认有碰撞风险，需在培训中强调',
  },
  {
    id: 'COL-005',
    nodes: ['右肩', '右侧设备'],
    distance: 2.2,
    threshold: 3.0,
    severity: 'warning',
    isFalsePositive: true,
    reason: '右肩与右侧设备距离2.2cm，系统判定但实际角度安全',
    description: '边界案例：肩部接近设备但角度安全',
    frameIndex: 5,
    confirmed: false,
  },
];

export const MOCK_SCORE_SHEET: ScoreSheet = {
  sheetId: 'SCORE-2024-Q1-001',
  taskId: 'TASK-001',
  isDelayed: true,
  delayReason: '原评分表纸质版丢失，重新整理后延迟5天提交',
  scores: [
    {
      itemName: '下蹲深度',
      score: 85,
      fullScore: 100,
      unit: '°',
      missingUnit: false,
      isOldData: true,
      remark: '2023年遗留数据，格式已更新',
    },
    {
      itemName: '膝盖弯曲角度',
      score: 92,
      fullScore: 100,
      unit: undefined,
      missingUnit: true,
      isOldData: false,
      remark: '',
    },
    {
      itemName: '背部挺直程度',
      score: undefined,
      fullScore: 100,
      unit: '°',
      missingUnit: false,
      isOldData: false,
      remark: '评分表漏填，需补录',
    },
    {
      itemName: '重心稳定性',
      score: 78,
      fullScore: 100,
      unit: 'cm',
      missingUnit: false,
      isOldData: false,
      remark: '',
    },
    {
      itemName: '动作流畅度',
      score: 88,
      fullScore: 100,
      unit: undefined,
      missingUnit: true,
      isOldData: true,
      remark: '2023年评分标准，单位未标注',
    },
  ],
  supplementNote: '2024-03-15 安全科 张工补录：因原始评分表延迟到达，第3项"背部挺直程度"分数待确认',
  supplementBy: '张工（安全科）',
  supplementAt: '2024-03-15 11:30:00',
};

export const MOCK_LAYERS: LayerVersion[] = [
  {
    layerId: 'LAYER-BEFORE',
    versionName: '原始标注',
    description: '系统自动标注结果，未经过人工调整',
    createdAt: '2024-03-10 09:00:00',
    createdBy: '系统',
  },
  {
    layerId: 'LAYER-AFTER',
    versionName: '人工调整后',
    description: '经过标注员和安全培训师人工调整后的结果',
    createdAt: '2024-03-15 14:30:00',
    createdBy: '李安全',
  },
];

export const MOCK_REVIEWS: ReviewConfirm[] = [
  {
    confirmId: 'REV-001',
    taskId: 'TASK-001',
    reviewer: '李安全',
    comment: '已复核边界案例，COL-001为误判，COL-003需进一步确认。整体标注质量良好，重复标注2次后数据质量符合要求。',
    isApproved: true,
    confirmedAt: '2024-03-15 14:30:00',
  },
];

export const getTaskById = (taskId: string): AnnotationTask | undefined => {
  return MOCK_TASKS.find((t) => t.taskId === taskId);
};

export const getFramesByLayer = (layerId: string): SkeletonFrame[] => {
  return layerId === 'LAYER-BEFORE' ? MOCK_FRAMES_BEFORE : MOCK_FRAMES;
};

export const formatOperationType = (type: string): string => {
  const map: Record<string, string> = {
    annotate: '标注',
    undo: '撤销',
    redo: '重做',
    supplement: '补录',
    confirm: '确认',
    reopen: '重开',
    rerun: '重复运行',
    export: '导出',
  };
  return map[type] || type;
};

export const formatSeverity = (severity: string): string => {
  const map: Record<string, string> = {
    warning: '警告',
    danger: '危险',
    boundary: '边界',
  };
  return map[severity] || severity;
};

export const formatTaskStatus = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    reviewing: '复核中',
    completed: '已完成',
    reopened: '已重开',
  };
  return map[status] || status;
};
