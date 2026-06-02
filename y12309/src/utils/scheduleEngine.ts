import type {
  Building,
  RouteEdge,
  Inspector,
  Schedule,
  LeaveRecord,
  WorkOrder,
  Anomaly,
  ChangeLog,
  ShiftType,
} from '@/types';
import { createRouteAnalyzer } from '@/utils/graphUtils';

export interface RescheduleInput {
  buildings: Building[];
  routeEdges: RouteEdge[];
  inspectors: Inspector[];
  schedules: Schedule[];
  leaveRecords: LeaveRecord[];
  workOrders: WorkOrder[];
  date: string;
  reason: string;
  operator: string;
}

export interface RescheduleResult {
  schedules: Schedule[];
  newAnomalies: Anomaly[];
  changeLogs: ChangeLog[];
  summary: {
    reassigned: number;
    accessSkipped: string[];
    routeBreakCount: number;
    duplicateCount: number;
  };
}

function getAvailableInspectors(
  inspectors: Inspector[],
  leaveRecords: LeaveRecord[],
  date: string
): Inspector[] {
  const onLeaveIds = leaveRecords
    .filter(l => l.status === 'approved' && l.startDate <= date && l.endDate >= date)
    .map(l => l.inspectorId);
  return inspectors.filter(i => i.onDuty && !onLeaveIds.includes(i.id));
}

function getAccessOpenBuildings(buildings: Building[]): Building[] {
  return buildings.filter(b => b.accessOpen);
}

function getManualInsertBuildings(workOrders: WorkOrder[], date: string): Map<string, string> {
  const map = new Map<string, string>();
  workOrders
    .filter(wo => wo.source === 'manual' && wo.scheduledTime.startsWith(date) && wo.status !== 'cancelled')
    .forEach(wo => {
      if (!map.has(wo.buildingId)) {
        map.set(wo.buildingId, wo.inspectorId);
      }
    });
  return map;
}

function groupBuildingsByZone(buildings: Building[]): Map<string, Building[]> {
  const map = new Map<string, Building[]>();
  buildings.forEach(b => {
    const list = map.get(b.zone) || [];
    list.push(b);
    map.set(b.zone, list);
  });
  return map;
}

function buildZoneToShiftMap(schedules: Schedule[], date: string): Map<string, ShiftType[]> {
  const map = new Map<string, ShiftType[]>();
  schedules
    .filter(s => s.date === date)
    .forEach(s => {
      s.buildingIds.forEach(bid => {
        const shifts = map.get(bid) || [];
        if (!shifts.includes(s.shift)) shifts.push(s.shift);
        map.set(bid, shifts);
      });
    });
  return map;
}

