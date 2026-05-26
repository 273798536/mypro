import type { PipeNode, PipeSegment, Valve, PumpStation, UserArea, DispatchRecord, CorrectionRecord } from '@/types';

export const PRESSURE_THRESHOLD = 0.14;
export const PRESSURE_MAX = 0.60;

export const mockNodes: PipeNode[] = [
  { id: 'N01', position: [0, 0, 0], label: '1号泵站节点' },
  { id: 'N02', position: [5, 0, 0], label: '交汇点A' },
  { id: 'N03', position: [10, 0, 0], label: '交汇点B' },
  { id: 'N04', position: [10, 0, 5], label: '交汇点C' },
  { id: 'N05', position: [5, 0, 5], label: '交汇点D' },
  { id: 'N06', position: [0, 0, 5], label: '2号泵站节点' },
  { id: 'N07', position: [15, 0, 2.5], label: '末端节点1' },
  { id: 'N08', position: [10, 0, -3], label: '末端节点2' },
  { id: 'N09', position: [0, 0, -3], label: '末端节点3' },
  { id: 'N10', position: [5, 0, 10], label: '末端节点4' },
  { id: 'N11', position: [15, 0, -3], label: '末端节点5' },
  { id: 'N12', position: [-3, 0, 2.5], label: '末端节点6' },
];

export const mockSegments: PipeSegment[] = [
  {
    id: 'P001', fromNode: 'N01', toNode: 'N02', diameter: 400, material: '球墨铸铁',
    basePressure: 0.45, currentPressure: 0.45, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P002', fromNode: 'N02', toNode: 'N03', diameter: 350, material: '球墨铸铁',
    basePressure: 0.42, currentPressure: 0.42, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P003', fromNode: 'N03', toNode: 'N04', diameter: 300, material: '钢管',
    basePressure: 0.38, currentPressure: 0.38, source: '巡检记录2024-02-28',
    corrections: [
      { id: 'C001', timestamp: Date.now() - 86400000, field: 'basePressure',
        oldValue: '0.40', newValue: '0.38', operator: '张工', reason: '修正传感器漂移误差' },
    ], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P004', fromNode: 'N04', toNode: 'N05', diameter: 250, material: '钢管',
    basePressure: 0.35, currentPressure: 0.35, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P005', fromNode: 'N05', toNode: 'N06', diameter: 350, material: '球墨铸铁',
    basePressure: 0.40, currentPressure: 0.40, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P006', fromNode: 'N06', toNode: 'N01', diameter: 400, material: '球墨铸铁',
    basePressure: 0.43, currentPressure: 0.43, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: true, dataQuality: 'good',
  },
  {
    id: 'P007', fromNode: 'N03', toNode: 'N07', diameter: 200, material: 'PE管',
    basePressure: 0.32, currentPressure: 0.32, source: '巡检记录2024-02-28',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P008', fromNode: 'N04', toNode: 'N08', diameter: 200, material: 'PE管',
    basePressure: 0.28, currentPressure: 0.28, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P009', fromNode: 'N01', toNode: 'N09', diameter: 200, material: 'PE管',
    basePressure: 0.30, currentPressure: 0.30, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P010', fromNode: 'N05', toNode: 'N10', diameter: 150, material: 'PE管',
    basePressure: 0.14, currentPressure: 0.14, source: '巡检记录2024-03-10',
    corrections: [
      { id: 'C002', timestamp: Date.now() - 43200000, field: 'basePressure',
        oldValue: '0.18', newValue: '0.14', operator: '李工', reason: '末端用户反馈水压不足，现场实测修正' },
    ], isClosedLoop: false, dataQuality: 'boundary',
  },
  {
    id: 'P011', fromNode: 'N03', toNode: 'N11', diameter: 150, material: 'PE管',
    basePressure: 0.25, currentPressure: 0.25, source: 'SCADA系统2024-03-15',
    corrections: [], isClosedLoop: false, dataQuality: 'good',
  },
  {
    id: 'P012', fromNode: 'N06', toNode: 'N12', diameter: 150, material: 'PE管',
    basePressure: -0.05, currentPressure: -0.05, source: '传感器故障-待更换',
    corrections: [
      { id: 'C003', timestamp: Date.now() - 172800000, field: 'basePressure',
        oldValue: '0.22', newValue: '-0.05', operator: '系统自动', reason: '传感器异常读数，已标记为坏数据' },
    ], isClosedLoop: false, dataQuality: 'bad',
  },
];

