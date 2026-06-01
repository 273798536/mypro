import type {
  Building,
  RouteEdge,
  Inspector,
  WorkOrder,
  Schedule,
  LeaveRecord,
  Anomaly,
  ChangeLog,
} from '@/types';

export const buildings: Building[] = [
  { id: 'b1', name: '1号楼', floor: '30层', zone: 'A', x: 100, y: 150, accessOpen: true, accessLastUpdate: '2026-06-01 08:00', inspectionFrequency: 2 },
  { id: 'b2', name: '2号楼', floor: '28层', zone: 'A', x: 200, y: 120, accessOpen: true, accessLastUpdate: '2026-06-01 08:05', inspectionFrequency: 2 },
  { id: 'b3', name: '3号楼', floor: '32层', zone: 'A', x: 150, y: 250, accessOpen: false, accessLastUpdate: '2026-06-01 07:30', inspectionFrequency: 3 },
  { id: 'b4', name: '5号楼', floor: '25层', zone: 'B', x: 350, y: 180, accessOpen: true, accessLastUpdate: '2026-06-01 08:10', inspectionFrequency: 2 },
  { id: 'b5', name: '6号楼', floor: '28层', zone: 'B', x: 450, y: 150, accessOpen: true, accessLastUpdate: '2026-06-01 08:00', inspectionFrequency: 2 },
  { id: 'b6', name: '7号楼', floor: '30层', zone: 'B', x: 400, y: 280, accessOpen: true, accessLastUpdate: '2026-06-01 07:55', inspectionFrequency: 3 },
  { id: 'b7', name: '8号楼', floor: '26层', zone: 'C', x: 550, y: 200, accessOpen: true, accessLastUpdate: '2026-06-01 08:00', inspectionFrequency: 2 },
  { id: 'b8', name: '9号楼', floor: '28层', zone: 'C', x: 650, y: 180, accessOpen: false, accessLastUpdate: '2026-06-01 06:00', inspectionFrequency: 2 },
  { id: 'b9', name: '10号楼', floor: '30层', zone: 'C', x: 600, y: 300, accessOpen: true, accessLastUpdate: '2026-06-01 08:05', inspectionFrequency: 3 },
  { id: 'b10', name: '11号楼', floor: '25层', zone: 'D', x: 750, y: 220, accessOpen: true, accessLastUpdate: '2026-06-01 08:00', inspectionFrequency: 2 },
  { id: 'b11', name: '12号楼', floor: '28层', zone: 'D', x: 850, y: 200, accessOpen: true, accessLastUpdate: '2026-06-01 08:10', inspectionFrequency: 2 },
  { id: 'b12', name: '物业中心', floor: '3层', zone: 'D', x: 500, y: 400, accessOpen: true, accessLastUpdate: '2026-06-01 07:00', inspectionFrequency: 1 },
];

export const routeEdges: RouteEdge[] = [
  { id: 'e1', fromBuilding: 'b1', toBuilding: 'b2', distance: 50, isActive: true },
  { id: 'e2', fromBuilding: 'b1', toBuilding: 'b3', distance: 80, isActive: true },
  { id: 'e3', fromBuilding: 'b2', toBuilding: 'b4', distance: 100, isActive: true },
  { id: 'e4', fromBuilding: 'b3', toBuilding: 'b6', distance: 120, isActive: false },
  { id: 'e5', fromBuilding: 'b4', toBuilding: 'b5', distance: 60, isActive: true },
  { id: 'e6', fromBuilding: 'b4', toBuilding: 'b6', distance: 70, isActive: true },
  { id: 'e7', fromBuilding: 'b5', toBuilding: 'b7', distance: 80, isActive: true },
  { id: 'e8', fromBuilding: 'b6', toBuilding: 'b9', distance: 90, isActive: true },
  { id: 'e9', fromBuilding: 'b7', toBuilding: 'b8', distance: 70, isActive: true },
  { id: 'e10', fromBuilding: 'b7', toBuilding: 'b9', distance: 80, isActive: true },
  { id: 'e11', fromBuilding: 'b8', toBuilding: 'b10', distance: 60, isActive: false },
  { id: 'e12', fromBuilding: 'b9', toBuilding: 'b12', distance: 100, isActive: true },
  { id: 'e13', fromBuilding: 'b10', toBuilding: 'b11', distance: 50, isActive: true },
  { id: 'e14', fromBuilding: 'b10', toBuilding: 'b12', distance: 120, isActive: true },
  { id: 'e15', fromBuilding: 'b11', toBuilding: 'b12', distance: 150, isActive: true },
];

