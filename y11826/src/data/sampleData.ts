import { Station, BusLine, Bus } from '../types';

export const sampleStations: Station[] = [
  { id: 's1', name: '火车站', x: 100, y: 200, passengerFlow: 45, maxCapacity: 100, isTransfer: true, connectedLines: ['l1', 'l2'], consecutiveOverload: 0 },
  { id: 's2', name: '市政府', x: 200, y: 200, passengerFlow: 30, maxCapacity: 80, isTransfer: false, connectedLines: ['l1'], consecutiveOverload: 0 },
  { id: 's3', name: '中心广场', x: 300, y: 200, passengerFlow: 50, maxCapacity: 120, isTransfer: true, connectedLines: ['l1', 'l3'], consecutiveOverload: 0 },
  { id: 's4', name: '科技园', x: 400, y: 200, passengerFlow: 35, maxCapacity: 90, isTransfer: false, connectedLines: ['l1'], consecutiveOverload: 0 },
  { id: 's5', name: '大学城', x: 500, y: 200, passengerFlow: 55, maxCapacity: 100, isTransfer: false, connectedLines: ['l1'], consecutiveOverload: 0 },
  { id: 's6', name: '汽车站', x: 150, y: 300, passengerFlow: 40, maxCapacity: 90, isTransfer: false, connectedLines: ['l2'], consecutiveOverload: 0 },
  { id: 's7', name: '商业街', x: 250, y: 300, passengerFlow: 60, maxCapacity: 110, isTransfer: true, connectedLines: ['l2', 'l3'], consecutiveOverload: 0 },
  { id: 's8', name: '医院', x: 350, y: 300, passengerFlow: 25, maxCapacity: 70, isTransfer: false, connectedLines: ['l2'], consecutiveOverload: 0 },
  { id: 's9', name: '公园', x: 200, y: 400, passengerFlow: 20, maxCapacity: 60, isTransfer: false, connectedLines: ['l3'], consecutiveOverload: 0 },
  { id: 's10', name: '体育馆', x: 400, y: 400, passengerFlow: 30, maxCapacity: 80, isTransfer: false, connectedLines: ['l3'], consecutiveOverload: 0 },
];

export const sampleLines: BusLine[] = [
  { id: 'l1', name: '1路', color: '#165DFF', stations: ['s1', 's2', 's3', 's4', 's5'], interval: 8, firstBus: '06:00', lastBus: '22:00' },
  { id: 'l2', name: '2路', color: '#00B42A', stations: ['s1', 's6', 's7', 's8'], interval: 10, firstBus: '06:00', lastBus: '21:30' },
  { id: 'l3', name: '3路', color: '#FF7D00', stations: ['s3', 's7', 's9', 's10'], interval: 12, firstBus: '06:30', lastBus: '21:00' },
];

export const sampleBuses: Bus[] = [
  { id: 'b1', lineId: 'l1', plateNumber: 'A-001', driverName: '张师傅', currentStationIndex: 0, direction: 'forward', status: 'running', passengerCount: 30, maxPassengers: 60, continuousDriving: 2.5, lastDepartureTime: 0, isOnTime: true },
  { id: 'b2', lineId: 'l1', plateNumber: 'A-002', driverName: '李师傅', currentStationIndex: 2, direction: 'forward', status: 'running', passengerCount: 45, maxPassengers: 60, continuousDriving: 1.5, lastDepartureTime: 0, isOnTime: true },
  { id: 'b3', lineId: 'l1', plateNumber: 'A-003', driverName: '王师傅', currentStationIndex: 4, direction: 'backward', status: 'running', passengerCount: 25, maxPassengers: 60, continuousDriving: 3.0, lastDepartureTime: 0, isOnTime: true },
  { id: 'b4', lineId: 'l2', plateNumber: 'B-001', driverName: '赵师傅', currentStationIndex: 1, direction: 'forward', status: 'running', passengerCount: 35, maxPassengers: 50, continuousDriving: 2.0, lastDepartureTime: 0, isOnTime: true },
  { id: 'b5', lineId: 'l2', plateNumber: 'B-002', driverName: '刘师傅', currentStationIndex: 3, direction: 'backward', status: 'running', passengerCount: 20, maxPassengers: 50, continuousDriving: 1.0, lastDepartureTime: 0, isOnTime: true },
  { id: 'b6', lineId: 'l3', plateNumber: 'C-001', driverName: '陈师傅', currentStationIndex: 0, direction: 'forward', status: 'running', passengerCount: 28, maxPassengers: 45, continuousDriving: 3.5, lastDepartureTime: 0, isOnTime: true },
  { id: 'b7', lineId: 'l3', plateNumber: 'C-002', driverName: '周师傅', currentStationIndex: 2, direction: 'forward', status: 'running', passengerCount: 22, maxPassengers: 45, continuousDriving: 0.5, lastDepartureTime: 0, isOnTime: true },
];

export const brokenScenarioBuses: Bus[] = [
  { id: 'bb1', lineId: 'l1', plateNumber: '坏掉-001', driverName: '测试司机A', currentStationIndex: 2, direction: 'forward', status: 'broken', passengerCount: 40, maxPassengers: 60, continuousDriving: 5.5, lastDepartureTime: 0, isOnTime: false },
  { id: 'bb2', lineId: 'l1', plateNumber: '扎堆-001', driverName: '测试司机B', currentStationIndex: 2, direction: 'forward', status: 'running', passengerCount: 35, maxPassengers: 60, continuousDriving: 2.0, lastDepartureTime: 0, isOnTime: true },
  { id: 'bb3', lineId: 'l1', plateNumber: '扎堆-002', driverName: '测试司机C', currentStationIndex: 2, direction: 'backward', status: 'running', passengerCount: 30, maxPassengers: 60, continuousDriving: 1.5, lastDepartureTime: 0, isOnTime: true },
  { id: 'bb4', lineId: 'l1', plateNumber: '扎堆-003', driverName: '测试司机D', currentStationIndex: 2, direction: 'forward', status: 'stopped', passengerCount: 25, maxPassengers: 60, continuousDriving: 3.0, lastDepartureTime: 0, isOnTime: false },
  { id: 'bb5', lineId: 'l2', plateNumber: '超时-001', driverName: '测试司机E', currentStationIndex: 1, direction: 'forward', status: 'running', passengerCount: 20, maxPassengers: 50, continuousDriving: 6.5, lastDepartureTime: 0, isOnTime: true },
  ...sampleBuses.slice(4),
];
