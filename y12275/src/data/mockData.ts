import { Gate, Taxiway, Conflict, DataGap } from '../types';

export const gates: Gate[] = [
  { id: 'gate-1', name: 'T1-101', position: [-20, 0, -15], status: 'conflict', aircraft: 'CA1234', size: 'large' },
  { id: 'gate-2', name: 'T1-102', position: [-10, 0, -15], status: 'conflict', aircraft: 'MU5678', size: 'medium' },
  { id: 'gate-3', name: 'T1-103', position: [0, 0, -15], status: 'occupied', aircraft: 'CZ9012', size: 'medium' },
  { id: 'gate-4', name: 'T1-104', position: [10, 0, -15], status: 'available', size: 'small' },
  { id: 'gate-5', name: 'T1-105', position: [20, 0, -15], status: 'available', size: 'small' },
  { id: 'gate-6', name: 'T2-201', position: [-20, 0, 15], status: 'occupied', aircraft: 'HU3456', size: 'large' },
  { id: 'gate-7', name: 'T2-202', position: [-10, 0, 15], status: 'conflict', aircraft: 'FM7890', size: 'medium' },
  { id: 'gate-8', name: 'T2-203', position: [0, 0, 15], status: 'available', size: 'medium' },
  { id: 'gate-9', name: 'T2-204', position: [10, 0, 15], status: 'conflict', aircraft: 'SC2345', size: 'large' },
  { id: 'gate-10', name: 'T2-205', position: [20, 0, 15], status: 'occupied', aircraft: 'ZH6789', size: 'small' },
];

export const taxiways: Taxiway[] = [
  { id: 'tw-A', name: 'A滑行道', points: [[-30, 0.1, 0], [30, 0.1, 0]], width: 4, direction: 'two-way' },
  { id: 'tw-B', name: 'B滑行道', points: [[0, 0.1, -25], [0, 0.1, 25]], width: 4, direction: 'two-way' },
  { id: 'tw-C', name: 'C滑行道', points: [[-25, 0.1, -8], [-25, 0.1, 8]], width: 3, direction: 'one-way' },
  { id: 'tw-D', name: 'D滑行道', points: [[25, 0.1, -8], [25, 0.1, 8]], width: 3, direction: 'one-way' },
  { id: 'tw-E', name: 'E滑行道', points: [[-15, 0.1, -8], [-15, 0.1, 8]], width: 3, direction: 'one-way' },
  { id: 'tw-F', name: 'F滑行道', points: [[15, 0.1, -8], [15, 0.1, 8]], width: 3, direction: 'one-way' },
];

export const conflicts: Conflict[] = [
  {
    id: 'conflict-1',
    type: 'gate_conflict',
    severity: 'high',
    title: 'T1-101与T1-102机位冲突',
    description: 'CA1234与MU5678在相邻机位同时推出，翼展间距不足安全标准，存在碰撞风险。两机均为宽体机型，滑行路径重叠。',
    gateIds: ['gate-1', 'gate-2'],
    taxiwayIds: ['tw-C'],
    startTime: '2024-05-31T08:15:00',
    endTime: '2024-05-31T08:45:00',
    aircraftInvolved: ['CA1234', 'MU5678'],
    dataSources: [
      { id: 'ds-1', type: 'apron_model', name: '机坪模型_v3.2', link: '#apron-model-v3.2', timestamp: '2024-05-30T10:00:00' },
      { id: 'ds-2', type: 'taxiway_data', name: '滑行道数据_2024Q2', link: '#taxiway-data-2024Q2', timestamp: '2024-05-28T14:30:00' },
      { id: 'ds-3', type: 'control_record', name: '管制记录_0815', link: '#control-record-0815', timestamp: '2024-05-31T08:15:00' },
    ],
  },
  {
    id: 'conflict-2',
    type: 'taxi_crossing',
    severity: 'medium',
    title: 'A/B滑行道交叉口穿越冲突',
    description: '两架航班在主滑行道交叉口同时申请穿越，管制指令时序存在歧义，可能导致滑行冲突。',
    gateIds: ['gate-3', 'gate-6'],
    taxiwayIds: ['tw-A', 'tw-B'],
    startTime: '2024-05-31T09:30:00',
    endTime: '2024-05-31T09:45:00',
    aircraftInvolved: ['CZ9012', 'HU3456'],
    dataSources: [
      { id: 'ds-4', type: 'apron_model', name: '机坪模型_v3.2', link: '#apron-model-v3.2', timestamp: '2024-05-30T10:00:00' },
      { id: 'ds-5', type: 'control_record', name: '管制记录_0930', link: '#control-record-0930', timestamp: '2024-05-31T09:30:00' },
    ],
  },
  {
    id: 'conflict-3',
    type: 'wait_timeout',
    severity: 'medium',
    title: 'T2-202等待超时',
    description: 'FM7890在T2-202机位等待超过45分钟，超出SLA标准。原因是滑行道资源调度冲突。',
    gateIds: ['gate-7'],
    taxiwayIds: ['tw-E'],
    startTime: '2024-05-31T10:00:00',
    endTime: '2024-05-31T10:50:00',
    aircraftInvolved: ['FM7890'],
    dataSources: [
      { id: 'ds-6', type: 'taxiway_data', name: '滑行道数据_2024Q2', link: '#taxiway-data-2024Q2', timestamp: '2024-05-28T14:30:00' },
      { id: 'ds-7', type: 'report', name: '运行日报_0531', link: '#report-0531', timestamp: '2024-05-31T18:00:00' },
    ],
  },
  {
    id: 'conflict-4',
    type: 'gate_conflict',
    severity: 'high',
    title: 'T2-204机位分配冲突',
    description: 'SC2345停靠的T2-204机位与相邻机位的滑行缓冲区重叠，且该机位当日被重复分配给两个航班。',
    gateIds: ['gate-9', 'gate-10'],
    taxiwayIds: ['tw-F'],
    startTime: '2024-05-31T11:20:00',
    endTime: '2024-05-31T11:55:00',
    aircraftInvolved: ['SC2345', 'ZH6789'],
    dataSources: [
      { id: 'ds-8', type: 'apron_model', name: '机坪模型_v3.2', link: '#apron-model-v3.2', timestamp: '2024-05-30T10:00:00' },
      { id: 'ds-9', type: 'taxiway_data', name: '滑行道数据_2024Q2', link: '#taxiway-data-2024Q2', timestamp: '2024-05-28T14:30:00' },
      { id: 'ds-10', type: 'control_record', name: '管制记录_1120', link: '#control-record-1120', timestamp: '2024-05-31T11:20:00' },
      { id: 'ds-11', type: 'report', name: '运行日报_0531', link: '#report-0531', timestamp: '2024-05-31T18:00:00' },
    ],
  },
];

export const dataGaps: DataGap[] = [
  {
    id: 'gap-1',
    type: 'apron_height_data',
    description: '机坪高程数据缺失，3D渲染中部分区域高度为估算值',
    affectedAreas: ['T1-104', 'T1-105', 'T2-203'],
    severity: 'warning',
  },
  {
    id: 'gap-2',
    type: 'taxiway_marking',
    description: 'D滑行道部分标线数据不完整，可视化效果可能与实际有偏差',
    affectedAreas: ['tw-D'],
    severity: 'warning',
  },
];

export const timeRange = {
  start: '2024-05-31T08:00:00',
  end: '2024-05-31T12:00:00',
};