export const inspectors: Inspector[] = [
  { id: 'i1', name: '张建国', phone: '138****1234', team: '一组', onDuty: true, avatarColor: '#3b82f6' },
  { id: 'i2', name: '李明华', phone: '139****5678', team: '一组', onDuty: true, avatarColor: '#10b981' },
  { id: 'i3', name: '王卫东', phone: '137****9012', team: '二组', onDuty: true, avatarColor: '#f59e0b' },
  { id: 'i4', name: '赵晓峰', phone: '136****3456', team: '二组', onDuty: false, avatarColor: '#ef4444' },
  { id: 'i5', name: '陈志强', phone: '135****7890', team: '三组', onDuty: true, avatarColor: '#8b5cf6' },
  { id: 'i6', name: '刘大海', phone: '134****2345', team: '三组', onDuty: true, avatarColor: '#ec4899' },
];

export const workOrders: WorkOrder[] = [
  { id: 'wo1', buildingId: 'b1', inspectorId: 'i1', type: 'routine', status: 'completed', source: 'system', scheduledTime: '2026-06-01 08:00', completedTime: '2026-06-01 08:45', description: '日常巡检-消防设施', priority: 'medium' },
  { id: 'wo2', buildingId: 'b3', inspectorId: 'i2', type: 'repair', status: 'in_progress', source: 'manual', scheduledTime: '2026-06-01 09:00', description: '门禁系统故障维修', priority: 'high' },
  { id: 'wo3', buildingId: 'b5', inspectorId: 'i1', type: 'inspection', status: 'pending', source: 'system', scheduledTime: '2026-06-01 10:00', description: '电梯安全专项检查', priority: 'high' },
  { id: 'wo4', buildingId: 'b7', inspectorId: 'i3', type: 'routine', status: 'pending', source: 'system', scheduledTime: '2026-06-01 10:30', description: '日常巡检-水电设施', priority: 'low' },
  { id: 'wo5', buildingId: 'b8', inspectorId: 'i5', type: 'repair', status: 'pending', source: 'manual', scheduledTime: '2026-06-01 11:00', description: '监控摄像头维修', priority: 'medium' },
  { id: 'wo6', buildingId: 'b10', inspectorId: 'i6', type: 'routine', status: 'pending', source: 'system', scheduledTime: '2026-06-01 14:00', description: '日常巡检-公共区域', priority: 'low' },
  { id: 'wo7', buildingId: 'b12', inspectorId: 'i3', type: 'inspection', status: 'pending', source: 'manual', scheduledTime: '2026-06-01 15:00', description: '消防设备季度检查', priority: 'high' },
  { id: 'wo8', buildingId: 'b6', inspectorId: 'i5', type: 'routine', status: 'completed', source: 'system', scheduledTime: '2026-06-01 08:30', completedTime: '2026-06-01 09:15', description: '日常巡检-门禁系统', priority: 'medium' },
];

export const schedules: Schedule[] = [
  { id: 's1', inspectorId: 'i1', date: '2026-06-01', shift: 'morning', buildingIds: ['b1', 'b2', 'b5'], isModified: false },
  { id: 's2', inspectorId: 'i2', date: '2026-06-01', shift: 'morning', buildingIds: ['b3', 'b4'], isModified: true, modifiedBy: '系统管理员', modifiedAt: '2026-06-01 07:30' },
  { id: 's3', inspectorId: 'i3', date: '2026-06-01', shift: 'morning', buildingIds: ['b6', 'b7', 'b12'], isModified: false },
  { id: 's4', inspectorId: 'i5', date: '2026-06-01', shift: 'afternoon', buildingIds: ['b8', 'b9'], isModified: false },
  { id: 's5', inspectorId: 'i6', date: '2026-06-01', shift: 'afternoon', buildingIds: ['b10', 'b11'], isModified: false },
  { id: 's6', inspectorId: 'i1', date: '2026-06-02', shift: 'morning', buildingIds: ['b1', 'b2', 'b3'], isModified: false },
  { id: 's7', inspectorId: 'i2', date: '2026-06-02', shift: 'morning', buildingIds: ['b4', 'b5', 'b6'], isModified: false },
];

