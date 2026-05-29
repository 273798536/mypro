import { ResidentPoint, FacilityCandidate, RoadNetwork } from '../src';

export const sampleResidents: ResidentPoint[] = [
  { id: 'R001', name: '阳光小区', coordinate: { x: 100, y: 100 }, population: 1200 },
  { id: 'R002', name: '幸福家园', coordinate: { x: 300, y: 150 }, population: 800 },
  { id: 'R003', name: '和平里社区', coordinate: { x: 500, y: 200 }, population: 1500 },
  { id: 'R004', name: '东方花园', coordinate: { x: 200, y: 400 }, population: 900 },
  { id: 'R005', name: '西湖苑', coordinate: { x: 600, y: 500 }, population: 1100 },
  { id: 'R006', name: '北城新区', coordinate: { x: 800, y: 300 }, population: 2000 },
  { id: 'R007', name: '南苑小区', coordinate: { x: 150, y: 600 }, population: 700 },
  { id: 'R008', name: '中心广场', coordinate: { x: 400, y: 350 }, population: 500 },
  { id: 'R009', name: '科技园公寓', coordinate: { x: 700, y: 700 }, population: 600 },
  { id: 'R010', name: '老城区', coordinate: { x: 50, y: 50 }, population: 1800 }
];

export const sampleFacilities: FacilityCandidate[] = [
  { id: 'F001', name: '第一社区医院', coordinate: { x: 200, y: 200 }, type: 'hospital', existing: true },
  { id: 'F002', name: '第二社区医院(候选)', coordinate: { x: 550, y: 400 }, type: 'hospital', existing: false },
  { id: 'F003', name: '第三社区医院(候选)', coordinate: { x: 750, y: 200 }, type: 'hospital', existing: false }
];

export const sampleNetwork: RoadNetwork = {
  nodes: [
    { id: 'N001', coordinate: { x: 100, y: 100 }, type: 'intersection' },
    { id: 'N002', coordinate: { x: 300, y: 100 }, type: 'intersection' },
    { id: 'N003', coordinate: { x: 500, y: 100 }, type: 'intersection' },
    { id: 'N004', coordinate: { x: 700, y: 100 }, type: 'intersection' },
    { id: 'N005', coordinate: { x: 100, y: 300 }, type: 'intersection' },
    { id: 'N006', coordinate: { x: 300, y: 300 }, type: 'intersection' },
    { id: 'N007', coordinate: { x: 500, y: 300 }, type: 'intersection' },
    { id: 'N008', coordinate: { x: 700, y: 300 }, type: 'intersection' },
    { id: 'N009', coordinate: { x: 100, y: 500 }, type: 'intersection' },
    { id: 'N010', coordinate: { x: 300, y: 500 }, type: 'intersection' },
    { id: 'N011', coordinate: { x: 500, y: 500 }, type: 'intersection' },
    { id: 'N012', coordinate: { x: 700, y: 500 }, type: 'intersection' }
  ],
  edges: [
    { id: 'E001', from: 'N001', to: 'N002', length: 200, type: 'main', walkable: true },
    { id: 'E002', from: 'N002', to: 'N003', length: 200, type: 'main', walkable: true },
    { id: 'E003', from: 'N003', to: 'N004', length: 200, type: 'main', walkable: true },
    { id: 'E004', from: 'N005', to: 'N006', length: 200, type: 'main', walkable: true },
    { id: 'E005', from: 'N006', to: 'N007', length: 200, type: 'main', walkable: true },
    { id: 'E006', from: 'N007', to: 'N008', length: 200, type: 'main', walkable: true },
    { id: 'E007', from: 'N009', to: 'N010', length: 200, type: 'main', walkable: true },
    { id: 'E008', from: 'N010', to: 'N011', length: 200, type: 'main', walkable: true },
    { id: 'E009', from: 'N011', to: 'N012', length: 200, type: 'main', walkable: true },
    { id: 'E010', from: 'N001', to: 'N005', length: 200, type: 'main', walkable: true },
    { id: 'E011', from: 'N005', to: 'N009', length: 200, type: 'main', walkable: true },
    { id: 'E012', from: 'N002', to: 'N006', length: 200, type: 'main', walkable: true },
    { id: 'E013', from: 'N006', to: 'N010', length: 200, type: 'main', walkable: true },
    { id: 'E014', from: 'N003', to: 'N007', length: 200, type: 'main', walkable: true },
    { id: 'E015', from: 'N007', to: 'N011', length: 200, type: 'main', walkable: true },
    { id: 'E016', from: 'N004', to: 'N008', length: 200, type: 'main', walkable: true },
    { id: 'E017', from: 'N008', to: 'N012', length: 200, type: 'main', walkable: true }
  ]
};
