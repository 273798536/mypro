import type { Node, Route } from '@/types';

export const sampleNodes: Node[] = [
  { id: 'W1', name: '华东总仓', type: 'warehouse', x: 100, y: 300, capacity: 500, isSource: true, isIsolated: false },
  { id: 'W2', name: '华南分仓', type: 'warehouse', x: 100, y: 500, capacity: 300, isIsolated: false },
  { id: 'W3', name: '备用仓', type: 'warehouse', x: 100, y: 700, capacity: 200, isIsolated: true },
  { id: 'D1', name: '上海分拣中心', type: 'distribution', x: 400, y: 200, capacity: 400, isIsolated: false },
  { id: 'D2', name: '广州分拣中心', type: 'distribution', x: 400, y: 400, capacity: 350, isIsolated: false },
  { id: 'D3', name: '武汉分拣中心', type: 'distribution', x: 400, y: 600, capacity: 250, isIsolated: false },
  { id: 'D4', name: '成都分拣中心', type: 'distribution', x: 400, y: 800, capacity: 200, isIsolated: false },
  { id: 'C1', name: '北京需求点', type: 'demand', x: 750, y: 150, capacity: 0, demand: 200, isSink: true, isIsolated: false },
  { id: 'C2', name: '杭州需求点', type: 'demand', x: 750, y: 350, capacity: 0, demand: 250, isSink: true, isIsolated: false },
  { id: 'C3', name: '深圳需求点', type: 'demand', x: 750, y: 550, capacity: 0, demand: 180, isSink: true, isIsolated: false },
  { id: 'C4', name: '重庆需求点', type: 'demand', x: 750, y: 750, capacity: 0, demand: 150, isSink: true, isIsolated: false },
  { id: 'ISO1', name: '遗漏仓库', type: 'warehouse', x: 800, y: 900, capacity: 100, isIsolated: true },
];

export const sampleRoutes: Route[] = [
  { id: 'R1', from: 'W1', to: 'D1', capacity: 300, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R2', from: 'W1', to: 'D2', capacity: 200, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R3', from: 'W2', to: 'D2', capacity: 150, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R4', from: 'W2', to: 'D3', capacity: 100, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R5', from: 'W2', to: 'D4', capacity: 0, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R6', from: 'D1', to: 'C1', capacity: 120, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R7', from: 'D1', to: 'C2', capacity: 180, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R8', from: 'D2', to: 'C2', capacity: 90, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R9', from: 'D2', to: 'C3', capacity: 200, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R10', from: 'D3', to: 'C3', capacity: 80, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R11', from: 'D3', to: 'C4', capacity: 150, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R12', from: 'D4', to: 'C4', capacity: 100, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
  { id: 'R13', from: 'W1', to: 'D3', capacity: 180, flow: 0, isDisabled: true, disableNotEffective: true, utilization: 0, isBottleneck: false },
  { id: 'R14', from: 'W3', to: 'D1', capacity: 0, flow: 0, isDisabled: false, disableNotEffective: false, utilization: 0, isBottleneck: false },
];
