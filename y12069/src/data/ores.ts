import { OreType } from '@/utils/types';

export const ORE_TYPES: OreType[] = [
  {
    id: 'iron',
    name: '铁矿石',
    mass: 3.0,
    hardness: 30,
    scoreValue: 100,
    color: '#a19d94',
    energyThreshold: 40,
  },
  {
    id: 'copper',
    name: '铜矿石',
    mass: 2.5,
    hardness: 45,
    scoreValue: 150,
    color: '#b87333',
    energyThreshold: 55,
  },
  {
    id: 'gold',
    name: '金矿石',
    mass: 4.0,
    hardness: 60,
    scoreValue: 300,
    color: '#ffd700',
    energyThreshold: 75,
  },
  {
    id: 'crystal',
    name: '能量水晶',
    mass: 1.5,
    hardness: 80,
    scoreValue: 500,
    color: '#00ffff',
    energyThreshold: 95,
  },
  {
    id: 'uranium',
    name: '铀矿石',
    mass: 5.0,
    hardness: 100,
    scoreValue: 800,
    color: '#39ff14',
    energyThreshold: 120,
  },
];

export function generateOreBlocks(
  canvasWidth: number,
  canvasHeight: number
): { id: string; type: OreType; x: number; y: number; width: number; height: number; health: number; collected: boolean; vx: number; vy: number }[] {
  const blocks = [];
  const startX = canvasWidth * 0.35;
  const blockWidth = 50;
  const blockHeight = 50;
  const padding = 15;
  
  const layout = [
    { ore: ORE_TYPES[0], col: 0, row: 0 },
    { ore: ORE_TYPES[1], col: 1, row: 0 },
    { ore: ORE_TYPES[0], col: 2, row: 0 },
    { ore: ORE_TYPES[2], col: 0, row: 1 },
    { ore: ORE_TYPES[3], col: 1, row: 1 },
    { ore: ORE_TYPES[2], col: 2, row: 1 },
    { ore: ORE_TYPES[1], col: 0, row: 2 },
    { ore: ORE_TYPES[4], col: 1, row: 2 },
    { ore: ORE_TYPES[1], col: 2, row: 2 },
  ];

  for (let i = 0; i < layout.length; i++) {
    const { ore, col, row } = layout[i];
    blocks.push({
      id: `ore-${i}`,
      type: ore,
      x: startX + col * (blockWidth + padding),
      y: canvasHeight * 0.15 + row * (blockHeight + padding),
      width: blockWidth,
      height: blockHeight,
      health: ore.hardness,
      collected: false,
      vx: 0,
      vy: 0,
    });
  }

  return blocks;
}
