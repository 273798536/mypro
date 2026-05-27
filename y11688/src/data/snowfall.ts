import type { SnowData } from '@/types';

export const snowData: SnowData[] = [
  {
    slopeId: 'slope-001',
    depth: 45,
    quality: 'packed',
    lastUpdated: new Date('2026-05-27T06:00:00'),
    source: '雪场监测站-A1',
  },
  {
    slopeId: 'slope-002',
    depth: 42,
    quality: 'packed',
    lastUpdated: new Date('2026-05-27T06:00:00'),
    source: '雪场监测站-A2',
  },
  {
    slopeId: 'slope-003',
    depth: 55,
    quality: 'powder',
    lastUpdated: new Date('2026-05-27T06:00:00'),
    source: '雪场监测站-B1',
  },
  {
    slopeId: 'slope-004',
    depth: 38,
    quality: 'icy',
    lastUpdated: new Date('2026-05-27T06:00:00'),
    source: '雪场监测站-B2',
  },
  {
    slopeId: 'slope-005',
    depth: 60,
    quality: 'powder',
    lastUpdated: new Date('2026-05-27T06:00:00'),
    source: '雪场监测站-C1',
  },
  {
    slopeId: 'slope-006',
    depth: 48,
    quality: 'packed',
    lastUpdated: new Date('2026-05-27T06:00:00'),
    source: '雪场监测站-C2',
  },
];

export const getSnowBySlopeId = (slopeId: string): SnowData | undefined => {
  return snowData.find((s) => s.slopeId === slopeId);
};