export function reschedule(input: RescheduleInput): RescheduleResult {
  const {
    buildings,
    routeEdges,
    inspectors,
    schedules: existingSchedules,
    leaveRecords,
    workOrders,
    date,
    reason,
    operator,
  } = input;

  const now = new Date().toISOString();
  const newAnomalies: Anomaly[] = [];
  const changeLogs: ChangeLog[] = [];

  const available = getAvailableInspectors(inspectors, leaveRecords, date);
  const openBuildings = getAccessOpenBuildings(buildings);
  const manualInserts = getManualInsertBuildings(workOrders, date);
  const analyzer = createRouteAnalyzer(buildings, routeEdges);

  const existingForDate = existingSchedules.filter(s => s.date === date);
  const onLeaveIds = leaveRecords
    .filter(l => l.status === 'approved' && l.startDate <= date && l.endDate >= date)
    .map(l => l.inspectorId);

  const buildingsToAssign = openBuildings.map(b => b.id);

  const inspectorLoad = new Map<string, string[]>();
  available.forEach(ins => inspectorLoad.set(ins.id, []));

  const forcedAssign = new Map<string, string>();
  manualInserts.forEach((inspectorId, buildingId) => {
    if (available.find(i => i.id === inspectorId)) {
      forcedAssign.set(buildingId, inspectorId);
      const load = inspectorLoad.get(inspectorId) || [];
      load.push(buildingId);
      inspectorLoad.set(inspectorId, load);
    }
  });

  const remaining = buildingsToAssign.filter(bid => !forcedAssign.has(bid));

  const zoneGroups = groupBuildingsByZone(
    openBuildings.filter(b => !forcedAssign.has(b.id))
  );

  const zoneList = Array.from(zoneGroups.entries());
  for (const [zone, zoneBuildings] of zoneList) {
    const zoneBuildingIds = zoneBuildings.map(b => b.id);
    const connected = analyzer.checkConnectivity(zoneBuildingIds);

    if (!connected) {
      const breakpoints = analyzer.detectBreakpoints();
      const zoneBreaks = breakpoints.filter(
        bp => zoneBuildingIds.includes(bp.fromBuilding) || zoneBuildingIds.includes(bp.toBuilding)
      );
      zoneBreaks.forEach(bp => {
        const existing = newAnomalies.find(
          a => a.type === 'route_break' &&
            a.details.fromBuilding === bp.fromBuilding &&
            a.details.toBuilding === bp.toBuilding
        );
        if (!existing) {
          newAnomalies.push({
            id: `a-${Date.now()}-${bp.id}`,
            type: 'route_break',
            level: 'medium',
            description: `${buildings.find(b => b.id === bp.fromBuilding)?.name}至${buildings.find(b => b.id === bp.toBuilding)?.name}路线中断，${zone}区巡检路线受影响`,
            sourceIds: [routeEdges.find(e => e.fromBuilding === bp.fromBuilding && e.toBuilding === bp.toBuilding)?.id || bp.id],
            sourceTypes: ['route_edge'],
            detectedAt: now,
            resolved: false,
            details: {
              fromBuilding: bp.fromBuilding,
              toBuilding: bp.toBuilding,
              alternativeRoute: bp.affectedRoutes.join('→') || '无替代路线',
            },
          });
        }
      });
    }
  }

  const avgLoad = Math.ceil(remaining.length / Math.max(available.length, 1));
  const sortedAvailable = [...available].sort((a, b) => {
    const aLoad = (inspectorLoad.get(a.id) || []).length;
    const bLoad = (inspectorLoad.get(b.id) || []).length;
    return aLoad - bLoad;
  });

  let assignIdx = 0;
  const zoneAssignOrder = Array.from(zoneGroups.entries());
  for (const [, zoneBuildings] of zoneAssignOrder) {
    for (const building of zoneBuildings) {
      let assigned = false;
      const startIdx = assignIdx % sortedAvailable.length;
      for (let offset = 0; offset < sortedAvailable.length; offset++) {
        const idx = (startIdx + offset) % sortedAvailable.length;
        const ins = sortedAvailable[idx];
        const load = inspectorLoad.get(ins.id) || [];
        if (load.length < avgLoad + 1) {
          load.push(building.id);
          inspectorLoad.set(ins.id, load);
          assigned = true;
          assignIdx = idx + 1;
          break;
        }
      }
      if (!assigned && sortedAvailable.length > 0) {
        const ins = sortedAvailable[assignIdx % sortedAvailable.length];
        const load = inspectorLoad.get(ins.id) || [];
        load.push(building.id);
        inspectorLoad.set(ins.id, load);
        assignIdx++;
      }
    }
  }

  const closedBuildings = buildings.filter(b => !b.accessOpen);
  closedBuildings.forEach(b => {
    const existing = newAnomalies.find(
      a => a.type === 'access_closed' && a.sourceIds.includes(b.id)
    );
    if (!existing) {
      const affectedSchedules = existingForDate.filter(s => s.buildingIds.includes(b.id));
      const affectedInspectors = affectedSchedules.map(s => s.inspectorId);
      newAnomalies.push({
        id: `a-${Date.now()}-${b.id}`,
        type: 'access_closed',
        level: 'high',
        description: `${b.name}门禁系统已关闭，无法巡检`,
        sourceIds: [b.id],
        sourceTypes: ['building'],
        detectedAt: now,
        resolved: false,
        details: {
          lastOpenTime: b.accessLastUpdate,
          affectedInspectors,
        },
      });
    }
  });

  const newSchedules: Schedule[] = existingSchedules
    .filter(s => s.date !== date)
    .concat(
      available.map((ins, idx) => {
        const assignedBuildings = inspectorLoad.get(ins.id) || [];
        const shift: ShiftType = idx % 3 === 0 ? 'morning' : idx % 3 === 1 ? 'afternoon' : 'night';
        const oldSchedule = existingForDate.find(s => s.inspectorId === ins.id);
        const isChanged = oldSchedule
          ? JSON.stringify([...oldSchedule.buildingIds].sort()) !== JSON.stringify([...assignedBuildings].sort())
          : assignedBuildings.length > 0;

        if (isChanged && oldSchedule) {
          const removedBids = oldSchedule.buildingIds.filter(bid => !assignedBuildings.includes(bid));
          const addedBids = assignedBuildings.filter(bid => !oldSchedule.buildingIds.includes(bid));
          if (removedBids.length > 0 || addedBids.length > 0) {
            changeLogs.push({
              id: `cl-${Date.now()}-${ins.id}`,
              entityType: 'schedule',
              entityId: oldSchedule.id,
              field: 'buildingIds',
              oldValue: oldSchedule.buildingIds.join(','),
              newValue: assignedBuildings.join(','),
              operator,
              timestamp: now,
              reason,
            });
          }
        }

        return {
          id: oldSchedule?.id || `s-${Date.now()}-${ins.id}`,
          inspectorId: ins.id,
          date,
          shift: oldSchedule?.shift || shift,
          buildingIds: assignedBuildings,
          isModified: isChanged,
          modifiedBy: isChanged ? operator : oldSchedule?.modifiedBy,
          modifiedAt: isChanged ? now : oldSchedule?.modifiedAt,
        };
      }).filter(s => s.buildingIds.length > 0)
    );

  onLeaveIds.forEach(leaveInsId => {
    const oldSchedule = existingForDate.find(s => s.inspectorId === leaveInsId);
    if (oldSchedule && oldSchedule.buildingIds.length > 0) {
      const leaveIns = inspectors.find(i => i.id === leaveInsId);
      changeLogs.push({
        id: `cl-${Date.now()}-leave-${leaveInsId}`,
        entityType: 'schedule',
        entityId: oldSchedule.id,
        field: 'buildingIds',
        oldValue: oldSchedule.buildingIds.join(','),
        newValue: '(请假移除)',
        operator,
        timestamp: now,
        reason: `${leaveIns?.name || leaveInsId}请假，楼栋已重新分配`,
      });
    }
  });

  const buildingAssignmentCount = new Map<string, number>();
  newSchedules
    .filter(s => s.date === date)
    .forEach(s => {
      s.buildingIds.forEach(bid => {
        buildingAssignmentCount.set(bid, (buildingAssignmentCount.get(bid) || 0) + 1);
      });
    });

  buildingAssignmentCount.forEach((count, buildingId) => {
    if (count > 1) {
      const buildingName = buildings.find(b => b.id === buildingId)?.name || buildingId;
      const dupInspectors = newSchedules
        .filter(s => s.date === date && s.buildingIds.includes(buildingId))
        .map(s => s.inspectorId);
      const existing = newAnomalies.find(
        a => a.type === 'duplicate_inspection' && a.details.buildingId === buildingId
      );
      if (!existing) {
        newAnomalies.push({
          id: `a-${Date.now()}-dup-${buildingId}`,
          type: 'duplicate_inspection',
          level: 'low',
          description: `${buildingName}被${count}名巡检员重复安排，需确认`,
          sourceIds: [buildingId, ...dupInspectors],
          sourceTypes: ['building', ...dupInspectors.map(() => 'schedule')],
          detectedAt: now,
          resolved: false,
          details: {
            buildingId,
            inspectors: dupInspectors,
          },
        });
      }
    }
  });

  const reassignedCount = changeLogs.filter(cl => cl.entityType === 'schedule').length;

  return {
    schedules: newSchedules,
    newAnomalies,
    changeLogs,
    summary: {
      reassigned: reassignedCount,
      accessSkipped: closedBuildings.map(b => b.name),
      routeBreakCount: newAnomalies.filter(a => a.type === 'route_break').length,
      duplicateCount: newAnomalies.filter(a => a.type === 'duplicate_inspection').length,
    },
  };
}

