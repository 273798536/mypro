import { useGameStore } from '../store/useGameStore';
import { levels } from '../data/levels';
import { Station } from '../types';

const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

const getStationPosition = (stations: Station[], stationId: string) => {
  const station = stations.find((s) => s.id === stationId);
  return station ? { x: station.x, y: station.y } : { x: 0, y: 0 };
};

const getTravelTime = (
  stations: Station[],
  fromStationId: string,
  toStationId: string,
  baseSpeed: number = 30
): number => {
  const from = getStationPosition(stations, fromStationId);
  const to = getStationPosition(stations, toStationId);
  const distance = getDistance(from.x, from.y, to.x, to.y);
  return Math.max(5, Math.floor(distance / baseSpeed));
};

export const updateVehiclePositions = (deltaTime: number) => {
  const state = useGameStore.getState();
  const { stations, routes, updateVehicles, updateStats, addAnomaly, setScore, totalScore, setSatisfaction, satisfaction } = state;

  const updatedVehicles = state.vehicles.map((vehicle) => {
    if (vehicle.status === 'stopped') return vehicle;

    const route = routes.find((r) => r.id === vehicle.routeId);
    if (!route || route.status === 'suspended') return vehicle;

    const currentStationId = route.stations[vehicle.currentStationIndex];
    const nextStationIndex = (vehicle.currentStationIndex + 1) % route.stations.length;
    const nextStationId = route.stations[nextStationIndex];

    const nextStation = stations.find((s) => s.id === nextStationId);

    if (nextStation?.isBlocked) {
      addAnomaly({
        type: 'skip_station',
        routeId: route.id,
        stationId: nextStationId,
        vehicleId: vehicle.id,
        timestamp: state.gameTime,
        scoreImpact: 5,
        description: `${route.name} 在 ${nextStation.name} 跳站`,
        resolved: false,
      });
      setScore(totalScore - 5);
      setSatisfaction(satisfaction - 3);

      return {
        ...vehicle,
        currentStationIndex: nextStationIndex,
        nextStationTime: getTravelTime(stations, nextStationId, route.stations[(nextStationIndex + 1) % route.stations.length]),
        progress: 0,
      };
    }

    const newNextStationTime = vehicle.nextStationTime - deltaTime;
    const travelTime = getTravelTime(stations, currentStationId, nextStationId);
    const progress = 1 - newNextStationTime / travelTime;

    if (newNextStationTime <= 0) {
      const passengersChange = Math.floor((nextStation?.passengerFlow || 1) * (Math.random() * 0.5 + 0.5) * 10);
      const newPassengers = Math.min(vehicle.capacity, Math.max(0, vehicle.passengers + passengersChange - 5));

      updateStats((stats) => ({
        ...stats,
        totalArrivals: stats.totalArrivals + 1,
        onTimeArrivals: vehicle.delayTime < 10 ? stats.onTimeArrivals + 1 : stats.onTimeArrivals,
        totalStopsServed: stats.totalStopsServed + 1,
        totalPassengersServed: stats.totalPassengersServed + Math.abs(passengersChange),
      }));

      if (vehicle.delayTime > 30) {
        addAnomaly({
          type: 'detour_timeout',
          routeId: route.id,
          stationId: nextStationId,
          vehicleId: vehicle.id,
          timestamp: state.gameTime,
          scoreImpact: 4,
          description: `${route.name} ${vehicle.plateNumber} 延误 ${Math.floor(vehicle.delayTime)}秒`,
          resolved: false,
        });
        setScore(totalScore - 4);
      }

      if (newPassengers >= vehicle.capacity * 0.9) {
        addAnomaly({
          type: 'overcrowding',
          routeId: route.id,
          vehicleId: vehicle.id,
          timestamp: state.gameTime,
          scoreImpact: 3,
          description: `${route.name} ${vehicle.plateNumber} 车辆满载`,
          resolved: false,
        });
        setSatisfaction(satisfaction - 2);
      }

      return {
        ...vehicle,
        currentStationIndex: nextStationIndex,
        nextStationTime: getTravelTime(stations, nextStationId, route.stations[(nextStationIndex + 1) % route.stations.length]),
        passengers: newPassengers,
        progress: 0,
        delayTime: Math.max(0, vehicle.delayTime - 5),
      };
    }

    return {
      ...vehicle,
      nextStationTime: newNextStationTime,
      progress: Math.max(0, Math.min(1, progress)),
    };
  });

  updateVehicles(() => updatedVehicles);
};

