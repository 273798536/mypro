import type { GallerySegment, Valve, InspectionRoute, WorkOrder, RadiationZone } from './types';

export const gallerySegments: GallerySegment[] = [
  { id: 'GL-A', start: [0, 0, 0], end: [20, 0, 0], radiationZone: 'green' },
  { id: 'GL-B', start: [20, 0, 0], end: [40, 0, 0], radiationZone: 'yellow' },
  { id: 'GL-C', start: [40, 0, 0], end: [60, 0, 0], radiationZone: 'red' },
  { id: 'GL-D', start: [0, 0, -8], end: [60, 0, -8], radiationZone: 'green' },
];

export const valves: Valve[] = [
  { valveId: 'V-001', position: [5, 0, 0], galleryId: 'GL-A', indexInGallery: 0 },
  { valveId: 'V-002', position: [15, 0, 0], galleryId: 'GL-A', indexInGallery: 1 },
  { valveId: 'V-002', position: [35, 0, 0], galleryId: 'GL-B', indexInGallery: 0 },
  { valveId: 'V-003', position: [45, 0, 0], galleryId: 'GL-C', indexInGallery: 0 },
  { valveId: 'V-004', position: [10, 0, -8], galleryId: 'GL-D', indexInGallery: 0 },
  { valveId: 'V-005', position: [50, 0, -8], galleryId: 'GL-D', indexInGallery: 1 },
  { valveId: 'V-005', position: [55, 0, -8], galleryId: 'GL-D', indexInGallery: 2 },
];

export const inspectionRoutes: InspectionRoute[] = [
  { routeId: 'R-01', valveSequence: ['V-001', 'V-002', 'V-002', 'V-003'] },
  { routeId: 'R-02', valveSequence: ['V-004', 'V-005', 'V-005'] },
];

export const workOrders: WorkOrder[] = [
  { workOrderId: 'WO-2026-001', valveRef: 'V-001', status: 'completed', dueDate: '2026-05-15' },
  { workOrderId: 'WO-2026-002', valveRef: 'V-002', status: 'overdue', dueDate: '2026-05-20' },
  { workOrderId: 'WO-2026-003', valveRef: 'V-003', status: 'overdue', dueDate: '2026-05-18' },
  { workOrderId: 'WO-2026-004', valveRef: 'V-004', status: 'in_progress', dueDate: '2026-06-15' },
  { workOrderId: 'WO-2026-005', valveRef: 'V-005', status: 'overdue', dueDate: '2026-05-25' },
];

export const radiationZones: RadiationZone[] = [
  {
    zoneId: 'RZ-GREEN-1',
    zoneName: '绿区（可控区）',
    level: 'green',
    bounds: { min: [0, -2, -12], max: [20, 4, 4] },
  },
  {
    zoneId: 'RZ-YELLOW-1',
    zoneName: '黄区（监督区）',
    level: 'yellow',
    bounds: { min: [20, -2, -4], max: [40, 4, 4] },
  },
  {
    zoneId: 'RZ-RED-1',
    zoneName: '红区（禁区）',
    level: 'red',
    bounds: { min: [40, -2, -4], max: [60, 4, 4] },
  },
  {
    zoneId: 'RZ-GREEN-2',
    zoneName: '绿区（通道D）',
    level: 'green',
    bounds: { min: [0, -2, -12], max: [60, 4, -4] },
  },
];

export const ZONE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  green: { fill: 'rgba(46, 204, 113, 0.12)', stroke: '#2ECC71', label: '绿区' },
  yellow: { fill: 'rgba(255, 215, 0, 0.12)', stroke: '#FFD700', label: '黄区' },
  red: { fill: 'rgba(231, 76, 60, 0.12)', stroke: '#E74C3C', label: '红区' },
};
