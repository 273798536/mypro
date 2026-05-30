import { RiverSection, FlowData, SedimentData, CalculationParams, DEFAULT_PARAMS } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const baseTime = new Date('2025-01-01T00:00:00').getTime();
const hourMs = 3600 * 1000;

export const MOCK_SECTIONS: RiverSection[] = [
  {
    id: 'sec-001',
    name: '断面A',
    chainage: 0,
    elevation: 15.2,
    notes: '河道起点，左岸有护岸工程',
    coordinates: [
      [-50, 0, 18.0],
      [-30, 0, 16.5],
      [-15, 0, 15.2],
      [0, 0, 14.8],
      [15, 0, 15.0],
      [30, 0, 16.8],
      [50, 0, 18.5],
    ],
  },
  {
    id: 'sec-002',
    name: '断面B',
    chainage: 500,
    elevation: 14.8,
    coordinates: [
      [-50, 0, 17.5],
      [-30, 0, 16.0],
      [-15, 0, 14.8],
      [0, 0, 14.2],
      [15, 0, 14.5],
      [30, 0, 16.2],
      [50, 0, 18.0],
    ],
  },
  {
    id: 'sec-003',
    name: '断面C',
    chainage: 1000,
    elevation: 14.5,
    notes: '2024年疏浚过，数据可能偏低',
    coordinates: [
      [-50, 0, 17.0],
      [-30, 0, 15.8],
      [-15, 0, 14.5],
      [0, 0, 13.8],
      [15, 0, 14.0],
      [30, 0, 15.5],
      [50, 0, 17.5],
    ],
  },
  {
    id: 'sec-004',
    name: '断面D',
    chainage: 2000,
    elevation: 13.8,
    notes: '坐标数据需要核实',
    coordinates: [
      [-50, 0, 16.8],
      [-30, 0, 15.2],
      [-15, 0, 13.8],
      [0, 0, 12.5],
      [15, 0, 13.2],
      [30, 0, 14.8],
      [50, 0, 17.0],
    ],
  },
  {
    id: 'sec-005',
    name: '断面E',
    chainage: 2500,
    elevation: 13.5,
    coordinates: [
      [-50, 0, 16.5],
      [-30, 0, 14.8],
      [-15, 0, 13.5],
      [0, 0, 12.8],
      [15, 0, 13.0],
      [30, 0, 14.5],
      [50, 0, 16.8],
    ],
  },
  {
    id: 'sec-006',
    name: '断面F',
    chainage: 3500,
    elevation: 13.0,
    coordinates: [
      [-50, 0, 16.0],
      [-30, 0, 14.5],
      [-15, 0, 13.0],
      [0, 0, 12.2],
      [15, 0, 12.5],
      [30, 0, 14.0],
      [50, 0, 16.2],
    ],
  },
];

function generateFlowData(): FlowData[] {
  const data: FlowData[] = [];
  const sections = MOCK_SECTIONS.map(s => s.id);
  const hours = 24 * 7;

  for (let i = 0; i < hours; i++) {
    const timestamp = baseTime + i * hourMs;
    const baseFlow = 800 + Math.sin(i / 24) * 300 + Math.random() * 100;

    sections.forEach((sectionId, idx) => {
      if (sectionId === 'sec-004' && i >= 48 && i < 72) {
        return;
      }

      let flow = baseFlow * (0.9 + idx * 0.02);

      if (sectionId === 'sec-002' && i === 36) {
        flow = 2500;
      }

      if (sectionId === 'sec-003' && i === 60) {
        return;
      }

      data.push({
        id: `flow-${generateId()}`,
        sectionId,
        timestamp,
        flow: Math.round(flow * 10) / 10,
        waterLevel: 14 + Math.sin(i / 24) * 1.5 + Math.random() * 0.3,
        source: i % 5 === 0 ? '遥测' : '人工观测',
      });
    });
  }

  return data;
}

function generateSedimentData(): SedimentData[] {
  const data: SedimentData[] = [];
  const sections = MOCK_SECTIONS.map(s => s.id);
  const hours = 24 * 7;

  for (let i = 0; i < hours; i++) {
    const timestamp = baseTime + i * hourMs;
    const baseConc = 0.3 + Math.sin(i / 12) * 0.15 + Math.random() * 0.1;

    sections.forEach((sectionId, idx) => {
      let delayHours = 0;
      if (i >= 100 && i < 120) {
        delayHours = 6;
      }

      data.push({
        id: `sed-${generateId()}`,
        sectionId,
        timestamp,
        concentration: Math.round(baseConc * (0.95 + idx * 0.03) * 1000) / 1000,
        particleSize: 0.05 + Math.random() * 0.1,
        delayHours,
      });
    });
  }

  return data;
}

export const MOCK_FLOW_DATA: FlowData[] = generateFlowData();
export const MOCK_SEDIMENT_DATA: SedimentData[] = generateSedimentData();

export const MOCK_PARAMS: CalculationParams = { ...DEFAULT_PARAMS };

export const TIME_RANGE = {
  start: baseTime,
  end: baseTime + 24 * 7 * hourMs,
};

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatTimeShort(ts: number): string {
  const date = new Date(ts);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
}

export function formatFlow(flow: number): string {
  return `${flow.toFixed(1)} m³/s`;
}

export function formatElevation(elev: number): string {
  return `${elev.toFixed(2)} m`;
}

export function formatVolume(vol: number): string {
  if (Math.abs(vol) >= 10000) {
    return `${(vol / 10000).toFixed(2)} 万m³`;
  }
  return `${vol.toFixed(1)} m³`;
}