export const checkIntervalImbalance = () => {
  const state = useGameStore.getState();
  const { routes, vehicles, addAnomaly, setScore, totalScore } = state;

  routes.forEach((route) => {
    if (route.status === 'suspended') return;

    const routeVehicles = vehicles.filter((v) => v.routeId === route.id && v.status !== 'stopped');
    if (routeVehicles.length < 2) return;

    const positions = routeVehicles.map((v) => {
      const stationProgress = v.currentStationIndex + v.progress;
      return stationProgress;
    }).sort((a, b) => a - b);

    const totalStations = route.stations.length;
    const expectedInterval = totalStations / routeVehicles.length;

    for (let i = 0; i < positions.length; i++) {
      const nextPos = positions[(i + 1) % positions.length];
      const gap = i === positions.length - 1
        ? (nextPos + totalStations - positions[i])
        : (nextPos - positions[i]);

      if (gap > expectedInterval * 1.8 || gap < expectedInterval * 0.3) {
        const existingAnomaly = state.anomalies.find(
          (a) => a.routeId === route.id && a.type === 'interval_imbalance' && !a.resolved
        );
        if (!existingAnomaly) {
          addAnomaly({
            type: 'interval_imbalance',
            routeId: route.id,
            timestamp: state.gameTime,
            scoreImpact: 3,
            description: `${route.name} 发车间隔失衡`,
            resolved: false,
          });
          setScore(totalScore - 3);
        }
        break;
      }
    }
  });
};

export const processEvents = () => {
  const state = useGameStore.getState();
  const { gameTime, events, updateStations, resolveEvent } = state;
  const level = levels.find((l) => l.id === state.level);

  if (!level) return;

  level.eventSchedule.forEach((scheduledEvent) => {
    if (scheduledEvent.startTime <= gameTime && gameTime < scheduledEvent.startTime + 0.1) {
      const existingEvent = events.find(
        (e) => e.title === scheduledEvent.title && !e.resolved
      );
      if (!existingEvent) {
        useGameStore.getState().addEvent(scheduledEvent);

        if (scheduledEvent.type === 'roadblock') {
          updateStations((prevStations) =>
            prevStations.map((s) =>
              scheduledEvent.affectedArea.includes(s.id)
                ? { ...s, isBlocked: true }
                : s
            )
          );
        }
      }
    }
  });

  events.forEach((event) => {
    if (!event.resolved && gameTime >= event.startTime + event.duration) {
      resolveEvent(event.id);

      if (event.type === 'roadblock') {
        updateStations((prevStations) =>
          prevStations.map((s) =>
            event.affectedArea.includes(s.id)
              ? { ...s, isBlocked: false }
              : s
          )
        );
      }
    }
  });
};

export const calculateScore = () => {
  const state = useGameStore.getState();
  const { stats, anomalies, updateScoreBreakdown, setScore } = state;

  const punctualityScore = stats.totalArrivals > 0
    ? Math.floor((stats.onTimeArrivals / stats.totalArrivals) * 30)
    : 30;

  const coverageScore = stats.totalStopsServed + stats.totalStopsMissed > 0
    ? Math.floor((stats.totalStopsServed / (stats.totalStopsServed + stats.totalStopsMissed)) * 20)
    : 20;

  const satisfactionScore = Math.floor(state.satisfaction * 0.25);

  const efficiencyScore = stats.normalDistance > 0
    ? Math.floor((1 - Math.min(1, stats.detourDistance / (stats.normalDistance * 0.5))) * 15)
    : 15;

  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved).length;
  const responseScore = Math.max(0, 10 - unresolvedAnomalies * 2);

  const totalPenalty = anomalies.reduce((sum, a) => sum + a.scoreImpact, 0);

  const totalScore = Math.max(0,
    punctualityScore + coverageScore + satisfactionScore + efficiencyScore + responseScore - Math.floor(totalPenalty * 0.5)
  );

  updateScoreBreakdown((prev) => ({
    punctuality: {
      ...prev.punctuality,
      score: punctualityScore,
      details: [`准点到站 ${stats.onTimeArrivals}/${stats.totalArrivals} 次`],
    },
    coverage: {
      ...prev.coverage,
      score: coverageScore,
      details: [`服务站点 ${stats.totalStopsServed} 个`],
    },
    satisfaction: {
      ...prev.satisfaction,
      score: satisfactionScore,
      details: [`乘客满意度 ${state.satisfaction.toFixed(1)}%`],
    },
    efficiency: {
      ...prev.efficiency,
      score: efficiencyScore,
      details: [`绕行里程 ${stats.detourDistance.toFixed(0)}`],
    },
    response: {
      ...prev.response,
      score: responseScore,
      details: [`未处理异常 ${unresolvedAnomalies} 个`],
    },
    penalties: {
      total: totalPenalty,
      details: anomalies.map((a) => `${a.description} 扣${a.scoreImpact}分`),
    },
  }));

  setScore(totalScore);
};

export const gameLoop = (deltaTime: number) => {
  const state = useGameStore.getState();

  if (state.status !== 'playing') return;

  const scaledDelta = deltaTime * state.speed;

  state.updateGameTime(scaledDelta);
  updateVehiclePositions(scaledDelta);
  checkIntervalImbalance();
  processEvents();
  calculateScore();

  if (state.gameTime >= state.gameDuration) {
    state.endGame();
  }

  if (state.realTime % 2 < scaledDelta) {
    state.saveHistory();
  }
};
