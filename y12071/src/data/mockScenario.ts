import { Scenario, Point3D } from '../types';

const createTunnelSegments = (): Scenario['tunnelSegments'] => {
  return [
    {
      id: 'tunnel-1',
      startPoint: [0, 0, 0],
      endPoint: [20, 0, 0],
      radius: 2.5,
      expectedPosition: [10, 0, 0],
    },
    {
      id: 'tunnel-2',
      startPoint: [20, 0, 0],
      endPoint: [40, 0.3, 0],
      radius: 2.5,
      expectedPosition: [30, 0, 0],
    },
    {
      id: 'tunnel-3',
      startPoint: [40, 0.3, 0],
      endPoint: [40, 0.3, 15],
      radius: 2.2,
      expectedPosition: [40, 0, 7.5],
    },
    {
      id: 'tunnel-4',
      startPoint: [40, 0.3, 15],
      endPoint: [60, 0.5, 15],
      radius: 2.5,
      expectedPosition: [50, 0, 15],
    },
  ];
};

const createSupportPoints = (): Scenario['supportPoints'] => {
  return [
    { id: 'sp-1', position: [5, 2, 0], expectedPosition: [5, 2, 0], type: 'bolt', status: 'normal' },
    { id: 'sp-2', position: [10, 2, 0], expectedPosition: [10, 2, 0], type: 'bolt', status: 'normal' },
    { id: 'sp-3', position: [15.4, 2.2, 0], expectedPosition: [15, 2, 0], type: 'bolt', status: 'offset', offsetDistance: 0.45 },
    { id: 'sp-4', position: [25, 2, 0], expectedPosition: [25, 2, 0], type: 'anchor', status: 'normal' },
    { id: 'sp-5', position: [30, 2, 0], expectedPosition: [30, 2, 0], type: 'anchor', status: 'normal' },
    { id: 'sp-6', position: [35, 2, 0], expectedPosition: [35, 2, 0], type: 'bolt', status: 'missing' },
    { id: 'sp-7', position: [40, 2, 5], expectedPosition: [40, 2, 5], type: 'mesh', status: 'normal' },
    { id: 'sp-8', position: [40, 2, 10], expectedPosition: [40, 2, 10], type: 'mesh', status: 'normal' },
    { id: 'sp-9', position: [45, 2, 15], expectedPosition: [45, 2, 15], type: 'bolt', status: 'normal' },
    { id: 'sp-10', position: [50.6, 1.8, 15], expectedPosition: [50, 2, 15], type: 'anchor', status: 'offset', offsetDistance: 0.63 },
    { id: 'sp-11', position: [55, 2, 15], expectedPosition: [55, 2, 15], type: 'bolt', status: 'normal' },
  ];
};

const createSensors = (): Scenario['sensors'] => {
  return [
    { id: 'sensor-1', position: [10, 1.5, 1.5], type: 'stress', status: 'online', value: 45.2, name: '应力传感器-A1' },
    { id: 'sensor-2', position: [20, 1.5, 0], type: 'displacement', status: 'online', value: 2.1, name: '位移传感器-B1' },
    { id: 'sensor-3', position: [30, 1.5, 0], type: 'stress', status: 'offline', value: 0, name: '应力传感器-A2' },
    { id: 'sensor-4', position: [40, 1.5, 7.5], type: 'gas', status: 'online', value: 0.02, name: '瓦斯传感器-C1' },
    { id: 'sensor-5', position: [50, 1.5, 15], type: 'stress', status: 'warning', value: 78.5, name: '应力传感器-A3' },
  ];
};

const createPersonnelRoute = (): Point3D[] => {
  return [
    [0, 0, 0],
    [5, 0, 0],
    [10, 0, 0],
    [15, 0, 0],
    [20, 0, 0],
    [25, 0, 0],
    [30, 0, 0],
    [35, 0, 0],
    [40, 0, 0],
    [40, 0, 5],
    [40, 0, 10],
    [40, 0, 15],
    [45, 0, 15],
    [50, 0, 15],
  ];
};

export const mockScenario: Scenario = {
  id: 'scenario-demo-001',
  name: '东翼运输大巷',
  description: '包含坐标偏移、支护缺失、传感器离线的演示场景',
  tunnelSegments: createTunnelSegments(),
  supportPoints: createSupportPoints(),
  sensors: createSensors(),
  personnelRoute: undefined,
};

export const mockScenarioWithRoute: Scenario = {
  ...mockScenario,
  personnelRoute: {
    id: 'route-001',
    points: createPersonnelRoute(),
    timestamp: '2024-05-30 14:30:00',
    name: '张三巡检路线',
  },
};

export const OFFSET_THRESHOLD = 0.3;
export const ROUTE_IMPACT_THRESHOLD = 3.0;
