import type { YardData, Slot, Container, Crane, Voyage, Job, Conflict, ViewConfig, YardState } from '@/@types';

export const yardData: YardData = {
  id: 'yard-01',
  name: 'A区堆场',
  rows: 6,
  bays: 12,
  tiers: 4,
};

export const generateSlots = (yard: YardData): Slot[] => {
  const slots: Slot[] = [];
  for (let row = 0; row < yard.rows; row++) {
    for (let bay = 0; bay < yard.bays; bay++) {
      for (let tier = 0; tier < yard.tiers; tier++) {
        const id = `${String.fromCharCode(65 + row)}${String(bay + 1).padStart(2, '0')}-${tier + 1}`;
        slots.push({
          id,
          yardId: yard.id,
          row,
          bay,
          tier,
          status: 'empty',
          isLocked: false,
        });
      }
    }
  }
  return slots;
};

export const containers: Container[] = [
  { id: 'c001', slotId: 'A01-1', containerNo: 'MSKU1234567', size: '40HQ', type: 'dry', isHazardous: false, voyageId: 'v001', weight: 25000 },
  { id: 'c002', slotId: 'A01-2', containerNo: 'MSKU7654321', size: '40HQ', type: 'dry', isHazardous: false, voyageId: 'v001', weight: 22000 },
  { id: 'c003', slotId: 'A01-3', containerNo: 'MSKU9876543', size: '20GP', type: 'hazardous', isHazardous: true, hazardClass: '3', voyageId: 'v001', weight: 18000 },
  { id: 'c004', slotId: 'A02-1', containerNo: 'CMAU1112223', size: '40GP', type: 'dry', isHazardous: false, voyageId: 'v001', weight: 26000 },
  { id: 'c005', slotId: 'A02-2', containerNo: 'CMAU3334445', size: '40GP', type: 'reefer', isHazardous: false, voyageId: 'v002', weight: 20000 },
  { id: 'c006', slotId: 'A02-3', containerNo: 'CMAU5556667', size: '20GP', type: 'dry', isHazardous: false, voyageId: 'v002', weight: 15000 },
  { id: 'c007', slotId: 'A03-1', containerNo: 'OOLU9998887', size: '40HQ', type: 'hazardous', isHazardous: true, hazardClass: '8', voyageId: 'v001', weight: 24000 },
  { id: 'c008', slotId: 'A03-2', containerNo: 'OOLU7776665', size: '40HQ', type: 'dry', isHazardous: false, voyageId: 'v001', weight: 23000 },
  { id: 'c009', slotId: 'B01-1', containerNo: 'EMCU4445556', size: '40GP', type: 'dry', isHazardous: false, voyageId: 'v002', weight: 27000 },
  { id: 'c010', slotId: 'B01-2', containerNo: 'EMCU6667778', size: '20GP', type: 'dry', isHazardous: false, voyageId: 'v002', weight: 16000 },
  { id: 'c011', slotId: 'B02-1', containerNo: 'MAEU2223334', size: '40HQ', type: 'reefer', isHazardous: false, voyageId: 'v001', weight: 21000 },
  { id: 'c012', slotId: 'B02-2', containerNo: 'MAEU8889990', size: '40HQ', type: 'hazardous', isHazardous: true, hazardClass: '3', voyageId: 'v002', weight: 19000 },
  { id: 'c013', slotId: 'C01-1', containerNo: 'HLCU1237890', size: '40GP', type: 'dry', isHazardous: false, voyageId: 'v001', weight: 25500 },
  { id: 'c014', slotId: 'C01-2', containerNo: 'HLCU4560123', size: '20GP', type: 'openTop', isHazardous: false, voyageId: 'v002', weight: 14000 },
  { id: 'c015', slotId: 'D01-1', containerNo: 'YMLU7893456', size: '40HQ', type: 'dry', isHazardous: false, voyageId: 'v001', weight: 26500 },
  { id: 'c016', slotId: 'D02-1', containerNo: 'YMLU0126789', size: '40HQ', type: 'dry', isHazardous: false, voyageId: 'v002', weight: 24500 },
  { id: 'c017', slotId: 'E01-1', containerNo: 'NYKU3459012', size: '20GP', type: 'hazardous', isHazardous: true, hazardClass: '9', voyageId: 'v001', weight: 17000 },
  { id: 'c018', slotId: 'E02-1', containerNo: 'NYKU6782345', size: '40GP', type: 'dry', isHazardous: false, voyageId: 'v002', weight: 23500 },
  { id: 'c019', slotId: 'F01-1', containerNo: 'COSU9015678', size: '40HQ', type: 'dry', isHazardous: false, voyageId: 'v001', weight: 22500 },
  { id: 'c020', slotId: 'F02-1', containerNo: 'COSU2348901', size: '40GP', type: 'reefer', isHazardous: false, voyageId: 'v002', weight: 19500 },
];

