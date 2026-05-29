import { Seat, Obstacle } from '@/types';
import { generateId } from '@/utils/hash';

const ROWS_ORCHESTRA = 10;
const SEATS_PER_ROW_ORCHESTRA = 16;
const ROWS_MEZZANINE = 6;
const SEATS_PER_ROW_MEZZANINE = 14;
const ROWS_BALCONY = 5;
const SEATS_PER_ROW_BALCONY = 12;

export function generateMockSeats(): Seat[] {
  const seats: Seat[] = [];
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  for (let r = 0; r < ROWS_ORCHESTRA; r++) {
    for (let s = 0; s < SEATS_PER_ROW_ORCHESTRA; s++) {
      const seatNumber = s + 1;
      const xOffset = (s - SEATS_PER_ROW_ORCHESTRA / 2 + 0.5) * 0.8;
      seats.push({
        id: generateId(),
        row: rowLabels[r],
        number: seatNumber,
        section: 'orchestra',
        position: {
          x: xOffset,
          y: 0,
          z: r * 1.2 + 2,
        },
        status: 'available',
        price: r < 3 ? 280 : r < 6 ? 220 : 180,
      });
    }
  }
  
  for (let r = 0; r < ROWS_MEZZANINE; r++) {
    for (let s = 0; s < SEATS_PER_ROW_MEZZANINE; s++) {
      const seatNumber = s + 1;
      const xOffset = (s - SEATS_PER_ROW_MEZZANINE / 2 + 0.5) * 0.8;
      seats.push({
        id: generateId(),
        row: `M${rowLabels[r]}`,
        number: seatNumber,
        section: 'mezzanine',
        position: {
          x: xOffset,
          y: 2.5,
          z: r * 1.2 + 15,
        },
        status: 'available',
        price: r < 2 ? 250 : 200,
      });
    }
  }
  
  for (let r = 0; r < ROWS_BALCONY; r++) {
    for (let s = 0; s < SEATS_PER_ROW_BALCONY; s++) {
      const seatNumber = s + 1;
      const xOffset = (s - SEATS_PER_ROW_BALCONY / 2 + 0.5) * 0.8;
      seats.push({
        id: generateId(),
        row: `B${rowLabels[r]}`,
        number: seatNumber,
        section: 'balcony',
        position: {
          x: xOffset,
          y: 4.5,
          z: r * 1.2 + 22,
        },
        status: 'available',
        price: r < 2 ? 180 : 150,
      });
    }
  }
  
  return seats;
}

export function getInitialObstacles(): Obstacle[] {
  return [
    {
      id: generateId(),
      type: 'railing',
      name: '一层前排栏杆',
      position: { x: 0, y: 0.8, z: 1 },
      dimensions: { width: 14, height: 1.2, depth: 0.1 },
      visible: true,
    },
    {
      id: generateId(),
      type: 'railing',
      name: '二层前排栏杆',
      position: { x: 0, y: 3.5, z: 14 },
      dimensions: { width: 12, height: 1.2, depth: 0.1 },
      visible: true,
    },
    {
      id: generateId(),
      type: 'pillar',
      name: '左侧柱子',
      position: { x: -6.5, y: 2, z: 5 },
      dimensions: { width: 0.5, height: 4, depth: 0.5 },
      visible: true,
    },
    {
      id: generateId(),
      type: 'pillar',
      name: '右侧柱子',
      position: { x: 6.5, y: 2, z: 5 },
      dimensions: { width: 0.5, height: 4, depth: 0.5 },
      visible: true,
    },
  ];
}

export function getScreenObstacles(): Obstacle[] {
  return [
    {
      id: generateId(),
      type: 'screen',
      name: '左侧显示屏',
      position: { x: -8, y: 3, z: -14 },
      dimensions: { width: 3, height: 2, depth: 0.2 },
      visible: true,
    },
    {
      id: generateId(),
      type: 'screen',
      name: '右侧显示屏',
      position: { x: 8, y: 3, z: -14 },
      dimensions: { width: 3, height: 2, depth: 0.2 },
      visible: true,
    },
  ];
}