export const mockValves: Valve[] = [
  { id: 'V001', position: [2.5, 0, 0], isOpen: true, pipeSegmentId: 'P001', isSaved: true, lastModified: Date.now() - 86400000 },
  { id: 'V002', position: [7.5, 0, 0], isOpen: true, pipeSegmentId: 'P002', isSaved: true, lastModified: Date.now() - 172800000 },
  { id: 'V003', position: [10, 0, 2.5], isOpen: true, pipeSegmentId: 'P003', isSaved: false, lastModified: Date.now() - 3600000 },
  { id: 'V004', position: [7.5, 0, 5], isOpen: true, pipeSegmentId: 'P004', isSaved: true, lastModified: Date.now() - 259200000 },
  { id: 'V005', position: [2.5, 0, 5], isOpen: false, pipeSegmentId: 'P005', isSaved: true, lastModified: Date.now() - 43200000 },
  { id: 'V006', position: [0, 0, 2.5], isOpen: true, pipeSegmentId: 'P006', isSaved: true, lastModified: Date.now() - 86400000 },
  { id: 'V007', position: [12.5, 0, 2.5], isOpen: true, pipeSegmentId: 'P007', isSaved: true, lastModified: Date.now() - 86400000 },
  { id: 'V008', position: [10, 0, 1], isOpen: true, pipeSegmentId: 'P008', isSaved: true, lastModified: Date.now() - 172800000 },
  { id: 'V009', position: [0, 0, -1.5], isOpen: true, pipeSegmentId: 'P009', isSaved: true, lastModified: Date.now() - 86400000 },
  { id: 'V010', position: [5, 0, 7.5], isOpen: true, pipeSegmentId: 'P010', isSaved: false, lastModified: Date.now() - 7200000 },
  { id: 'V011', position: [12.5, 0, -3], isOpen: true, pipeSegmentId: 'P011', isSaved: true, lastModified: Date.now() - 86400000 },
  { id: 'V012', position: [-1.5, 0, 2.5], isOpen: true, pipeSegmentId: 'P012', isSaved: true, lastModified: Date.now() - 172800000 },
];

export const mockPumpStations: PumpStation[] = [
  { id: 'PS01', position: [0, 0, 0], supplyPressure: 0.50, status: 'running', name: '1号加压泵站' },
  { id: 'PS02', position: [0, 0, 5], supplyPressure: 0.48, status: 'running', name: '2号加压泵站' },
];

export const mockUserAreas: UserArea[] = [
  { id: 'UA01', name: '阳光花园小区', position: [15, 0, 2.5], minPressure: 0.14, maxPressure: 0.35, currentPressure: 0.32 },
  { id: 'UA02', name: '幸福里社区', position: [10, 0, -3], minPressure: 0.14, maxPressure: 0.35, currentPressure: 0.28 },
  { id: 'UA03', name: '翠湖天地', position: [0, 0, -3], minPressure: 0.14, maxPressure: 0.35, currentPressure: 0.30 },
  { id: 'UA04', name: '金色家园', position: [5, 0, 10], minPressure: 0.14, maxPressure: 0.35, currentPressure: 0.14 },
  { id: 'UA05', name: '碧水湾', position: [15, 0, -3], minPressure: 0.14, maxPressure: 0.35, currentPressure: 0.25 },
  { id: 'UA06', name: '悦府小区', position: [-3, 0, 2.5], minPressure: 0.14, maxPressure: 0.35, currentPressure: -0.05 },
];

export const mockDispatchRecords: DispatchRecord[] = [
  {
    id: 'DR001', timestamp: Date.now() - 86400000, valveId: 'V001', valveName: 'P001阀门',
    action: 'open', operator: '王调度', notes: '正常供水，阀门保持开启',
    beforePressure: 0.45, afterPressure: 0.45,
  },
  {
    id: 'DR002', timestamp: Date.now() - 43200000, valveId: 'V010', valveName: 'P010阀门',
    action: 'close', operator: '李调度', notes: '金色家园水压偏低，尝试关小阀门调蓄',
    beforePressure: 0.14, afterPressure: 0.14,
  },
  {
    id: 'DR003', timestamp: Date.now() - 3600000, valveId: 'V003', valveName: 'P003阀门',
    action: 'open', operator: '赵调度', notes: '巡检发现阀门微开，已全开操作，未保存到调度系统',
    beforePressure: 0.38, afterPressure: 0.38,
  },
];

export const mockCorrections: CorrectionRecord[] = [
  { id: 'C001', timestamp: Date.now() - 86400000, field: 'basePressure', oldValue: '0.40', newValue: '0.38', operator: '张工', reason: '修正传感器漂移误差' },
  { id: 'C002', timestamp: Date.now() - 43200000, field: 'basePressure', oldValue: '0.18', newValue: '0.14', operator: '李工', reason: '末端用户反馈水压不足，现场实测修正' },
  { id: 'C003', timestamp: Date.now() - 172800000, field: 'basePressure', oldValue: '0.22', newValue: '-0.05', operator: '系统自动', reason: '传感器异常读数，已标记为坏数据' },
];
