import { SpaceNode, PathEdge, WorkOrder, Anomaly, TimePoint } from '../types';

export const mockNodes: SpaceNode[] = [
  { id: 'A1', name: '教学楼A入口', type: 'entrance', x: 0, y: 0, z: 0, floor: 0, building: 'A栋教学楼', description: '教学楼A栋地下入口' },
  { id: 'A2', name: '连廊交叉口1', type: 'junction', x: 15, y: 0, z: 0, floor: 0, description: '主要连廊交叉口' },
  { id: 'A3', name: '管井A-01', type: 'pipe_well', x: 15, y: -8, z: 0, floor: 0, building: 'A栋教学楼', description: '给排水管井' },
  { id: 'A4', name: '设备房A-机房', type: 'equipment_room', x: 15, y: 8, z: 0, floor: 0, building: 'A栋教学楼', description: '中央空调机房' },
  { id: 'B1', name: '连廊交叉口2', type: 'junction', x: 35, y: 0, z: 0, floor: 0, description: '图书馆方向交叉口' },
  { id: 'B2', name: '图书馆地下入口', type: 'entrance', x: 50, y: 0, z: 0, floor: 0, building: '图书馆', description: '图书馆B1层入口' },
  { id: 'B3', name: '管井B-01', type: 'pipe_well', x: 35, y: -10, z: 0, floor: 0, building: '图书馆', description: '强弱电管井' },
  { id: 'B4', name: '设备房B-弱电', type: 'equipment_room', x: 35, y: 10, z: 0, floor: 0, building: '图书馆', description: '网络机房' },
  { id: 'C1', name: '实验楼入口', type: 'entrance', x: 25, y: 20, z: 0, floor: 0, building: '实验楼', description: '实验楼地下入口' },
  { id: 'C2', name: '连廊交叉口3', type: 'junction', x: 25, y: 10, z: 0, floor: 0, description: '实验楼方向连廊' },
  { id: 'C3', name: '设备房C-通风', type: 'equipment_room', x: 25, y: 15, z: 0, floor: 0, building: '实验楼', description: '通风设备房' },
  { id: 'C4', name: '管井C-01', type: 'pipe_well', x: 25, y: 5, z: 0, floor: 0, building: '实验楼', description: '消防管井' },
  { id: 'S1', name: '楼梯间1', type: 'stairwell', x: 10, y: 5, z: 0, floor: 0, description: '通往1层楼梯' },
  { id: 'S2', name: '楼梯间2', type: 'stairwell', x: 40, y: 5, z: 0, floor: 0, description: '通往1层楼梯' },
];

export const mockEdges: PathEdge[] = [
  { id: 'E1', from: 'A1', to: 'A2', distance: 15, status: 'open', description: '主连廊A段' },
  { id: 'E2', from: 'A2', to: 'A3', distance: 8, status: 'open', description: '管井通道' },
  { id: 'E3', from: 'A2', to: 'A4', distance: 8, status: 'access_issue', accessControl: true, description: '机房通道-门禁故障' },
  { id: 'E4', from: 'A2', to: 'B1', distance: 20, status: 'open', description: '主连廊B段' },
  { id: 'E5', from: 'B1', to: 'B2', distance: 15, status: 'open', description: '图书馆入口通道' },
  { id: 'E6', from: 'B1', to: 'B3', distance: 10, status: 'closed', description: '通道临时封闭-施工中' },
  { id: 'E7', from: 'B1', to: 'B4', distance: 10, status: 'open', description: '弱电房通道' },
  { id: 'E8', from: 'A2', to: 'C2', distance: 14, status: 'open', description: '实验楼连廊' },
  { id: 'E9', from: 'C2', to: 'C1', distance: 10, status: 'open', description: '实验楼入口' },
  { id: 'E10', from: 'C2', to: 'C3', distance: 5, status: 'open', description: '通风设备通道' },
  { id: 'E11', from: 'C2', to: 'C4', distance: 5, status: 'open', description: '消防管井通道' },
  { id: 'E12', from: 'A2', to: 'S1', distance: 11, status: 'open', description: '楼梯间1通道' },
  { id: 'E13', from: 'B1', to: 'S2', distance: 7, status: 'open', description: '楼梯间2通道' },
];

export const mockWorkOrders: WorkOrder[] = [
  { id: 'WO001', title: '空调机房例行巡检', locationId: 'A4', status: 'in_progress', createTime: new Date('2026-05-28'), priority: 'medium', description: '每月例行检查' },
  { id: 'WO002', title: '门禁系统维修', locationId: 'A4', status: 'pending', createTime: new Date('2026-05-29'), priority: 'high', description: 'E3通道门禁失效' },
  { id: 'WO003', title: '网络设备升级', locationId: 'B4', status: 'pending', createTime: new Date('2026-05-30'), priority: 'medium', description: '核心交换机升级' },
  { id: 'WO004', title: '管道渗漏修复', locationId: 'A3', status: 'completed', createTime: new Date('2026-05-25'), priority: 'high', description: '给排水管渗漏' },
  { id: 'WO005', title: '通风系统清洗', locationId: 'C3', status: 'pending', createTime: new Date('2026-05-30'), priority: 'low', description: '季度清洗维护' },
];

export const mockAnomalies: Anomaly[] = [
  { id: 'AN001', type: 'access_failed', description: 'E3通道门禁系统故障，刷卡无响应', pathId: 'E3', resolved: false, source: '门禁系统日志' },
  { id: 'AN002', type: 'path_closed', description: 'E6通道因施工临时封闭，请绕行', pathId: 'E6', resolved: false, source: '基建处通知' },
  { id: 'AN003', type: 'bad_row', description: '设备房数据缺失-列不完整', nodeId: 'A4', resolved: false, source: '导入数据-坏行', rawData: 'A4,设备房,,机房,' },
  { id: 'AN004', type: 'missing_data', description: '管井B-02坐标数据缺失', nodeId: 'B3', resolved: false, source: '测绘数据', rawData: 'B3,管井,,' },
  { id: 'AN005', type: 'bad_row', description: '维修工单格式错误-空行', resolved: false, source: '工单系统', rawData: ',,' },
  { id: 'AN006', type: 'bad_row', description: '维修工单格式错误-备注行', resolved: false, source: '工单系统', rawData: '# 备注:以下为待处理工单' },
];

export const mockTimePoints: TimePoint[] = [
  { id: 'T1', name: '改造前', timestamp: new Date('2026-01-01'), description: '地下空间原始布局' },
  { id: 'T2', name: '改造中', timestamp: new Date('2026-03-15'), description: '连廊扩建施工中' },
  { id: 'T3', name: '改造完成', timestamp: new Date('2026-05-01'), description: '新布局启用' },
  { id: 'T4', name: '当前状态', timestamp: new Date('2026-05-30'), description: '包含最新异常状态' },
];
