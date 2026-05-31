import type { Spacecraft, OrbitRing, FlightLog, MissionResult, Violation } from '@/types';

export const initialSpacecraft: Spacecraft[] = [
  { id: 'sc-001', name: '天舟七号', status: 'window_standby', fuelBudget: 1200, fuelUsed: 0, orbitCount: 0 },
  { id: 'sc-002', name: '神舟十八号', status: 'in_orbit', fuelBudget: 800, fuelUsed: 320, orbitCount: 2 },
  { id: 'sc-003', name: '嫦娥六号', status: 'de_orbit', fuelBudget: 1500, fuelUsed: 1500, orbitCount: 3 },
];

export const initialOrbitRings: OrbitRing[] = [
  { id: 'orb-001', name: '近地轨道 LEO-A', fuelCost: 200, thrustGain: 50, windowOpen: '08:00', windowClose: '10:30', isAssigned: false, altitude: 400 },
  { id: 'orb-002', name: '近地轨道 LEO-B', fuelCost: 250, thrustGain: 65, windowOpen: '09:15', windowClose: '11:00', isAssigned: false, altitude: 420 },
  { id: 'orb-003', name: '中轨道 MEO-1', fuelCost: 400, thrustGain: 120, windowOpen: '07:30', windowClose: '09:00', isAssigned: false, altitude: 2000 },
  { id: 'orb-004', name: '地球同步转移 GTO', fuelCost: 600, thrustGain: 200, windowOpen: '06:00', windowClose: '07:30', isAssigned: false, altitude: 35786 },
  { id: 'orb-005', name: '高椭圆轨道 HEO', fuelCost: 500, thrustGain: 160, windowOpen: '10:00', windowClose: '12:00', isAssigned: false, altitude: 40000 },
  { id: 'orb-006', name: '近地轨道 LEO-C', fuelCost: 180, thrustGain: 45, windowOpen: '11:00', windowClose: '13:00', isAssigned: false, altitude: 380 },
];

export const initialFlightLogs: FlightLog[] = [
  { id: 'fl-001', spacecraftId: 'sc-002', orbitRingId: 'orb-001', eventType: 'allocation', description: '神舟十八号分配至近地轨道 LEO-A', timestamp: '2026-05-30T08:15:00', hasMissingField: false, isLateEntry: false, isNoteModified: false },
  { id: 'fl-002', spacecraftId: 'sc-002', orbitRingId: 'orb-003', eventType: 'fuel_settlement', description: '燃料结算：消耗400单位，预算剩余80', timestamp: '2026-05-30T08:45:00', hasMissingField: true, isLateEntry: false, isNoteModified: false },
  { id: 'fl-003', spacecraftId: 'sc-003', orbitRingId: undefined, eventType: 'window_miss', description: '嫦娥六号错过地球同步转移窗口', timestamp: '2026-05-30T07:35:00', hasMissingField: false, isLateEntry: true, isNoteModified: false },
  { id: 'fl-004', spacecraftId: 'sc-003', orbitRingId: 'orb-005', eventType: 'allocation', description: '嫦娥六号分配至高椭圆轨道 HEO（窗口关闭后补录）', timestamp: '2026-05-30T12:30:00', hasMissingField: false, isLateEntry: true, isNoteModified: true, noteOriginal: '嫦娥六号分配至高椭圆轨道 HEO' },
  { id: 'fl-005', spacecraftId: 'sc-003', orbitRingId: 'orb-004', eventType: 'orbit_intersection', description: 'GTO轨道与HEO轨道相交，存在碰撞风险', timestamp: '2026-05-30T12:35:00', hasMissingField: false, isLateEntry: false, isNoteModified: false },
  { id: 'fl-006', spacecraftId: 'sc-001', eventType: 'note', description: '天舟七号等待发射窗口确认', timestamp: '2026-05-31T06:00:00', hasMissingField: true, isLateEntry: false, isNoteModified: true, noteOriginal: '天舟七号待命' },
];

export const initialMissionResults: MissionResult[] = [
  { id: 'mr-001', spacecraftId: 'sc-002', totalScore: 78, orbitScore: 55, fuelScore: 23, status: 'partial' },
  { id: 'mr-002', spacecraftId: 'sc-003', totalScore: 32, orbitScore: 40, fuelScore: -8, status: 'failed' },
];

export const initialViolations: Violation[] = [
  { id: 'vio-001', missionResultId: 'mr-002', ruleType: 'window_rule', ruleName: '窗口错过（不可覆盖）', description: '嫦娥六号于07:35错过GTO发射窗口（窗口07:30关闭），此违规不可被后续错误覆盖', spacecraftId: 'sc-003', orbitRingId: 'orb-004', isOverridden: false },
  { id: 'vio-002', missionResultId: 'mr-002', ruleType: 'fuel_settlement', ruleName: '燃料结算不足', description: '嫦娥六号燃料预算1500已全部消耗，无法覆盖HEO轨道成本500', spacecraftId: 'sc-003', orbitRingId: 'orb-005', isOverridden: true },
  { id: 'vio-003', missionResultId: 'mr-002', ruleType: 'orbit_propulsion', ruleName: '轨道相交风险', description: 'GTO与HEO轨道在高程35000km处相交，推进路径冲突', spacecraftId: 'sc-003', orbitRingId: 'orb-004', isOverridden: true },
  { id: 'vio-004', missionResultId: 'mr-001', ruleType: 'fuel_settlement', ruleName: '燃料结算超支', description: '神舟十八号燃料预算800，已消耗720，接近上限', spacecraftId: 'sc-002', orbitRingId: 'orb-003', isOverridden: false },
];