export const cranes: Crane[] = [
  { id: 'crane-01', name: 'RTG-01', type: 'rtg', position: { x: 0, y: 0, z: 0 }, status: 'working', currentJobId: 'j001' },
  { id: 'crane-02', name: 'RTG-02', type: 'rtg', position: { x: 3, y: 0, z: 0 }, status: 'working', currentJobId: 'j002' },
  { id: 'crane-03', name: 'RTG-03', type: 'rtg', position: { x: 6, y: 0, z: 0 }, status: 'idle' },
  { id: 'crane-04', name: 'RTG-04', type: 'rtg', position: { x: 9, y: 0, z: 0 }, status: 'maintenance' },
];

export const voyages: Voyage[] = [
  { id: 'v001', vesselName: '中远荷兰', voyageNo: 'COS001E', eta: '2026-05-30T08:00:00', etd: '2026-05-31T02:00:00' },
  { id: 'v002', vesselName: '马士基吉隆坡', voyageNo: 'MAK123W', eta: '2026-05-30T14:00:00', etd: '2026-06-01T06:00:00' },
];

export const jobs: Job[] = [
  { id: 'j001', craneId: 'crane-01', containerId: 'c001', type: 'load', scheduledTime: '2026-05-30T09:00:00', status: 'in_progress' },
  { id: 'j002', craneId: 'crane-02', containerId: 'c004', type: 'unload', scheduledTime: '2026-05-30T09:30:00', status: 'pending' },
  { id: 'j003', craneId: 'crane-03', containerId: 'c005', type: 'move', scheduledTime: '2026-05-30T10:00:00', status: 'pending' },
  { id: 'j004', craneId: 'crane-01', containerId: 'c007', type: 'load', scheduledTime: '2026-05-30T11:00:00', status: 'pending' },
  { id: 'j005', craneId: 'crane-02', containerId: 'c012', type: 'load', scheduledTime: '2026-05-30T12:00:00', status: 'pending' },
];

export const conflicts: Conflict[] = [
  {
    id: 'cf-001',
    type: 'hazardous_adjacent',
    severity: 'critical',
    description: '危险品箱A01-3(类别3)与普通箱A02-1相邻，距离不足安全隔离要求',
    status: 'open',
    involvedSlotIds: ['A01-3', 'A02-1'],
    involvedContainerIds: ['c003', 'c004'],
    involvedCraneIds: [],
    traceChain: {
      id: 'tc-001',
      ruleName: '危险品相邻检测',
      ruleVersion: 'R-HZ-001-v1.2',
      dataSources: [
        { type: 'container', sourceFile: 'container_list_20260529.xlsx', sourceLine: 45, sourceField: 'isHazardous', recordId: 'c003', value: 'true' },
        { type: 'container', sourceFile: 'container_list_20260529.xlsx', sourceLine: 52, sourceField: 'slotId', recordId: 'c004', value: 'A02-1' },
        { type: 'slot', sourceFile: 'yard_layout_v3.csv', sourceLine: 15, sourceField: 'coordinates', recordId: 'A01-3', value: 'row:0,bay:2,tier:2' },
      ],
      computedAt: '2026-05-29T10:30:00',
      previousDiff: '上次计算无此冲突',
    },
    actionItems: [
      { id: 'ai-001', assignee: '张主管', assigneeRole: '危险品管理', documentToModify: '箱位分配表', documentSection: 'A区危险品隔离', description: '将危险品箱A01-3移至危险品专用区域', priority: 'high' },
      { id: 'ai-002', assignee: '李调度', assigneeRole: '堆场调度', documentToModify: '作业单COS001E', documentSection: '第12项装卸', description: '调整该危险品箱的装船顺序', priority: 'medium' },
    ],
  },
  {
    id: 'cf-002',
    type: 'hazardous_mixed',
    severity: 'critical',
    description: 'A03-1危险品(类别8)与A01-3危险品(类别3)混堆在同一区域，不同类危险品需分离',
    status: 'open',
    involvedSlotIds: ['A03-1', 'A01-3'],
    involvedContainerIds: ['c007', 'c003'],
    involvedCraneIds: [],
    traceChain: {
      id: 'tc-002',
      ruleName: '危险品混堆检测',
      ruleVersion: 'R-HZ-002-v1.0',
      dataSources: [
        { type: 'container', sourceFile: 'container_list_20260529.xlsx', sourceLine: 68, sourceField: 'hazardClass', recordId: 'c007', value: '8' },
        { type: 'container', sourceFile: 'container_list_20260529.xlsx', sourceLine: 45, sourceField: 'hazardClass', recordId: 'c003', value: '3' },
      ],
      computedAt: '2026-05-29T10:30:00',
    },
    actionItems: [
      { id: 'ai-003', assignee: '张主管', assigneeRole: '危险品管理', documentToModify: '危险品分区图', documentSection: 'A区', description: '将类别3和类别8危险品分配到不同隔离区域', priority: 'high' },
    ],
  },
  {
    id: 'cf-003',
    type: 'crane_collision',
    severity: 'warning',
    description: 'RTG-01与RTG-02作业路径在10:00-10:30时间段存在重叠风险',
    status: 'open',
    involvedSlotIds: [],
    involvedContainerIds: ['c001', 'c004'],
    involvedCraneIds: ['crane-01', 'crane-02'],
    traceChain: {
      id: 'tc-003',
      ruleName: '吊机作业冲突',
      ruleVersion: 'R-CR-001-v2.1',
      dataSources: [
        { type: 'crane', sourceFile: 'crane_schedule.csv', sourceLine: 8, sourceField: 'working_area', recordId: 'crane-01', value: 'A01-A04' },
        { type: 'crane', sourceFile: 'crane_schedule.csv', sourceLine: 9, sourceField: 'working_area', recordId: 'crane-02', value: 'A02-A05' },
        { type: 'job', sourceFile: 'daily_jobs.json', sourceLine: 23, sourceField: 'scheduledTime', recordId: 'j001', value: '09:00-10:00' },
      ],
      computedAt: '2026-05-29T10:30:00',
    },
    actionItems: [
      { id: 'ai-004', assignee: '王班长', assigneeRole: '吊机调度', documentToModify: '吊机排班表', documentSection: '5月30日上午', description: '调整RTG-02作业开始时间至10:30后', priority: 'medium' },
    ],
  },
  {
    id: 'cf-004',
    type: 'rehandle_excessive',
    severity: 'info',
    description: 'A区当前翻箱率35%，超过建议阈值30%，建议优化堆存策略',
    status: 'open',
    involvedSlotIds: ['A01-1', 'A01-2', 'A02-1', 'A02-2', 'A03-1'],
    involvedContainerIds: ['c001', 'c002', 'c004', 'c005', 'c007', 'c008'],
    involvedCraneIds: [],
    traceChain: {
      id: 'tc-004',
      ruleName: '翻箱次数超标',
      ruleVersion: 'R-RH-001-v1.0',
      dataSources: [
        { type: 'slot', sourceFile: 'rehandle_stats.log', sourceLine: 156, sourceField: 'rehandle_count', recordId: 'A-area', value: '28' },
      ],
      computedAt: '2026-05-29T10:30:00',
    },
    actionItems: [
      { id: 'ai-005', assignee: '陈计划', assigneeRole: '堆场计划', documentToModify: '堆存策略文档', documentSection: 'A区重箱区', description: '按卸船顺序优化堆存，减少翻箱', priority: 'low' },
    ],
  },
];

