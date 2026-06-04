import { Boundary } from '../../types';

const centerLng = 116.397;
const centerLat = 39.908;

function generateCircle(centerLng: number, centerLat: number, radiusDeg: number, segments: number = 64): [number, number][] {
  const coordinates: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const lng = centerLng + Math.cos(angle) * radiusDeg;
    const lat = centerLat + Math.sin(angle) * radiusDeg * 1.3;
    coordinates.push([lng, lat]);
  }
  return coordinates;
}

function generateIrregularPolygon(centerLng: number, centerLat: number, baseRadius: number, irregularity: number, segments: number = 32): [number, number][] {
  const coordinates: [number, number][] = [];
  const seed = 12345;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const noise = Math.sin(i * 0.7 + seed) * 0.3 + Math.cos(i * 1.1 + seed * 0.5) * 0.2;
    const radius = baseRadius * (1 + noise * irregularity);
    const lng = centerLng + Math.cos(angle) * radius;
    const lat = centerLat + Math.sin(angle) * radius * 1.3;
    coordinates.push([lng, lat]);
  }
  return coordinates;
}

export const boundaries: Boundary[] = [
  {
    id: 'boundary-core-001',
    name: '核心保护区 - 故宫红墙内',
    type: 'core',
    description: '严格禁止进入的核心保护区域',
    coordinates: generateIrregularPolygon(centerLng, centerLat, 0.008, 0.15, 24)
  },
  {
    id: 'boundary-buffer-001',
    name: '缓冲区 - 皇城根遗址公园',
    type: 'buffer',
    description: '限制活动的缓冲区域',
    coordinates: generateIrregularPolygon(centerLng, centerLat, 0.018, 0.2, 32)
  },
  {
    id: 'boundary-experimental-001',
    name: '实验区 - 景山公园周边',
    type: 'experimental',
    description: '可进行有限活动的实验区域',
    coordinates: generateIrregularPolygon(centerLng, centerLat, 0.03, 0.25, 40)
  },
  {
    id: 'boundary-core-002',
    name: '核心保护区 - 中南海',
    type: 'core',
    description: '另一处核心保护区域',
    coordinates: generateIrregularPolygon(centerLng + 0.035, centerLat - 0.015, 0.006, 0.12, 20)
  },
  {
    id: 'boundary-buffer-002',
    name: '缓冲区 - 北海公园',
    type: 'buffer',
    description: '北海周边缓冲区域',
    coordinates: generateIrregularPolygon(centerLng - 0.025, centerLat + 0.02, 0.012, 0.18, 28)
  }
];

export const getBoundaryById = (id: string): Boundary | undefined => {
  return boundaries.find(b => b.id === id);
};

export const getBoundaryColor = (type: string): string => {
  switch (type) {
    case 'core': return '#C41E3A';
    case 'buffer': return '#E6A817';
    case 'experimental': return '#2E5EAA';
    default: return '#1A1A1A';
  }
};

export const getBoundaryTypeLabel = (type: string): string => {
  switch (type) {
    case 'core': return '核心区';
    case 'buffer': return '缓冲区';
    case 'experimental': return '实验区';
    default: return type;
  }
};
