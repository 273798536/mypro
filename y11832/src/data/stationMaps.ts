import { StationMap } from '../types';

export const stationMaps: StationMap[] = [
  {
    id: 'map-001',
    name: '市中心站',
    width: 800,
    height: 500,
    gates: [
      {
        id: 'gate-01',
        name: '1号闸机',
        position: { x: 250, y: 200 },
        width: 40,
        height: 80,
        capacity: 30,
        status: 'normal',
        isFaulty: false,
      },
      {
        id: 'gate-02',
        name: '2号闸机',
        position: { x: 310, y: 200 },
        width: 40,
        height: 80,
        capacity: 30,
        status: 'normal',
        isFaulty: false,
      },
      {
        id: 'gate-03',
        name: '3号闸机',
        position: { x: 370, y: 200 },
        width: 40,
        height: 80,
        capacity: 30,
        status: 'normal',
        isFaulty: false,
      },
      {
        id: 'gate-04',
        name: '4号闸机',
        position: { x: 430, y: 200 },
        width: 40,
        height: 80,
        capacity: 30,
        status: 'normal',
        isFaulty: false,
      },
      {
        id: 'gate-05',
        name: '5号闸机',
        position: { x: 490, y: 200 },
        width: 40,
        height: 80,
        capacity: 30,
        status: 'normal',
        isFaulty: false,
      },
    ],
    exits: [
      {
        id: 'exit-a',
        name: 'A出口',
        position: { x: 100, y: 380 },
        width: 80,
        height: 60,
        capacity: 40,
        congestionLevel: 0,
      },
      {
        id: 'exit-b',
        name: 'B出口',
        position: { x: 350, y: 420 },
        width: 80,
        height: 60,
        capacity: 40,
        congestionLevel: 0,
      },
      {
        id: 'exit-c',
        name: 'C出口',
        position: { x: 600, y: 380 },
        width: 80,
        height: 60,
        capacity: 40,
        congestionLevel: 0,
      },
    ],
    walls: [
      { x: 50, y: 50, width: 700, height: 10 },
      { x: 50, y: 50, width: 10, height: 400 },
      { x: 740, y: 50, width: 10, height: 400 },
      { x: 50, y: 440, width: 700, height: 10 },
      { x: 200, y: 300, width: 150, height: 10 },
      { x: 450, y: 300, width: 150, height: 10 },
    ],
    entrances: [
      { id: 'entrance-1', x: 300, y: 80, name: '站台入口' },
      { id: 'entrance-2', x: 480, y: 80, name: '换乘入口' },
    ],
  },
];

export const getStationMap = (id: string): StationMap | undefined => {
  return stationMaps.find((map) => map.id === id);
};
