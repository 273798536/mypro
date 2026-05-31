import type { HallModel, Seat, Surface, SoundSource, AnomalyItem } from '@/types';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);

export const mockHall: HallModel = {
  id: 'hall-001',
  name: '国家大剧院·音乐厅',
  width: 30,
  depth: 40,
  height: 15,
};

const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const seatsPerRow = [18, 20, 22, 24, 26, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8];

function generateSeats(): Seat[] {
  const seats: Seat[] = [];
  const totalRows = seatsPerRow.length;
  for (let ri = 0; ri < totalRows; ri++) {
    const count = seatsPerRow[ri];
    const rowLabel = rows[ri];
    const z = 8 + ri * 2.0;
    for (let si = 0; si < count; si++) {
      const x = (si - (count - 1) / 2) * 0.9;
      const y = ri < 5 ? 0 : (ri - 4) * 0.6;
      const r = rand();
      const reverbTime = 1.5 + r * 1.0 + (ri / totalRows) * 0.5;
      const isOccluded = ri >= 7 && si >= count - 3 && rand() > 0.5;
      const missingParams = rand() > 0.88;
      const frequencyBandError = rand() > 0.92;
      seats.push({
        id: `seat-${rowLabel}${si + 1}`,
        row: rowLabel,
        number: si + 1,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        z: Math.round(z * 100) / 100,
        reverbTime: Math.round(reverbTime * 100) / 100,
        isOccluded,
        missingParams,
        frequencyBandError,
      });
    }
  }
  return seats;
}

export const mockSeats: Seat[] = generateSeats();

export const mockSurfaces: Surface[] = [
  { id: 'surf-ceiling', name: '天花', materialType: '石膏板', absorptionCoeffs: [0.1, 0.1, 0.08, 0.05, 0.04, 0.07, 0.09, 0.11], paramsComplete: true, missingFreqBands: [] },
  { id: 'surf-wall-left', name: '左墙', materialType: '木质吸声板', absorptionCoeffs: [0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, -1], paramsComplete: false, missingFreqBands: [8000] },
  { id: 'surf-wall-right', name: '右墙', materialType: '木质吸声板', absorptionCoeffs: [0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, -1], paramsComplete: false, missingFreqBands: [8000] },
  { id: 'surf-wall-rear', name: '后墙', materialType: '未知', absorptionCoeffs: [-1, -1, -1, -1, -1, -1, -1, -1], paramsComplete: false, missingFreqBands: [63, 125, 250, 500, 1000, 2000, 4000, 8000] },
  { id: 'surf-floor', name: '地面', materialType: '地毯', absorptionCoeffs: [0.02, 0.06, 0.14, 0.37, 0.6, 0.65, 0.67, 0.72], paramsComplete: true, missingFreqBands: [] },
  { id: 'surf-stage', name: '舞台', materialType: '木地板', absorptionCoeffs: [0.15, 0.11, 0.1, 0.07, 0.06, 0.07, 0.07, 0.07], paramsComplete: true, missingFreqBands: [] },
  { id: 'surf-balcony', name: '挑台底面', materialType: '未指定', absorptionCoeffs: [0.05, -1, 0.1, -1, 0.06, -1, 0.07, -1], paramsComplete: false, missingFreqBands: [125, 500, 2000, 8000] },
];

export const mockSoundSources: SoundSource[] = [
  { id: 'src-1', x: 0, y: 0, z: 3, powerLevel: 90 },
  { id: 'src-2', x: -4, y: 0, z: 3.5, powerLevel: 85 },
  { id: 'src-3', x: 4, y: 0, z: 3.5, powerLevel: 85 },
];

function generateAnomalies(seats: Seat[]): AnomalyItem[] {
  const items: AnomalyItem[] = [];
  let counter = 0;
  for (const seat of seats) {
    if (seat.missingParams) {
      items.push({
        id: `anomaly-${counter++}`,
        type: 'material_missing',
        severity: 'high',
        status: 'pending',
        relatedEntityId: seat.id,
        description: `座位 ${seat.row}${seat.number} 缺少吸声参数，混响值不可靠`,
        location: { x: seat.x, y: seat.y, z: seat.z },
      });
    }
    if (seat.isOccluded) {
      items.push({
        id: `anomaly-${counter++}`,
        type: 'seat_occlusion',
        severity: 'medium',
        status: 'pending',
        relatedEntityId: seat.id,
        description: `座位 ${seat.row}${seat.number} 被挑台遮挡，直达声受影响`,
        location: { x: seat.x, y: seat.y, z: seat.z },
      });
    }
    if (seat.frequencyBandError) {
      items.push({
        id: `anomaly-${counter++}`,
        type: 'frequency_error',
        severity: 'high',
        status: 'pending',
        relatedEntityId: seat.id,
        description: `座位 ${seat.row}${seat.number} 频段数据异常，可能切错频段`,
        location: { x: seat.x, y: seat.y, z: seat.z },
      });
    }
  }
  for (const surf of mockSurfaces) {
    if (!surf.paramsComplete) {
      const bandLabels = surf.missingFreqBands.join(', ');
      items.push({
        id: `anomaly-${counter++}`,
        type: 'material_missing',
        severity: surf.missingFreqBands.length > 4 ? 'high' : 'medium',
        status: 'pending',
        relatedEntityId: surf.id,
        description: `表面"${surf.name}"(${surf.materialType})缺少频段 ${bandLabels} Hz 吸声系数`,
        location: { x: 0, y: 0, z: 0 },
      });
    }
  }
  return items;
}

export const mockAnomalies: AnomalyItem[] = generateAnomalies(mockSeats);
