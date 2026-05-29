import { create } from 'zustand';
import { GameState, Station, BusLine, Bus, Decision, ReportData } from '../types';
import { sampleStations, sampleLines, sampleBuses, brokenScenarioBuses } from '../data/sampleData';
import { detectAllAnomalies } from '../utils/anomalyDetector';
import { simulatePassengerGrowth, moveBuses, calculateScore, checkGameEnd } from '../utils/gameEngine';

interface GameStore extends GameState {
  initGame: (useBrokenScenario?: boolean) => void;
  loadCustomData: (stations: Station[], lines: BusLine[], buses: Bus[]) => void;
  nextRound: () => void;
  makeDecision: (decision: Omit<Decision, 'id' | 'round' | 'timestamp'>) => void;
  resolveAnomaly: (anomalyId: string) => void;
  setRoadClosed: (stationId: string | null) => void;
  forceDispatchBus: (busId: string) => void;
  assignDriverBreak: (busId: string) => void;
  generateReport: () => ReportData;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentRound: 1,
  maxRounds: 10,
  timeOfDay: 7,
  score: 0,
  stations: [],
  lines: [],
  buses: [],
  anomalies: [],
  decisions: [],
  isRoadClosed: false,
  closedStationId: null,
  totalPassengersTransported: 0,
  onTimeDepartures: 0,
  totalDepartures: 0,
  gamePhase: 'setup',

  initGame: (useBrokenScenario = false) => {
    set({
      currentRound: 1,
      maxRounds: 10,
      timeOfDay: 7,
      score: 0,
      stations: JSON.parse(JSON.stringify(sampleStations)),
      lines: JSON.parse(JSON.stringify(sampleLines)),
      buses: JSON.parse(JSON.stringify(useBrokenScenario ? brokenScenarioBuses : sampleBuses)),
      anomalies: [],
      decisions: [],
      isRoadClosed: false,
      closedStationId: null,
      totalPassengersTransported: 0,
      onTimeDepartures: 0,
      totalDepartures: 0,
      gamePhase: 'playing',
    });

    setTimeout(() => {
      const state = get();
      const anomalies = detectAllAnomalies(state.buses, state.lines, state.stations, 1);
      set({ anomalies });
    }, 100);
  },

  loadCustomData: (stations: Station[], lines: BusLine[], buses: Bus[]) => {
    set({
      currentRound: 1,
      maxRounds: 10,
      timeOfDay: 7,
      score: 0,
      stations,
      lines,
      buses,
      anomalies: [],
      decisions: [],
      isRoadClosed: false,
      closedStationId: null,
      totalPassengersTransported: 0,
      onTimeDepartures: 0,
      totalDepartures: 0,
      gamePhase: 'playing',
    });
  },

  nextRound: () => {
    const state = get();
    if (state.gamePhase !== 'playing') return;

    const newRound = state.currentRound + 1;
    const newTime = state.timeOfDay + 0.5;

    const updatedStations = simulatePassengerGrowth(state.stations, newTime);

    const {
      buses: updatedBuses,
      transportedPassengers,
      onTimeCount,
      totalCount,
    } = moveBuses(state.buses, state.lines, updatedStations);

    const newAnomalies = detectAllAnomalies(updatedBuses, state.lines, updatedStations, newRound);

    const existingUnresolved = state.anomalies.filter(a => !a.resolved);
    const allAnomalies = [...existingUnresolved, ...newAnomalies];

    const { ended, reason } = checkGameEnd(updatedStations, newRound, state.maxRounds);

    const onTimeRate = state.totalDepartures > 0
      ? (state.onTimeDepartures + onTimeCount) / (state.totalDepartures + totalCount)
      : 1;
    const totalCapacity = updatedStations.reduce((sum, s) => sum + s.maxCapacity, 0);
    const totalPassengers = updatedStations.reduce((sum, s) => sum + s.passengerFlow, 0);
    const passengerFlowRate = 1 - totalPassengers / totalCapacity;

    const newScore = calculateScore(updatedStations, allAnomalies, onTimeRate, passengerFlowRate);

    set({
      currentRound: newRound,
      timeOfDay: newTime,
      stations: updatedStations,
      buses: updatedBuses,
      anomalies: allAnomalies,
      totalPassengersTransported: state.totalPassengersTransported + transportedPassengers,
      onTimeDepartures: state.onTimeDepartures + onTimeCount,
      totalDepartures: state.totalDepartures + totalCount,
      score: newScore,
      gamePhase: ended ? 'ended' : 'playing',
    });

    if (ended && reason) {
      console.log('游戏结束原因:', reason);
    }
  },

