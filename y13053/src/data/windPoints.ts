import type { WindProfilePoint } from '@/types';

export const windPoints: WindProfilePoint[] = [
  { id: 'P-001', height: 10, heightUnit: 'm', windSpeed: 4.2, windDirection: 65, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-002', height: 20, heightUnit: 'm', windSpeed: 5.1, windDirection: 68, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-003', height: 30, heightUnit: 'm', windSpeed: 5.8, windDirection: 70, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-004', height: 5, heightUnit: 'F', windSpeed: 3.9, windDirection: 62, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-005', height: 10, heightUnit: 'F', windSpeed: 4.7, windDirection: 64, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-006', height: 15, heightUnit: 'F', windSpeed: 5.3, windDirection: 67, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-007', height: 20, heightUnit: 'F', windSpeed: 6.0, windDirection: 71, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-008', height: 25, heightUnit: 'F', windSpeed: 11.2, windDirection: 142, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: true, linkedRecordId: 'REC-003' },
  { id: 'P-009', height: 30, heightUnit: 'F', windSpeed: 6.9, windDirection: 74, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-010', height: 35, heightUnit: 'F', windSpeed: 7.4, windDirection: 76, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-011', height: 5, heightUnit: '层', windSpeed: 3.8, windDirection: 60, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-012', height: 12, heightUnit: '层', windSpeed: 5.5, windDirection: 69, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-013', height: 18, heightUnit: '层', windSpeed: 9.8, windDirection: 215, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: true, linkedRecordId: 'REC-004' },
  { id: 'P-014', height: 24, heightUnit: '层', windSpeed: 7.1, windDirection: 73, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
  { id: 'P-015', height: 40, heightUnit: 'm', windSpeed: 7.8, windDirection: 78, station: 'A03', timestamp: '2025-06-09T08:00:00Z', isAnomaly: false },
];
