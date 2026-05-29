import { Station, Bus, BusLine, Anomaly } from '../types';

export function detectClustering(buses: Bus[], stations: Station[], round: number): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const stationBusCount: Record<string, Bus[]> = {};

  buses.forEach(bus => {
    if (bus.status === 'broken') return;
    const stationId = stations.find((_, i) => i === bus.currentStationIndex)?.id;
    if (stationId) {
      if (!stationBusCount[stationId]) stationBusCount[stationId] = [];
      stationBusCount[stationId].push(bus);
    }
  });

  Object.entries(stationBusCount).forEach(([stationId, stationBuses]) => {
    if (stationBuses.length >= 3) {
      const station = stations.find(s => s.id === stationId);
      anomalies.push({
        id: `cluster-${stationId}-${round}`,
        type: 'clustering',
        severity: stationBuses.length >= 4 ? 'critical' : 'warning',
        description: `${station?.name || stationId}同时有${stationBuses.length}辆车停靠，造成车辆扎堆`,
        responsibleRole: '调度员',
        busIds: stationBuses.map(b => b.id),
        stationId,
        suggestion: `建议立即分流：调度${stationBuses.slice(0, 2).map(b => b.plateNumber).join('、')}尽快发车，后续车辆适当推迟到站时间`,
        resolved: false,
        roundDetected: round,
      });
    }
  });

  return anomalies;
}

export function detectOvertime(buses: Bus[], round: number): Anomaly[] {
  const anomalies: Anomaly[] = [];

  buses.forEach(bus => {
    if (bus.continuousDriving > 4 && bus.status !== 'broken') {
      anomalies.push({
        id: `overtime-${bus.id}-${round}`,
        type: 'overtime',
        severity: bus.continuousDriving > 5 ? 'critical' : 'warning',
        description: `${bus.driverName}驾驶${bus.plateNumber}已连续工作${bus.continuousDriving.toFixed(1)}小时，超过4小时规定`,
        responsibleRole: '排班员',
        busIds: [bus.id],
        suggestion: `立即安排${bus.driverName}休息至少30分钟，请联系排班员调整${bus.plateNumber}的后续班次`,
        resolved: false,
        roundDetected: round,
      });
    }
  });

  return anomalies;
}

export function detectTransferGap(buses: Bus[], lines: BusLine[], stations: Station[], round: number): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const transferStations = stations.filter(s => s.isTransfer);

  transferStations.forEach(station => {
    const lineBuses: Record<string, Bus[]> = {};

    station.connectedLines.forEach(lineId => {
      const lineBusesForStation = buses.filter(
        bus => bus.lineId === lineId &&
          bus.status === 'running' &&
          Math.abs(bus.currentStationIndex - lines.find(l => l.id === lineId)?.stations.indexOf(station.id)!) <= 1
      );
      if (lineBusesForStation.length > 0) {
        lineBuses[lineId] = lineBusesForStation;
      }
    });

    const lineIds = Object.keys(lineBuses);
    if (lineIds.length >= 2) {
      const arrivalTimes = lineIds.map(lineId => {
        const nearestBus = lineBuses[lineId][0];
        const line = lines.find(l => l.id === lineId);
        const stationIndex = line?.stations.indexOf(station.id) || 0;
        const distance = Math.abs(nearestBus.currentStationIndex - stationIndex);
        return { lineId, timeToArrival: distance * 5 };
      });

      arrivalTimes.sort((a, b) => a.timeToArrival - b.timeToArrival);

      for (let i = 0; i < arrivalTimes.length - 1; i++) {
        const gap = arrivalTimes[i + 1].timeToArrival - arrivalTimes[i].timeToArrival;
        if (gap > 15) {
          anomalies.push({
            id: `gap-${station.id}-${round}-${i}`,
            type: 'transfer_gap',
            severity: gap > 20 ? 'critical' : 'warning',
            description: `${station.name}换乘站${lines.find(l => l.id === arrivalTimes[i].lineId)?.name}与${lines.find(l => l.id === arrivalTimes[i + 1].lineId)?.name}衔接间隔${gap}分钟，超过15分钟标准`,
            responsibleRole: '线路协调员',
            busIds: lineBuses[arrivalTimes[i + 1].lineId].map(b => b.id),
            stationId: station.id,
            suggestion: `请联系线路协调员，加快${lines.find(l => l.id === arrivalTimes[i + 1].lineId)?.name}后续车辆的调度，缩小换乘间隔`,
            resolved: false,
            roundDetected: round,
          });
        }
      }
    }
  });

  return anomalies;
}

export function detectOverload(stations: Station[], round: number): Anomaly[] {
  const anomalies: Anomaly[] = [];

  stations.forEach(station => {
    const loadRate = station.passengerFlow / station.maxCapacity;
    if (loadRate > 0.9) {
      anomalies.push({
        id: `overload-${station.id}-${round}`,
        type: 'overload',
        severity: loadRate > 1.0 ? 'critical' : 'warning',
        description: `${station.name}客流${station.passengerFlow}人，达到容量的${(loadRate * 100).toFixed(0)}%${station.consecutiveOverload >= 2 ? '，已连续3回合超载' : ''}`,
        responsibleRole: '调度员',
        busIds: [],
        stationId: station.id,
        suggestion: `立即增派经过${station.name}的车辆，建议调度附近空车前往接驳`,
        resolved: false,
        roundDetected: round,
      });
    }
  });

  return anomalies;
}

export function detectAllAnomalies(
  buses: Bus[],
  lines: BusLine[],
  stations: Station[],
  round: number
): Anomaly[] {
  return [
    ...detectClustering(buses, stations, round),
    ...detectOvertime(buses, round),
    ...detectTransferGap(buses, lines, stations, round),
    ...detectOverload(stations, round),
  ];
}
