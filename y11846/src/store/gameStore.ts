import { create } from 'zustand';
import type {
  GamePhase,
  Level,
  Waypoint,
  FlightState,
  FlightEvent,
  FlightSegment,
  ScoreBreakdown,
  ChoicePoint,
  WindChange,
  FlightReport,
} from '@/types/game';
import { levels, windFieldV2Map } from '@/data/levels';
import { getWindAtPosition, getWindFactor, compareWindFields } from '@/engine/wind';
import { isInNoFlyZone } from '@/engine/collision';
import { estimateReturnBattery, generateSegments } from '@/engine/battery';
import { calculateScore, generateFlightReport } from '@/engine/scoring';

const DRONE_SPEED = 10;

interface GameState {
  phase: GamePhase;
  currentLevel: Level | null;
  selectedLevelId: string;
  plannedWaypoints: Waypoint[];
  flightState: FlightState | null;
  flightEvents: FlightEvent[];
  flightSegments: FlightSegment[];
  scoreBreakdown: ScoreBreakdown | null;
  batteryRemaining: number;
  flightSuccess: boolean;
  isFlying: boolean;
  windFieldVersion: number;
  windChanges: WindChange[];
  activeChoicePoint: ChoicePoint | null;
  showEventPopup: { show: boolean; event: FlightEvent | null };
  flightReport: FlightReport | null;
  previousSegments: FlightSegment[] | null;
  previousEvents: FlightEvent[] | null;
  allWaypointsDone: boolean;

