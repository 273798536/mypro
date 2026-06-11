import type { Point, ViewPreset, Cabinet } from '../../shared/types';

export const initialCabinets: Cabinet[] = [
  { id: 'CAB-A-01', region: 'A', index: 1, x: 200, y: 100, width: 160, height: 320, label: 'A-01' },
  { id: 'CAB-A-02', region: 'A', index: 2, x: 380, y: 100, width: 160, height: 320, label: 'A-02' },
  { id: 'CAB-A-03', region: 'A', index: 3, x: 560, y: 100, width: 160, height: 320, label: 'A-03' },
  { id: 'CAB-A-04', region: 'A', index: 4, x: 740, y: 100, width: 160, height: 320, label: 'A-04' },
  { id: 'CAB-B-01', region: 'B', index: 1, x: 200, y: 480, width: 160, height: 320, label: 'B-01' },
  { id: 'CAB-B-02', region: 'B', index: 2, x: 380, y: 480, width: 160, height: 320, label: 'B-02' },
  { id: 'CAB-B-03', region: 'B', index: 3, x: 560, y: 480, width: 160, height: 320, label: 'B-03' },
  { id: 'CAB-B-04', region: 'B', index: 4, x: 740, y: 480, width: 160, height: 320, label: 'B-04' },
];

const now = Date.now();
const DAY = 86400000;

export const initialPoints: Point[] = [
  {
    id: 'P-0001', x: 280, y: 180, cabinetId: 'CAB-A-01',
    type: 'sensor', status: 'normal',
    remark: 'A-01机柜进风口温度传感器，稳定运行238天，近7日平均22.4°C',
    originalRow: 12, isBadData: false, withdrawn: false,
    supplements: [], createdAt: now - 200 * DAY, updatedAt: now - 5 * DAY,
  },
  {
    id: 'P-0002', x: 295, y: 192, cabinetId: 'CAB-A-01',
    type: 'sensor', status: 'warning',
    remark: '与P-0001坐标疑似重叠，待调度人工复核',
    originalRow: 13, isBadData: true,
    badDataReason: 'x/y值与P-0001距离仅17px，低于阈值30px',
    withdrawn: false,
    supplements: [
      { id: 'S-001', content: '6月8日后补：运维复核确认点位重复录入，P-0001为主点位，此点保留用于原始数据追踪', operator: '排班-李明', timestamp: now - 3 * DAY },
    ],
    createdAt: now - 199 * DAY, updatedAt: now - 3 * DAY,
  },
  {
    id: 'P-0003', x: 460, y: 210, cabinetId: 'CAB-A-02',
    type: 'outlet', status: 'normal',
    remark: '旧版点位坐标已撤回，请参考P-0004',
    originalRow: 14, isBadData: false,
    withdrawn: true,
    withdrawalInfo: { reason: '坐标偏移超过容差±50px，重新勘测后更新', operator: '排班-王芳', timestamp: now - 10 * DAY },
    supplements: [],
    createdAt: now - 198 * DAY, updatedAt: now - 10 * DAY,
  },
  {
    id: 'P-0004', x: 445, y: 205, cabinetId: 'CAB-A-02',
    type: 'outlet', status: 'normal',
    remark: 'A-02机柜PDU主回路插座，额定电流32A，负载率48%',
    originalRow: 15, isBadData: false, withdrawn: false,
    supplements: [], createdAt: now - 197 * DAY, updatedAt: now - 2 * DAY,
  },
  {
    id: 'P-0005', x: 620, y: 165, cabinetId: 'CAB-A-03',
    type: 'switch', status: 'normal',
    remark: 'A-03核心接入交换机，上行10G，下联48口，流量峰值出现在工作日14-16点',
    originalRow: 16, isBadData: false, withdrawn: false,
    supplements: [], createdAt: now - 196 * DAY, updatedAt: now - 1 * DAY,
  },
  {
    id: 'P-0006', x: 800, y: 250, cabinetId: 'CAB-A-04',
    type: 'cable', status: 'warning',
    remark: 'A-04光缆走线架，上周巡检标签松动，已安排工程班组下周紧固',
    originalRow: 17, isBadData: false, withdrawn: false,
    supplements: [
      { id: 'S-002', content: '补充：预计6月15日上午施工，预计耗时2小时，不影响业务', operator: '排班-张强', timestamp: now - 1 * DAY },
    ],
    createdAt: now - 195 * DAY, updatedAt: now - 1 * DAY,
  },
  {
    id: 'P-0007', x: 275, y: 560, cabinetId: 'CAB-B-01',
    type: 'sensor', status: 'error',
    remark: 'B-01机柜回风温度传感器，离线超过48小时，已派发工单SN-20240610-017',
    originalRow: 18, isBadData: false, withdrawn: false,
    supplements: [], createdAt: now - 194 * DAY, updatedAt: now - 1 * DAY,
  },
  {
    id: 'P-0008', x: 450, y: 580, cabinetId: 'CAB-B-02',
    type: 'sensor', status: 'normal',
    remark: 'B-02进风口温湿度一体，湿度波动在正常范围45-55%RH',
    originalRow: 19, isBadData: false, withdrawn: false,
    supplements: [], createdAt: now - 193 * DAY, updatedAt: now - 6 * DAY,
  },
  {
    id: 'P-0009', x: 462, y: 588, cabinetId: 'CAB-B-02',
    type: 'sensor', status: 'warning',
    remark: '录入时坐标偏移，与P-0008邻近，建议复核',
    originalRow: 20, isBadData: true,
    badDataReason: '两点距离14px，高风险重叠',
    withdrawn: false,
    supplements: [],
    createdAt: now - 192 * DAY, updatedAt: now - 7 * DAY,
  },
  {
    id: 'P-0010', x: 640, y: 620, cabinetId: 'CAB-B-03',
    type: 'outlet', status: 'normal',
    remark: 'B-03机柜双路UPS供电，A路为主、B路备用，切换测试每季度一次',
    originalRow: 21, isBadData: false, withdrawn: false,
    supplements: [], createdAt: now - 191 * DAY, updatedAt: now - 14 * DAY,
  },
  {
    id: 'P-0011', x: 820, y: 540, cabinetId: 'CAB-B-04',
    type: 'switch', status: 'normal',
    remark: 'B-04汇聚交换机，STP根桥，当前CPU利用率28%正常',
    originalRow: 22, isBadData: false, withdrawn: false,
    supplements: [], createdAt: now - 190 * DAY, updatedAt: now - 8 * DAY,
  },
];