  makeDecision: (decision) => {
    const state = get();
    const newDecision: Decision = {
      ...decision,
      id: `decision-${Date.now()}`,
      round: state.currentRound,
      timestamp: Date.now(),
    };

    set({
      decisions: [...state.decisions, newDecision],
    });
  },

  resolveAnomaly: (anomalyId) => {
    const state = get();
    set({
      anomalies: state.anomalies.map(a =>
        a.id === anomalyId ? { ...a, resolved: true } : a
      ),
    });
  },

  setRoadClosed: (stationId) => {
    set({
      isRoadClosed: stationId !== null,
      closedStationId: stationId,
    });
  },

  forceDispatchBus: (busId) => {
    const state = get();
    set({
      buses: state.buses.map(bus =>
        bus.id === busId ? { ...bus, status: 'running' as const, isOnTime: false } : bus
      ),
    });

    get().makeDecision({
      type: 'dispatch',
      busId,
      description: '强制调度发车',
    });
  },

  assignDriverBreak: (busId) => {
    const state = get();
    const bus = state.buses.find(b => b.id === busId);
    if (!bus) return;

    set({
      buses: state.buses.map(b =>
        b.id === busId ? { ...b, continuousDriving: 0, status: 'stopped' as const } : b
      ),
    });

    get().makeDecision({
      type: 'break',
      busId,
      description: `安排${bus.driverName}休息`,
    });

    setTimeout(() => {
      const currentState = get();
      set({
        buses: currentState.buses.map(b =>
          b.id === busId ? { ...b, status: 'running' as const } : b
        ),
      });
    }, 2000);
  },

  generateReport: () => {
    const state = get();

    const totalCapacity = state.stations.reduce((sum, s) => sum + s.maxCapacity, 0);
    const totalPassengers = state.stations.reduce((sum, s) => sum + s.passengerFlow, 0);
    const passengerFlowRate = 1 - totalPassengers / totalCapacity;

    const onTimeRate = state.totalDepartures > 0
      ? state.onTimeDepartures / state.totalDepartures
      : 1;

    const anomalyResolutionRate = state.anomalies.length > 0
      ? state.anomalies.filter(a => a.resolved).length / state.anomalies.length
      : 1;

    const finalScore = state.score;
    const isWin = finalScore >= 80;

    const suggestions: string[] = [];

    const clusteringIssues = state.anomalies.filter(a => a.type === 'clustering' && !a.resolved);
    if (clusteringIssues.length > 0) {
      suggestions.push('【调度员】优化车辆调度间隔，避免多车同时到站造成扎堆');
    }

    const overtimeIssues = state.anomalies.filter(a => a.type === 'overtime' && !a.resolved);
    if (overtimeIssues.length > 0) {
      suggestions.push('【排班员】合理安排司机轮班，确保连续驾驶不超过4小时');
    }

    const gapIssues = state.anomalies.filter(a => a.type === 'transfer_gap' && !a.resolved);
    if (gapIssues.length > 0) {
      suggestions.push('【线路协调员】协调各线路班次，缩小换乘站衔接间隔');
    }

    if (passengerFlowRate < 0.5) {
      suggestions.push('【调度员】增加高峰时段发车频次，加快客流疏导');
    }

    if (onTimeRate < 0.8) {
      suggestions.push('【全体】加强准点率考核，提升服务可靠性');
    }

    return {
      finalScore,
      passengerFlowRate,
      onTimeRate,
      anomalyResolutionRate,
      anomalies: state.anomalies,
      decisions: state.decisions,
      suggestions,
      isWin,
    };
  },

  resetGame: () => {
    set({
      currentRound: 1,
      maxRounds: 10,
      timeOfDay: 7,
      score: 0,
      stations: [],
      lines: [],
      buses: [],
      anomalies: [],
      decisions: [],
      isRoadClosed: false,
      closedStationId: null,
      totalPassengersTransported: 0,
      onTimeDepartures: 0,
      totalDepartures: 0,
      gamePhase: 'setup',
    });
  },
}));
