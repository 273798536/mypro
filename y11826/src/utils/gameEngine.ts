import { Station, Bus, BusLine } from '../types';

export function simulatePassengerGrowth(stations: Station[], timeOfDay: number): Station[] {
  const morningRushStart = 7;
  const morningRushEnd = 9;
  const rushHourFactor = timeOfDay >= morningRushStart && timeOfDay <= morningRushEnd ? 1.5 : 1;

  return stations.map(station => {
    const baseGrowth = station.isTransfer ? 8 : 5;
    const growth = Math.floor(baseGrowth * rushHourFactor * (0.8 + Math.random() * 0.4));
    const newFlow = Math.min(station.passengerFlow + growth, station.maxCapacity * 1.2);
    const isOverloaded = newFlow > station.maxCapacity;

    return {
      ...station,
      passengerFlow: newFlow,
      consecutiveOverload: isOverloaded ? station.consecutiveOverload + 1 : 0,
    };
  });
}

export function moveBuses(
  buses: Bus[],
  lines: BusLine[],
  stations: Station[]
): { buses: Bus[]; transportedPassengers: number; onTimeCount: number; totalCount: number } {
  let transportedPassengers = 0;
  let onTimeCount = 0;
  let totalCount = 0;

  const updatedBuses = buses.map(bus => {
    if (bus.status === 'broken') return bus;

    const line = lines.find(l => l.id === bus.lineId);
    if (!line) return bus;

    totalCount++;

    const stationIndex = bus.currentStationIndex;
    const stationId = line.stations[stationIndex];
    const station = stations.find(s => s.id === stationId);

    let newPassengerCount = bus.passengerCount;
    if (station) {
      const alighting = Math.floor(bus.passengerCount * (0.2 + Math.random() * 0.2));
      const boarding = Math.min(
        Math.floor(station.passengerFlow * (0.3 + Math.random() * 0.3)),
        bus.maxPassengers - newPassengerCount + alighting
      );

      newPassengerCount = newPassengerCount - alighting + boarding;
      transportedPassengers += boarding;
    }

    let nextStationIndex = stationIndex;
    if (bus.direction === 'forward') {
      nextStationIndex = Math.min(stationIndex + 1, line.stations.length - 1);
    } else {
      nextStationIndex = Math.max(stationIndex - 1, 0);
    }

    let newDirection = bus.direction;
    if (nextStationIndex === line.stations.length - 1 && bus.direction === 'forward') {
      newDirection = 'backward';
    } else if (nextStationIndex === 0 && bus.direction === 'backward') {
      newDirection = 'forward';
    }

    const isOnTime = Math.random() > 0.2;
    if (isOnTime) onTimeCount++;

    return {
      ...bus,
      currentStationIndex: nextStationIndex,
      direction: newDirection,
      passengerCount: newPassengerCount,
      continuousDriving: bus.continuousDriving + 0.5,
      lastDepartureTime: Date.now(),
      isOnTime,
    };
  });

  return { buses: updatedBuses, transportedPassengers, onTimeCount, totalCount };
}

export function calculateScore(
  stations: Station[],
  anomalies: { resolved: boolean }[],
  onTimeRate: number,
  passengerFlowRate: number
): number {
  const avgLoadRate = stations.reduce((sum, s) => sum + (s.passengerFlow / s.maxCapacity), 0) / stations.length;
  const loadScore = Math.max(0, 100 - avgLoadRate * 50);

  const anomalyRate = anomalies.length > 0
    ? anomalies.filter(a => a.resolved).length / anomalies.length
    : 1;

  const score = passengerFlowRate * 40 + onTimeRate * 30 + anomalyRate * 30 + (loadScore / 100) * 0;

  return Math.round(score);
}

export function checkGameEnd(stations: Station[], currentRound: number, maxRounds: number): { ended: boolean; reason?: string } {
  if (currentRound >= maxRounds) {
    return { ended: true, reason: '已完成所有回合' };
  }

  const criticalOverload = stations.find(s => s.consecutiveOverload >= 3);
  if (criticalOverload) {
    return { ended: true, reason: `${criticalOverload.name}连续3回合客流超载` };
  }

  return { ended: false };
}