export const initialViews: ViewPreset[] = [
  {
    id: 'V-001',
    name: '冷通道A区-整体视角（汇报用）',
    thumbnail: '',
    zoom: 0.85, panX: 0, panY: -20,
    filters: {
      regions: ['A'],
      types: ['sensor', 'outlet', 'switch', 'cable'],
      statuses: ['normal', 'warning', 'error'],
      showWithdrawn: false,
      showSupplements: true,
    },
    createdAt: now - 4 * DAY,
  },
  {
    id: 'V-002',
    name: '异常点位专题（含撤回与坏数据）',
    thumbnail: '',
    zoom: 1.0, panX: 0, panY: 0,
    filters: {
      regions: ['A', 'B'],
      types: ['sensor', 'outlet', 'switch', 'cable'],
      statuses: ['warning', 'error'],
      showWithdrawn: true,
      showSupplements: true,
    },
    createdAt: now - 2 * DAY,
  },
  {
    id: 'V-003',
    name: 'B区巡检视角（昨天保存）',
    thumbnail: '',
    zoom: 0.95, panX: 0, panY: 60,
    filters: {
      regions: ['B'],
      types: ['sensor', 'outlet', 'switch', 'cable'],
      statuses: ['normal', 'warning', 'error'],
      showWithdrawn: false,
      showSupplements: true,
    },
    createdAt: now - 1 * DAY,
  },
];