  selectLevel: (levelId: string) => void;
  setPhase: (phase: GamePhase) => void;
  updatePlannedWaypoints: (waypoints: Waypoint[]) => void;
  startFlight: () => void;
  updateFlightTick: (deltaTime: number) => void;
  handleChoicePoint: (choicePoint: ChoicePoint) => void;
  resolveChoice: (optionIndex: number) => void;
  dismissEventPopup: () => void;
  endFlight: (success: boolean) => void;
  switchToWindFieldV2: () => void;
  resetGame: () => void;
  downloadReport: () => void;
}

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'briefing',
  currentLevel: null,
  selectedLevelId: levels[0].id,
  plannedWaypoints: [],
  flightState: null,
  flightEvents: [],
  flightSegments: [],
  scoreBreakdown: null,
  batteryRemaining: 100,
  flightSuccess: false,
  isFlying: false,
  windFieldVersion: 1,
  windChanges: [],
  activeChoicePoint: null,
  showEventPopup: { show: false, event: null },
  flightReport: null,
  previousSegments: null,
  previousEvents: null,
  allWaypointsDone: false,

  selectLevel: (levelId: string) => {
    const level = levels.find((l) => l.id === levelId);
    if (level) {
      set({
        currentLevel: level,
        selectedLevelId: levelId,
        plannedWaypoints: [...level.waypoints],
        flightSegments: generateSegments(
          level.waypoints,
          level.windField,
          level.headwindMultiplier,
          level.baseDrainRate,
          [],
        ),
      });
    }
  },

  setPhase: (phase: GamePhase) => set({ phase }),

  updatePlannedWaypoints: (waypoints: Waypoint[]) => {
    const { currentLevel, windChanges } = get();
    if (currentLevel) {
      set({
        plannedWaypoints: waypoints,
        flightSegments: generateSegments(
          waypoints,
          currentLevel.windField,
          currentLevel.headwindMultiplier,
          currentLevel.baseDrainRate,
          windChanges,
        ),
      });
    }
  },

  startFlight: () => {
    const { currentLevel, plannedWaypoints, windFieldVersion, windChanges } = get();
    if (!currentLevel) return;

    const windAtStart = getWindAtPosition(currentLevel.windField, currentLevel.start.x, currentLevel.start.y);
    const initHeading = plannedWaypoints.length > 0
      ? Math.atan2(plannedWaypoints[0].y - currentLevel.start.y, plannedWaypoints[0].x - currentLevel.start.x)
      : 0;
    const initWindFactor = getWindFactor(windAtStart.direction, windAtStart.speed, initHeading);

    set({
      flightState: {
        position: { ...currentLevel.start },
        heading: initHeading,
        battery: currentLevel.batteryCapacity,
        speed: DRONE_SPEED,
        currentWaypointIndex: 0,
        inNoFlyZone: false,
        windAtPosition: windAtStart,
        isHeadwind: initWindFactor.isHeadwind,
        drainRate: currentLevel.baseDrainRate * initWindFactor.coefficient,
        elapsed: 0,
      },
      flightEvents: [],
      scoreBreakdown: null,
      batteryRemaining: currentLevel.batteryCapacity,
      flightSuccess: false,
      isFlying: true,
      activeChoicePoint: null,
      allWaypointsDone: false,
      phase: 'flying',
      flightSegments: generateSegments(
        plannedWaypoints,
        currentLevel.windField,
        currentLevel.headwindMultiplier,
        currentLevel.baseDrainRate,
        windChanges,
        windFieldVersion,
      ),
    });
  },

  updateFlightTick: (deltaTime: number) => {
    const { currentLevel, flightState, plannedWaypoints, flightEvents, isFlying, activeChoicePoint, allWaypointsDone: storeAllWaypointsDone } = get();
    if (!currentLevel || !flightState || !isFlying || activeChoicePoint) return;

    const state = { ...flightState };
    const newEvents: FlightEvent[] = [...flightEvents];
    let endFlight = false;
    let flightSuccessFlag = false;
    let localAllWaypointsDone = storeAllWaypointsDone;

    let targetWaypoints = localAllWaypointsDone
      ? [{ id: 'home', x: currentLevel.home.x, y: currentLevel.home.y, label: '返航点', isRequired: true }]
      : plannedWaypoints;
    let targetIndex = localAllWaypointsDone ? 0 : state.currentWaypointIndex;

    if (targetIndex >= targetWaypoints.length && !localAllWaypointsDone) {
      newEvents.push({
        type: 'all_waypoints_done',
        timestamp: state.elapsed,
        position: { ...state.position },
        message: '所有航点已完成，准备返航',
        details: {},
      });
      localAllWaypointsDone = true;
      targetWaypoints = [{ id: 'home', x: currentLevel.home.x, y: currentLevel.home.y, label: '返航点', isRequired: true }];
      targetIndex = 0;
    }

    const currentTarget = localAllWaypointsDone
      ? { x: currentLevel.home.x, y: currentLevel.home.y }
      : targetWaypoints[targetIndex];

    if (currentTarget) {
      const dx = currentTarget.x - state.position.x;
      const dy = currentTarget.y - state.position.y;
      const distToTarget = Math.sqrt(dx * dx + dy * dy);

      if (distToTarget > 0.5) {
        const moveDistance = DRONE_SPEED * deltaTime;
        const moveRatio = Math.min(moveDistance / distToTarget, 1);
        const newX = state.position.x + dx * moveRatio;
        const newY = state.position.y + dy * moveRatio;

        state.heading = Math.atan2(dy, dx);
        state.position = { x: newX, y: newY };
        state.elapsed += deltaTime;

        const windAtPos = getWindAtPosition(currentLevel.windField, newX, newY);
        const windFactor = getWindFactor(
          windAtPos.direction,
          windAtPos.speed,
          state.heading,
          currentLevel.headwindMultiplier,
        );
        state.windAtPosition = windAtPos;
        state.isHeadwind = windFactor.isHeadwind;
        state.drainRate = currentLevel.baseDrainRate * windFactor.coefficient;

        const powerUsed = moveDistance * currentLevel.baseDrainRate * windFactor.coefficient;
        state.battery = Math.max(0, state.battery - powerUsed);

        const nfzId = isInNoFlyZone(state.position, currentLevel.noFlyZones);
        const wasInNoFlyZone = state.inNoFlyZone;
        state.inNoFlyZone = !!nfzId;

        if (nfzId && !wasInNoFlyZone) {
          const nfz = currentLevel.noFlyZones.find((z) => z.id === nfzId);
          const event: FlightEvent = {
            type: 'no_fly_zone_enter',
            timestamp: state.elapsed,
            position: { ...state.position },
            message: `⚠ 禁飞区穿越！区域：${nfz?.label || nfzId}。立即返航或接受扣分。`,
            details: { zone: nfz?.label || nfzId },
          };
          newEvents.push(event);
          set({ showEventPopup: { show: true, event } });
        } else if (!nfzId && wasInNoFlyZone) {
          newEvents.push({
            type: 'no_fly_zone_exit',
            timestamp: state.elapsed,
            position: { ...state.position },
            message: '已离开禁飞区',
            details: {},
          });
        }

        if (windFactor.isHeadwind && !flightEvents.some((e) => e.type === 'headwind_start' && Math.abs(e.timestamp - state.elapsed) < 0.1)) {
          const lastHeadwindEnd = [...flightEvents].reverse().find((e) => e.type === 'headwind_end');
          if (!lastHeadwindEnd || state.elapsed - lastHeadwindEnd.timestamp > 1) {
            newEvents.push({
              type: 'headwind_start',
              timestamp: state.elapsed,
              position: { ...state.position },
              message: `进入逆风区域，风速 ${windAtPos.speed.toFixed(1)} m/s，耗电×${windFactor.coefficient.toFixed(1)}`,
              details: { speed: windAtPos.speed, coefficient: windFactor.coefficient },
            });
          }
        }

        const returnEstimate = estimateReturnBattery(
          state.position,
          currentLevel.home,
          currentLevel.windField,
          currentLevel.headwindMultiplier,
          currentLevel.baseDrainRate,
          state.battery,
        );

        if (returnEstimate.isCritical && !flightEvents.some((e) => e.type === 'return_battery_critical')) {
          const event: FlightEvent = {
            type: 'return_battery_critical',
            timestamp: state.elapsed,
            position: { ...state.position },
            message: `🔋 返航电量不足！逆风已多消耗${((windFactor.coefficient - 1) * 100).toFixed(0)}%电量，当前电量仅${state.battery.toFixed(1)}%`,
            details: {
              battery: state.battery,
              needed: returnEstimate.needed,
              extraDrain: ((windFactor.coefficient - 1) * 100).toFixed(0),
            },
          };
          newEvents.push(event);
          set({ showEventPopup: { show: true, event } });
        } else if (state.battery < currentLevel.minReturnBattery + 10 && !flightEvents.some((e) => e.type === 'low_battery')) {
          newEvents.push({
            type: 'low_battery',
            timestamp: state.elapsed,
            position: { ...state.position },
            message: `电量偏低，当前 ${state.battery.toFixed(1)}%，建议规划返航`,
            details: { battery: state.battery },
          });
        }

        if (state.battery <= 0) {
          newEvents.push({
            type: 'flight_failed',
            timestamp: state.elapsed,
            position: { ...state.position },
            message: '电量耗尽，飞行失败！',
            details: {},
          });
          endFlight = true;
          flightSuccessFlag = false;
        }

        for (const cp of currentLevel.choicePoints) {
          const distToCp = distance(state.position, cp.position);
          const alreadyTriggered = flightEvents.some(
            (e) => e.type === 'choice_point' && e.details?.choiceId === cp.id,
          );
          if (distToCp < cp.triggerRadius && !alreadyTriggered) {
            newEvents.push({
              type: 'choice_point',
              timestamp: state.elapsed,
              position: { ...state.position },
              message: cp.prompt,
              details: { choiceId: cp.id },
            });
            set({ activeChoicePoint: cp });
            break;
          }
        }
      } else {
        if (!localAllWaypointsDone) {
          const wp = targetWaypoints[targetIndex];
          newEvents.push({
            type: 'waypoint_reached',
            timestamp: state.elapsed,
            position: { ...state.position },
            message: `到达航点 ${wp.label}`,
            details: { waypoint: wp.id, label: wp.label },
          });
          state.currentWaypointIndex = targetIndex + 1;

          if (state.currentWaypointIndex >= targetWaypoints.length) {
            localAllWaypointsDone = true;
            set({ allWaypointsDone: true });
          }
        } else {
          newEvents.push({
            type: 'flight_complete',
            timestamp: state.elapsed,
            position: { ...state.position },
            message: '安全返航！飞行完成。',
            details: {},
          });
          endFlight = true;
          flightSuccessFlag = true;
        }
      }
    }

    set({
      flightState: state,
      flightEvents: newEvents,
      batteryRemaining: state.battery,
    });

    if (endFlight) {
      const { flightSegments: segs } = get();
      const score = calculateScore(segs, newEvents, currentLevel, state.battery, flightSuccessFlag);
      const report = generateFlightReport(
        currentLevel,
        plannedWaypoints,
        segs,
        newEvents,
        score,
        state.battery,
        flightSuccessFlag,
        get().windFieldVersion,
        get().windChanges,
      );
      set({
        scoreBreakdown: score,
        flightReport: report,
        isFlying: false,
        flightSuccess: flightSuccessFlag,
        phase: 'result',
      });
    }
  },

  handleChoicePoint: (choicePoint: ChoicePoint) => {
    set({ activeChoicePoint: choicePoint });
  },

  resolveChoice: (optionIndex: number) => {
    const { currentLevel, activeChoicePoint, plannedWaypoints, flightState } = get();
    if (!activeChoicePoint || !currentLevel) return;

    const option = activeChoicePoint.options[optionIndex];
    const currentIdx = flightState?.currentWaypointIndex || 0;

    const newWaypoints = [
      ...plannedWaypoints.slice(0, currentIdx),
      ...option.waypoints,
      ...plannedWaypoints.slice(currentIdx),
    ];

    const { windFieldVersion, windChanges } = get();
    set({
      plannedWaypoints: newWaypoints,
      activeChoicePoint: null,
      flightSegments: generateSegments(
        newWaypoints,
        currentLevel.windField,
        currentLevel.headwindMultiplier,
        currentLevel.baseDrainRate,
        windChanges,
        windFieldVersion,
      ),
    });
  },

  dismissEventPopup: () => {
    set({ showEventPopup: { show: false, event: null } });
  },

  endFlight: (success: boolean) => {
    const { currentLevel, flightSegments: segs, flightEvents: evts, batteryRemaining: batt, plannedWaypoints } = get();
    if (!currentLevel) return;

    const score = calculateScore(segs, evts, currentLevel, batt, success);
    const report = generateFlightReport(
      currentLevel,
      plannedWaypoints,
      segs,
      evts,
      score,
      batt,
      success,
      get().windFieldVersion,
      get().windChanges,
    );

    set({
      scoreBreakdown: score,
      flightReport: report,
      isFlying: false,
      flightSuccess: success,
      phase: 'result',
    });
  },

  switchToWindFieldV2: () => {
    const { currentLevel, windFieldVersion, previousSegments: prevSegs } = get();
    if (!currentLevel || windFieldVersion >= 2) return;

    const newWindField = windFieldV2Map[currentLevel.id];
    if (!newWindField) return;

    const changes = compareWindFields(currentLevel.windField, newWindField);
    const updatedLevel = { ...currentLevel, windField: newWindField };

    set({
      currentLevel: updatedLevel,
      windFieldVersion: 2,
      windChanges: changes,
      previousSegments: prevSegs || get().flightSegments,
      flightSegments: generateSegments(
        get().plannedWaypoints,
        newWindField,
        currentLevel.headwindMultiplier,
        currentLevel.baseDrainRate,
        changes,
        2,
      ),
    });
  },

  resetGame: () => {
    const { selectedLevelId } = get();
    const level = levels.find((l) => l.id === selectedLevelId);
    if (level) {
      set({
        phase: 'briefing',
        currentLevel: level,
        plannedWaypoints: [...level.waypoints],
        flightState: null,
        flightEvents: [],
        flightSegments: generateSegments(level.waypoints, level.windField, level.headwindMultiplier, level.baseDrainRate, []),
        scoreBreakdown: null,
        batteryRemaining: level.batteryCapacity,
        flightSuccess: false,
        isFlying: false,
        windFieldVersion: 1,
        windChanges: [],
        activeChoicePoint: null,
        showEventPopup: { show: false, event: null },
        flightReport: null,
        allWaypointsDone: false,
      });
    }
  },

  downloadReport: () => {
    const { flightReport } = get();
    if (!flightReport) return;

    const dataStr = JSON.stringify(flightReport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flight-report-${flightReport.levelId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('=== 飞行报告摘要 ===');
    console.log('关卡:', flightReport.levelName);
    console.log('是否成功:', flightReport.flightSuccess ? '✅' : '❌');
    console.log('总分:', `${flightReport.score.totalScore}/${flightReport.score.maxTotalScore}`);
    console.log('剩余电量:', `${flightReport.batteryRemaining.toFixed(1)}%`);
    console.log('航点数量:', flightReport.waypoints.length);
    console.log('飞行事件数:', flightReport.events.length);
    console.log(flightReport.summaryText);
  },
}));
