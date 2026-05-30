import { Building, WindCorridor, WindRose, RoadEdge, Conflict, Severity } from '@/types';
import { calculateOverlapArea, calculateDistanceToRoad, findBlockingBuildings, calculateWindGap } from './geometry';

export function detectBuildingOverlaps(buildings: Building[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const a = buildings[i];
      const b = buildings[j];

      const overlapX = Math.abs(a.position[0] - b.position[0]) < (a.dimensions[0] + b.dimensions[0]) / 2;
      const overlapZ = Math.abs(a.position[2] - b.position[2]) < (a.dimensions[2] + b.dimensions[2]) / 2;

      if (overlapX && overlapZ) {
        const overlapArea = calculateOverlapArea(a, b);
        const severity: Severity = overlapArea > 50 ? 'critical' : 'error';

        conflicts.push({
          id: `overlap-${a.id}-${b.id}`,
          type: 'overlap',
          severity,
          buildingIds: [a.id, b.id],
          description: `建筑 ${a.name} 与 ${b.name} 体块重叠`,
          details: {
            overlapArea: overlapArea.toFixed(2),
            buildingA: {
              name: a.name,
              position: a.position,
              dimensions: a.dimensions
            },
            buildingB: {
              name: b.name,
              position: b.position,
              dimensions: b.dimensions
            }
          },
          resolved: false,
          createdAt: Date.now()
        });
      }
    }
  }

  return conflicts;
}

export function detectWindGaps(
  buildings: Building[],
  corridors: WindCorridor[],
  windRose: WindRose
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const corridor of corridors) {
    const blockingBuildings = findBlockingBuildings(corridor, buildings);

    for (const building of blockingBuildings) {
      const gapAngle = calculateWindGap(building, corridor, windRose);

      if (gapAngle > 30) {
        let severity: Severity = 'warning';
        if (gapAngle > 60) severity = 'critical';
        else if (gapAngle > 45) severity = 'error';

        conflicts.push({
          id: `wind-gap-${corridor.id}-${building.id}`,
          type: 'wind_gap',
          severity,
          buildingIds: [building.id],
          description: `${building.name} 造成风廊 ${corridor.name} 风向缺口 ${gapAngle.toFixed(1)}°`,
          details: {
            gapAngle: gapAngle.toFixed(2),
            corridorId: corridor.id,
            corridorName: corridor.name,
            buildingHeight: building.height,
            buildingPosition: building.position,
            windDirection: windRose.season
          },
          resolved: false,
          createdAt: Date.now()
        });
      }
    }
  }

  return conflicts;
}

export function detectSetbackViolations(
  buildings: Building[],
  roads: RoadEdge[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const building of buildings) {
    for (const road of roads) {
      const distance = calculateDistanceToRoad(building, road);
      const required = road.setbackRequired;

      if (distance < required) {
        const severity: Severity = distance < required * 0.4 ? 'critical' : 'error';

        conflicts.push({
          id: `setback-${building.id}-${road.id}`,
          type: 'setback',
          severity,
          buildingIds: [building.id],
          description: `${building.name} 退界不足，距${road.name}仅 ${distance.toFixed(1)}m（要求≥${required}m）`,
          details: {
            distance: distance.toFixed(2),
            required,
            roadId: road.id,
            roadName: road.name,
            deficit: (required - distance).toFixed(2)
          },
          resolved: false,
          createdAt: Date.now()
        });
      }
    }
  }

  return conflicts;
}

export function detectAllConflicts(
  buildings: Building[],
  corridors: WindCorridor[],
  windRose: WindRose,
  roads: RoadEdge[]
): Conflict[] {
  const overlaps = detectBuildingOverlaps(buildings);
  const windGaps = detectWindGaps(buildings, corridors, windRose);
  const setbacks = detectSetbackViolations(buildings, roads);

  return [...overlaps, ...windGaps, ...setbacks];
}

export function getConflictTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    overlap: '体块重叠',
    wind_gap: '风向缺口',
    setback: '退界违规',
    data_merge: '数据冲突'
  };
  return labels[type] || type;
}

export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    warning: '警告',
    error: '错误',
    critical: '严重'
  };
  return labels[severity] || severity;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    warning: '#ff8a3d',
    error: '#ff4757',
    critical: '#ff2d55'
  };
  return colors[severity] || '#888';
}

export function getBuildingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    proposed: '拟建',
    existing: '已建',
    'under-construction': '在建'
  };
  return labels[status] || status;
}
