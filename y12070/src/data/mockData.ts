import type { Turbine, CableRoute, WindCondition, PowerRecord, MaintenancePlan, Scheme } from './types';

const BASE_TIMESTAMP = new Date('2025-06-15T06:00:00').getTime();

export const schemeA: Scheme = {
  id: 'scheme-a',
  name: '方案A：紧密排布',
  turbines: [
    { id: 'T1', x: 0, y: 0, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T2', x: 800, y: 0, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T3', x: 1600, y: 0, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T4', x: 200, y: 600, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T5', x: 1000, y: 600, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T6', x: 1800, y: 600, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T7', x: 400, y: 1200, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T8', x: 1200, y: 1200, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T9', x: 2000, y: 1200, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
  ],
  cables: [
    {
      id: 'C1',
      voltage: '220kV',
      waypoints: [[-200, -200], [0, 0], [800, 0], [1000, 600], [1200, 1200]],
      color: '#FBBF24',
    },
    {
      id: 'C2',
      voltage: '66kV',
      waypoints: [[-200, 1400], [400, 1200], [1000, 600], [1600, 0], [2000, -200]],
      color: '#60A5FA',
    },
  ],
};

export const schemeB: Scheme = {
  id: 'scheme-b',
  name: '方案B：宽松排布',
  turbines: [
    { id: 'T1', x: 0, y: 0, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T2', x: 1200, y: 0, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T3', x: 2400, y: 0, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T4', x: 600, y: 900, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T5', x: 1800, y: 900, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T6', x: 0, y: 1800, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
    { id: 'T7', x: 1200, y: 1800, hubHeight: 120, rotorDiameter: 154, model: 'SG 14-154 DD' },
  ],
  cables: [
    {
      id: 'C1',
      voltage: '220kV',
      waypoints: [[-200, -200], [0, 0], [1200, 0], [1800, 900], [1200, 1800]],
      color: '#FBBF24',
    },
    {
      id: 'C2',
      voltage: '66kV',
      waypoints: [[-200, 2000], [0, 1800], [600, 900], [1200, 0], [2400, -200]],
      color: '#60A5FA',
    },
  ],
};

export const windConditions: WindCondition[] = Array.from({ length: 12 }, (_, i) => {
  const hour = i;
  const baseDir = 225;
  const dirVariation = Math.sin(hour * 0.5) * 20;
  const baseSpeed = 10 + Math.sin(hour * 0.4) * 3;
  return {
    timestamp: BASE_TIMESTAMP + i * 3600000,
    speed: Math.max(3, Math.round((baseSpeed + Math.random() * 2) * 10) / 10),
    direction: Math.round((baseDir + dirVariation + (Math.random() - 0.5) * 10) % 360),
  };
});

export function generatePowerRecords(turbines: Turbine[], windData: WindCondition[]): PowerRecord[] {
  const records: PowerRecord[] = [];
  const ratedPower = 14;

  for (const wind of windData) {
    const windRad = (wind.direction * Math.PI) / 180;
    for (const turbine of turbines) {
      const upstreamCount = turbines.filter((other) => {
        const dx = turbine.x - other.x;
        const dy = turbine.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50 || dist > 2000) return false;
        const angleToOther = Math.atan2(dy, dx);
        const windDirRad = windRad;
        let angleDiff = Math.abs(angleToOther - windDirRad);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        return angleDiff < 0.15;
      }).length;

      const wakeDeficit = upstreamCount * 0.12;
      const effectiveSpeed = wind.speed * (1 - wakeDeficit);
      const cutIn = 3;
      const cutOut = 25;
      const ratedSpeed = 12;

      let power = 0;
      if (effectiveSpeed >= cutIn && effectiveSpeed <= cutOut) {
        if (effectiveSpeed >= ratedSpeed) {
          power = ratedPower;
        } else {
          power = ratedPower * Math.pow((effectiveSpeed - cutIn) / (ratedSpeed - cutIn), 3);
        }
      }

      const noise = (Math.random() - 0.5) * 0.4;
      records.push({
        turbineId: turbine.id,
        timestamp: wind.timestamp,
        powerOutput: Math.max(0, Math.round((power + noise) * 100) / 100),
        windSpeed: effectiveSpeed,
        windDirection: wind.direction,
      });
    }
  }
  return records;
}

export const powerRecords: PowerRecord[] = generatePowerRecords(schemeA.turbines, windConditions);

export const maintenancePlans: MaintenancePlan[] = [
  {
    vesselId: 'V1',
    turbineId: 'T5',
    startTime: BASE_TIMESTAMP + 2 * 3600000,
    endTime: BASE_TIMESTAMP + 5 * 3600000,
    taskType: '叶片检修',
  },
  {
    vesselId: 'V2',
    turbineId: 'T4',
    startTime: BASE_TIMESTAMP + 3 * 3600000,
    endTime: BASE_TIMESTAMP + 6 * 3600000,
    taskType: '齿轮箱更换',
  },
  {
    vesselId: 'V1',
    turbineId: 'T8',
    startTime: BASE_TIMESTAMP + 8 * 3600000,
    endTime: BASE_TIMESTAMP + 11 * 3600000,
    taskType: '定期维护',
  },
];

export const vesselPaths: { vesselId: string; waypoints: [number, number, number][] }[] = [
  {
    vesselId: 'V1',
    waypoints: [
      [-500, 0, -200],
      [0, 0, 0],
      [1000, 0, 600],
      [0, 0, 0],
      [1200, 0, 1200],
      [-500, 0, -200],
    ],
  },
  {
    vesselId: 'V2',
    waypoints: [
      [-500, 0, -200],
      [200, 0, 600],
      [0, 0, 0],
      [-500, 0, -200],
    ],
  },
];

export const TIMESTAMP_LABELS = windConditions.map((w, i) => {
  const d = new Date(w.timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
});

export { BASE_TIMESTAMP };
