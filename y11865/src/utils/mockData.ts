import type {
  FireStation,
  Building,
  RoadNode,
  RoadEdge,
  Simulation,
} from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const buildingTypes: ('residential' | 'commercial' | 'industrial')[] = [
  'residential',
  'commercial',
  'industrial',
];

export function generateMockCityData(): {
  fireStations: FireStation[];
  buildings: Building[];
  roadNodes: RoadNode[];
  roadEdges: RoadEdge[];
} {
  const gridSize = 8;
  const cellSize = 15;
  const roadNodes: RoadNode[] = [];
  const roadEdges: RoadEdge[] = [];

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      roadNodes.push({
        id: `node-${i}-${j}`,
        position: [i * cellSize - (gridSize * cellSize) / 2, j * cellSize - (gridSize * cellSize) / 2],
      });
    }
  }

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const isBlocked = Math.random() < 0.05;
      roadEdges.push({
        id: `edge-h-${i}-${j}`,
        from: `node-${i}-${j}`,
        to: `node-${i}-${j + 1}`,
        distance: cellSize,
        speedLimit: 40 + Math.random() * 20,
        isBlocked,
      });
    }
  }

  for (let j = 0; j <= gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const isBlocked = Math.random() < 0.05;
      roadEdges.push({
        id: `edge-v-${i}-${j}`,
        from: `node-${i}-${j}`,
        to: `node-${i + 1}-${j}`,
        distance: cellSize,
        speedLimit: 50 + Math.random() * 20,
        isBlocked,
      });
    }
  }

  const buildings: Building[] = [];
  const buildingNames = ['住宅楼', '写字楼', '商场', '工厂', '学校', '医院'];

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const numBuildings = Math.floor(Math.random() * 2) + 1;
      for (let k = 0; k < numBuildings; k++) {
        const offsetX = (Math.random() - 0.5) * cellSize * 0.6;
        const offsetZ = (Math.random() - 0.5) * cellSize * 0.6;
        const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
        buildings.push({
          id: `building-${i}-${j}-${k}`,
          name: `${buildingNames[Math.floor(Math.random() * buildingNames.length)]} ${i * gridSize + j + k}`,
          position: [
            i * cellSize - (gridSize * cellSize) / 2 + cellSize / 2 + offsetX,
            0,
            j * cellSize - (gridSize * cellSize) / 2 + cellSize / 2 + offsetZ,
          ],
          height: 5 + Math.random() * 25,
          population: type === 'residential' ? Math.floor(Math.random() * 200) + 50 : Math.floor(Math.random() * 500) + 100,
          type,
        });
      }
    }
  }

  const fireStations: FireStation[] = [
    {
      id: 'station-1',
      name: '中心消防站',
      position: [0, 0, 0],
      responseTime: 5,
      vehicles: 8,
    },
    {
      id: 'station-2',
      name: '东区消防站',
      position: [cellSize * 3, 0, -cellSize * 2],
      responseTime: 4,
      vehicles: 5,
    },
  ];

  return { fireStations, buildings, roadNodes, roadEdges };
}

export function createInitialSimulation(): Simulation {
  const { fireStations, buildings, roadNodes, roadEdges } = generateMockCityData();

  return {
    id: generateId(),
    name: '初始模拟 - ' + new Date().toLocaleString('zh-CN'),
    createdAt: Date.now(),
    parameters: {
      responseThreshold: 5,
      speedCoefficient: 1.0,
    },
    fireStations,
    buildings,
    roadNodes,
    roadEdges,
    results: [],
    alerts: [],
  };
}