export const viewConfigs: ViewConfig[] = [
  { id: 'view-001', name: '全局俯视图', cameraPosition: [15, 25, 15], cameraTarget: [6, 0, 3], createdAt: '2026-05-28T08:00:00', userId: 'dispatcher-01' },
  { id: 'view-002', name: 'A区特写', cameraPosition: [2, 8, 2], cameraTarget: [2, 0, 1], createdAt: '2026-05-28T09:30:00', userId: 'dispatcher-01' },
  { id: 'view-003', name: '危险品区', cameraPosition: [0, 6, 4], cameraTarget: [0, 0, 2], createdAt: '2026-05-28T10:00:00', userId: 'dispatcher-02' },
];

export const initialSlots = (() => {
  const slots = generateSlots(yardData);
  containers.forEach(container => {
    const slot = slots.find(s => s.id === container.slotId);
    if (slot) {
      slot.status = 'occupied';
    }
  });
  
  const lockedSlots = ['C01-1', 'C01-2'];
  lockedSlots.forEach(slotId => {
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      slot.isLocked = true;
      slot.lockRecord = {
        id: `lock-${slotId}`,
        slotId,
        reason: '船舶临时改港，暂不移箱',
        lockedBy: '李调度',
        lockedAt: '2026-05-29T08:00:00',
        expiresAt: '2026-05-30T08:00:00',
      };
    }
  });
  
  return slots;
})();

export const initialState: YardState = {
  yard: yardData,
  slots: initialSlots,
  containers,
  cranes,
  voyages,
  jobs,
  conflicts,
  selectedSlotId: null,
  selectedContainerId: null,
  selectedConflictId: null,
  currentVoyageId: 'v001',
  viewConfigs,
  impactAnalysis: null,
  isImpactMode: false,
  modifiedSlotId: null,
  playbackTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  rehandleCount: 28,
  dataSources: {
    slots: { lastSync: '2026-05-29T10:25:00', count: 288, source: 'yard_layout_v3.csv' },
    containers: { lastSync: '2026-05-29T10:20:00', count: 20, source: 'container_list_20260529.xlsx' },
    cranes: { lastSync: '2026-05-29T10:30:00', count: 4, source: 'TOS实时接口' },
  },
};