export function detectAnomalies(
  buildings: Building[],
  routeEdges: RouteEdge[],
  schedules: Schedule[],
  inspectors: Inspector[],
  leaveRecords: LeaveRecord[],
  date: string
): Anomaly[] {
  const now = new Date().toISOString();
  const anomalies: Anomaly[] = [];

  buildings.filter(b => !b.accessOpen).forEach(b => {
    const affectedSchedules = schedules.filter(
      s => s.date === date && s.buildingIds.includes(b.id)
    );
    anomalies.push({
      id: `a-det-${Date.now()}-${b.id}`,
      type: 'access_closed',
      level: 'high',
      description: `${b.name}门禁系统已关闭，无法巡检`,
      sourceIds: [b.id],
      sourceTypes: ['building'],
      detectedAt: now,
      resolved: false,
      details: {
        lastOpenTime: b.accessLastUpdate,
        affectedInspectors: affectedSchedules.map(s => s.inspectorId),
      },
    });
  });

  const analyzer = createRouteAnalyzer(buildings, routeEdges);
  const breakpoints = analyzer.detectBreakpoints();
  breakpoints.forEach(bp => {
    anomalies.push({
      id: `a-det-${Date.now()}-${bp.id}`,
      type: 'route_break',
      level: 'medium',
      description: `${buildings.find(b => b.id === bp.fromBuilding)?.name}至${buildings.find(b => b.id === bp.toBuilding)?.name}路线中断`,
      sourceIds: [routeEdges.find(e => e.fromBuilding === bp.fromBuilding && e.toBuilding === bp.toBuilding)?.id || bp.id],
      sourceTypes: ['route_edge'],
      detectedAt: now,
      resolved: false,
      details: {
        fromBuilding: bp.fromBuilding,
        toBuilding: bp.toBuilding,
        alternativeRoute: bp.affectedRoutes.join('→') || '无替代路线',
      },
    });
  });

  const buildingScheduleMap = new Map<string, string[]>();
  schedules.filter(s => s.date === date).forEach(s => {
    s.buildingIds.forEach(bid => {
      const list = buildingScheduleMap.get(bid) || [];
      list.push(s.inspectorId);
      buildingScheduleMap.set(bid, list);
    });
  });
  buildingScheduleMap.forEach((inspectorIds, buildingId) => {
    if (inspectorIds.length > 1) {
      anomalies.push({
        id: `a-det-${Date.now()}-dup-${buildingId}`,
        type: 'duplicate_inspection',
        level: 'low',
        description: `${buildings.find(b => b.id === buildingId)?.name || buildingId}被${inspectorIds.length}名巡检员重复安排`,
        sourceIds: [buildingId, ...inspectorIds],
        sourceTypes: ['building', ...inspectorIds.map(() => 'schedule')],
        detectedAt: now,
        resolved: false,
        details: { buildingId, inspectors: inspectorIds },
      });
    }
  });

  return anomalies;
}