export const leaveRecords: LeaveRecord[] = [
  { id: 'l1', inspectorId: 'i4', startDate: '2026-06-01', endDate: '2026-06-03', type: 'sick', status: 'approved', reason: '感冒发烧，需休息' },
  { id: 'l2', inspectorId: 'i6', startDate: '2026-06-05', endDate: '2026-06-06', type: 'annual', status: 'pending', reason: '年假申请' },
];

export const anomalies: Anomaly[] = [
  {
    id: 'a1',
    type: 'access_closed',
    level: 'high',
    description: '3号楼门禁系统已关闭超过30分钟',
    sourceIds: ['b3'],
    sourceTypes: ['building'],
    detectedAt: '2026-06-01 08:00',
    resolved: false,
    details: { lastOpenTime: '2026-06-01 07:30', affectedInspectors: ['i2'] },
  },
  {
    id: 'a2',
    type: 'access_closed',
    level: 'high',
    description: '9号楼门禁系统异常关闭',
    sourceIds: ['b8'],
    sourceTypes: ['building'],
    detectedAt: '2026-06-01 06:15',
    resolved: false,
    details: { lastOpenTime: '2026-06-01 06:00', affectedInspectors: ['i5'] },
  },
  {
    id: 'a3',
    type: 'route_break',
    level: 'medium',
    description: '3号楼至7号楼路线中断，影响B区巡检路线',
    sourceIds: ['e4'],
    sourceTypes: ['route_edge'],
    detectedAt: '2026-06-01 07:45',
    resolved: false,
    details: { fromBuilding: 'b3', toBuilding: 'b6', alternativeRoute: 'b3->b1->b2->b4->b6' },
  },
  {
    id: 'a4',
    type: 'route_break',
    level: 'medium',
    description: '8号楼至10号楼路线中断',
    sourceIds: ['e11'],
    sourceTypes: ['route_edge'],
    detectedAt: '2026-06-01 08:00',
    resolved: false,
    details: { fromBuilding: 'b8', toBuilding: 'b10', alternativeRoute: 'b8->b7->b9->b12->b10' },
  },
  {
    id: 'a5',
    type: 'duplicate_inspection',
    level: 'low',
    description: '5号楼今日安排了2次巡检，存在资源重复',
    sourceIds: ['wo1', 'wo3'],
    sourceTypes: ['work_order', 'work_order'],
    detectedAt: '2026-06-01 07:00',
    resolved: false,
    details: { buildingId: 'b5', inspectors: ['i1', 'i1'], times: ['08:00', '10:00'] },
  },
];

export const changeLogs: ChangeLog[] = [
  {
    id: 'cl1',
    entityType: 'schedule',
    entityId: 's2',
    field: 'buildingIds',
    oldValue: 'b3,b4,b5',
    newValue: 'b3,b4',
    operator: '系统管理员',
    timestamp: '2026-06-01 07:30',
    reason: '5号楼由张建国负责，避免重复巡检',
  },
  {
    id: 'cl2',
    entityType: 'work_order',
    entityId: 'wo2',
    field: 'priority',
    oldValue: 'medium',
    newValue: 'high',
    operator: '工程主管',
    timestamp: '2026-06-01 08:45',
    reason: '门禁故障影响业主出行，提升优先级',
  },
  {
    id: 'cl3',
    entityType: 'work_order',
    entityId: 'wo7',
    field: 'source',
    oldValue: 'system',
    newValue: 'manual',
    operator: '工程主管',
    timestamp: '2026-06-01 09:00',
    reason: '季度消防检查提前进行，人工插单',
  },
];
