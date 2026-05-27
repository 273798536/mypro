import type { Slope } from '@/types';

function generateHeightMap(
  width: number,
  height: number,
  baseHeight: number,
  amplitude: number,
  seed: number
): number[][] {
  const map: number[][] = [];
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = 0; i < height; i++) {
    const row: number[] = [];
    for (let j = 0; j < width; j++) {
      const nx = j / width - 0.5;
      const ny = i / height - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const falloff = Math.max(0, 1 - dist * 2);
      const noise = (random() - 0.5) * amplitude;
      const h = baseHeight + noise * falloff;
      row.push(Math.max(0, h));
    }
    map.push(row);
  }
  return map;
}

export const slopes: Slope[] = [
  {
    id: 'slope-001',
    name: '初级道-雪松',
    difficulty: 'beginner',
    averageSlope: 8,
    heightMap: generateHeightMap(32, 32, 5, 3, 1001),
    bounds: [-50, 0, -10, 40],
    color: '#2EC4B6',
  },
  {
    id: 'slope-002',
    name: '初级道-梅花',
    difficulty: 'beginner',
    averageSlope: 10,
    heightMap: generateHeightMap(32, 32, 6, 4, 1002),
    bounds: [-10, 0, 30, 40],
    color: '#2EC4B6',
  },
  {
    id: 'slope-003',
    name: '中级道-飞狐',
    difficulty: 'intermediate',
    averageSlope: 18,
    heightMap: generateHeightMap(32, 32, 8, 6, 1003),
    bounds: [-50, -50, -10, 0],
    color: '#FFE66D',
  },
  {
    id: 'slope-004',
    name: '中级道-银蛇',
    difficulty: 'intermediate',
    averageSlope: 22,
    heightMap: generateHeightMap(32, 32, 10, 7, 1004),
    bounds: [-10, -50, 30, 0],
    color: '#FFE66D',
  },
  {
    id: 'slope-005',
    name: '高级道-黑鹰',
    difficulty: 'advanced',
    averageSlope: 30,
    heightMap: generateHeightMap(32, 32, 12, 8, 1005),
    bounds: [30, -50, 70, 0],
    color: '#FF9F1C',
  },
  {
    id: 'slope-006',
    name: '专家道-极限',
    difficulty: 'expert',
    averageSlope: 40,
    heightMap: generateHeightMap(32, 32, 15, 10, 1006),
    bounds: [30, 0, 70, 50],
    color: '#E71D36',
  },
];

export const getSlopeById = (id: string): Slope | undefined => {
  return slopes.find((s) => s.id === id);
};

export const getSlopeBounds = (): [number, number, number, number] => {
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  slopes.forEach((s) => {
    minX = Math.min(minX, s.bounds[0]);
    minZ = Math.min(minZ, s.bounds[1]);
    maxX = Math.max(maxX, s.bounds[2]);
    maxZ = Math.max(maxZ, s.bounds[3]);
  });
  return [minX, minZ, maxX, maxZ];
};
