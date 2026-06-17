import type { CityBlock } from '@/shared/types';

const GRAY_PALETTE = [
  '#e5e7eb',
  '#d1d5db',
  '#9ca3af',
  '#6b7280',
  '#4b5563'
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(20260617);

const GRID_COLS = 10;
const GRID_ROWS = 8;
const SPACING = 30;
const BASE_WIDTH = 20;
const BASE_DEPTH = 20;
const MIN_HEIGHT = 10;
const MAX_HEIGHT = 60;

const offsetX = -((GRID_COLS - 1) * SPACING) / 2;
const offsetZ = -((GRID_ROWS - 1) * SPACING) / 2;

export const cityBlocks: CityBlock[] = [];

for (let row = 0; row < GRID_ROWS; row++) {
  for (let col = 0; col < GRID_COLS; col++) {
    const height = Math.floor(MIN_HEIGHT + rand() * (MAX_HEIGHT - MIN_HEIGHT + 1));
    const color = GRAY_PALETTE[Math.floor(rand() * GRAY_PALETTE.length)];

    const x = col * SPACING + offsetX;
    const y = height / 2;
    const z = row * SPACING + offsetZ;

    const blockId = `block-${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}`;

    cityBlocks.push({
      id: blockId,
      position: [x, y, z],
      size: [BASE_WIDTH, height, BASE_DEPTH],
      color
    });
  }
}

export default cityBlocks;
