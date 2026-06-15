import { MonitoringPoint, DataStatus } from '../types/common';
import { MapPoint, MapZone } from '../types/task';

export const FARM_NAME = '明珠海珍品养殖场';
export const FARM_LOCATION = '广东省湛江市东海岛';

export const ZONE_NAMES = ['A区近岸', 'B区深水', 'C区进水渠'];

export const MONITORING_POINTS: MonitoringPoint[] = [
  { id: 'A1', name: 'A1 - 近岸浅海1号', x: 120, y: 180, zone: 'A区近岸' },
  { id: 'A2', name: 'A2 - 近岸浅海2号', x: 180, y: 200, zone: 'A区近岸' },
  { id: 'A3', name: 'A3 - 近岸浅海3号', x: 240, y: 190, zone: 'A区近岸' },
  { id: 'A4', name: 'A4 - 近岸浅海4号', x: 300, y: 175, zone: 'A区近岸' },
  { id: 'A5', name: 'A5 - 近岸浅海5号', x: 220, y: 230, zone: 'A区近岸' },
  { id: 'B1', name: 'B1 - 深水养殖1号', x: 380, y: 140, zone: 'B区深水' },
  { id: 'B2', name: 'B2 - 深水养殖2号', x: 440, y: 160, zone: 'B区深水' },
  { id: 'B3', name: 'B3 - 深水养殖3号', x: 400, y: 210, zone: 'B区深水' },
  { id: 'C1', name: 'C1 - 进水渠1号', x: 80, y: 120, zone: 'C区进水渠' },
  { id: 'C2', name: 'C2 - 进水渠2号', x: 100, y: 80, zone: 'C区进水渠' },
];

export const FARM_MAP_BOUNDS = { width: 550, height: 320 };

export function generateMockMapData(taskId: string): { points: MapPoint[]; zones: MapZone[] } {
  const statuses = [DataStatus.AVAILABLE, DataStatus.AVAILABLE, DataStatus.AVAILABLE, DataStatus.PENDING, DataStatus.NEED_REVIEW];

  const points: MapPoint[] = MONITORING_POINTS.map(mp => {
    const riskScore = Math.floor(Math.random() * 100);
    const riskLevel = Math.floor(riskScore / 25);
    return {
      ...mp,
      taskId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      tideLevel: 1.5 + Math.random() * 2,
      salinity: 25 + Math.random() * 10,
      riskScore,
      riskLevel,
    };
  });

  const zones: MapZone[] = ZONE_NAMES.map((name, index) => {
    const x = 50 + index * 180;
    const y = 50 + index * 30;
    return {
      id: `zone-${index}`,
      name,
      pointCount: points.filter(p => p.zone === name).length,
      avgRiskScore: Math.floor(50 + Math.random() * 30),
      status: DataStatus.AVAILABLE,
      coordinates: { x, y, width: 150, height: 200 },
      labelPosition: { x: x + 75, y: y + 100 },
    };
  });

  return { points, zones };
}
