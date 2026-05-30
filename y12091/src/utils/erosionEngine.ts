import { RiverSection, FlowData, SedimentData, CalculationParams, CalculationResult } from '../types';

function interpolateLinear(x: number, x1: number, y1: number, x2: number, y2: number): number {
  if (x1 === x2) return y1;
  return y1 + (y2 - y1) * ((x - x1) / (x2 - x1));
}

function getValueAtTime<T extends { timestamp: number }>(
  data: T[],
  timestamp: number,
  field: keyof T
): number {
  if (data.length === 0) return 0;

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

  if (timestamp <= sorted[0].timestamp) {
    return sorted[0][field] as unknown as number;
  }
  if (timestamp >= sorted[sorted.length - 1].timestamp) {
    return sorted[sorted.length - 1][field] as unknown as number;
  }

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp >= timestamp) {
      return interpolateLinear(
        timestamp,
        sorted[i - 1].timestamp,
        sorted[i - 1][field] as unknown as number,
        sorted[i].timestamp,
        sorted[i][field] as unknown as number
      );
    }
  }

  return 0;
}

function calculateSectionArea(coordinates: [number, number, number][], waterLevel: number): number {
  if (coordinates.length < 2) return 0;

  let area = 0;
  const wetCoords = coordinates.map(c => [c[0], Math.min(c[2], waterLevel)] as [number, number]);

  for (let i = 1; i < wetCoords.length; i++) {
    const dx = wetCoords[i][0] - wetCoords[i - 1][0];
    const avgHeight = waterLevel - (wetCoords[i][1] + wetCoords[i - 1][1]) / 2;
    area += dx * Math.max(0, avgHeight);
  }

  return Math.abs(area);
}

function calculateHydraulicRadius(
  coordinates: [number, number, number][],
  waterLevel: number,
  area: number
): number {
  if (area <= 0) return 0;

  let wettedPerimeter = 0;
  for (let i = 1; i < coordinates.length; i++) {
    if (coordinates[i][2] < waterLevel || coordinates[i - 1][2] < waterLevel) {
      const dx = coordinates[i][0] - coordinates[i - 1][0];
      const dz = coordinates[i][2] - coordinates[i - 1][2];
      wettedPerimeter += Math.sqrt(dx * dx + dz * dz);
    }
  }

  return wettedPerimeter > 0 ? area / wettedPerimeter : 0;
}

function calculateShearVelocity(flow: number, area: number, hydraulicRadius: number): number {
  if (area <= 0 || hydraulicRadius <= 0) return 0;

  const gravity = 9.81;
  const velocity = flow / area;
  const frictionSlope = 0.001;

  return Math.sqrt(gravity * hydraulicRadius * frictionSlope);
}

function calculateCriticalShearStress(particleSize: number): number {
  const gravity = 9.81;
  const sedimentDensity = 2650;
  const waterDensity = 1000;
  const s = sedimentDensity / waterDensity;
  const shieldsParameter = 0.03;

  return shieldsParameter * (sedimentDensity - waterDensity) * gravity * particleSize;
}

export function calculateErosionDeposition(
  sections: RiverSection[],
  flowData: FlowData[],
  sedimentData: SedimentData[],
  params: CalculationParams,
  timeRange: [number, number]
): CalculationResult {
  const hourMs = 3600 * 1000;
  const timeStep = params.timeStep * hourMs;
  const timestamps: number[] = [];
  const sedimentTransport: number[] = [];

  for (let t = timeRange[0]; t <= timeRange[1]; t += timeStep) {
    timestamps.push(t);
  }

  const sectionElevations: Record<string, number[]> = {};
  const bedChanges: Record<string, number[]> = {};
  let totalErosion = 0;
  let totalDeposition = 0;

  const flowBySection = flowData.reduce((acc, d) => {
    if (!acc[d.sectionId]) acc[d.sectionId] = [];
    acc[d.sectionId].push(d);
    return acc;
  }, {} as Record<string, FlowData[]>);

  const sedimentBySection = sedimentData.reduce((acc, d) => {
    if (!acc[d.sectionId]) acc[d.sectionId] = [];
    acc[d.sectionId].push(d);
    return acc;
  }, {} as Record<string, SedimentData[]>);

  const sortedSections = [...sections].sort((a, b) => a.chainage - b.chainage);

  sortedSections.forEach((section) => {
    const initialElevations = section.coordinates.map(c => c[2]);
    sectionElevations[section.id] = [...initialElevations];
    bedChanges[section.id] = new Array(initialElevations.length).fill(0);
  });

  timestamps.forEach((timestamp, timeIdx) => {
    let totalTransport = 0;

    sortedSections.forEach((section, sectionIdx) => {
      const sectionFlows = flowBySection[section.id] || [];
      const sectionSediments = sedimentBySection[section.id] || [];

      const flow = getValueAtTime(sectionFlows, timestamp, 'flow') * params.flowMultiplier;
      const waterLevel = getValueAtTime(sectionFlows, timestamp, 'waterLevel');
      const concentration = getValueAtTime(sectionSediments, timestamp, 'concentration') * params.sedimentMultiplier;
      const particleSize = getValueAtTime(sectionSediments, timestamp, 'particleSize');

      const coords = section.coordinates.map((c, i) => [c[0], c[1], sectionElevations[section.id][i]] as [number, number, number]);
      const area = calculateSectionArea(coords, waterLevel);
      const hydraulicRadius = calculateHydraulicRadius(coords, waterLevel, area);
      const shearVelocity = calculateShearVelocity(flow, area, hydraulicRadius);
      const criticalShearStress = calculateCriticalShearStress(particleSize);

      const waterDensity = 1000;
      const shearStress = waterDensity * shearVelocity * shearVelocity;

      const equilibriumConcentration = shearStress > criticalShearStress
        ? 0.01 * Math.pow(shearStress - criticalShearStress, 0.5)
        : 0;

      const concentrationDiff = concentration - equilibriumConcentration;

      coords.forEach((coord, pointIdx) => {
        const depth = waterLevel - coord[2];
        if (depth <= 0) return;

        let change = 0;

        if (concentrationDiff < 0) {
          change = params.erosionCoefficient * (criticalShearStress - shearStress) * (timeStep / hourMs);
          totalErosion += Math.abs(change);
        } else if (concentrationDiff > 0) {
          change = -params.depositionCoefficient * concentrationDiff * (timeStep / hourMs);
          totalDeposition += Math.abs(change);
        }

        const distanceFromCenter = Math.abs(coord[0]);
        const centerFactor = Math.max(0, 1 - distanceFromCenter / 50);
        change *= centerFactor * centerFactor;

        sectionElevations[section.id][pointIdx] += change;
        bedChanges[section.id][pointIdx] += change;
      });

      totalTransport += flow * concentration;
    });

    sedimentTransport.push(totalTransport);
  });

  return {
    sectionElevations,
    erosionVolume: totalErosion,
    depositionVolume: totalDeposition,
    sedimentTransport,
    timestamps,
    bedChanges,
  };
}

export function getElevationColor(change: number, maxAbsChange: number): string {
  const normalized = maxAbsChange > 0 ? Math.max(-1, Math.min(1, change / maxAbsChange)) : 0;

  if (normalized > 0.01) {
    const intensity = Math.min(1, normalized * 2);
    return `rgb(${Math.round(239 * intensity + 100 * (1 - intensity))}, ${Math.round(68 * intensity + 180 * (1 - intensity))}, ${Math.round(68 * intensity + 180 * (1 - intensity))})`;
  } else if (normalized < -0.01) {
    const intensity = Math.min(1, Math.abs(normalized) * 2);
    return `rgb(${Math.round(16 * intensity + 100 * (1 - intensity))}, ${Math.round(185 * intensity + 180 * (1 - intensity))}, ${Math.round(129 * intensity + 180 * (1 - intensity))})`;
  }

  return 'rgb(148, 163, 184)';
}

export function calculatePlanDifference(
  plan1: CalculationResult,
  plan2: CalculationResult
): {
  erosionDiff: number;
  depositionDiff: number;
  sectionDiffs: Record<string, number[]>;
} {
  const erosionDiff = plan2.erosionVolume - plan1.erosionVolume;
  const depositionDiff = plan2.depositionVolume - plan1.depositionVolume;

  const sectionDiffs: Record<string, number[]> = {};

  Object.keys(plan1.bedChanges).forEach((sectionId) => {
    const changes1 = plan1.bedChanges[sectionId] || [];
    const changes2 = plan2.bedChanges[sectionId] || [];

    sectionDiffs[sectionId] = changes1.map((c1, i) => (changes2[i] || 0) - c1);
  });

  return {
    erosionDiff,
    depositionDiff,
    sectionDiffs,
  };
}

export function getTimeSeriesData(
  sections: RiverSection[],
  flowData: FlowData[],
  sedimentData: SedimentData[],
  result: CalculationResult,
  sectionId?: string
): Array<{
  time: number;
  flow: number;
  sediment: number;
  erosion: number;
  deposition: number;
}> {
  const targetSectionId = sectionId || sections[0]?.id;
  if (!targetSectionId) return [];

  const flowBySection = flowData.reduce((acc, d) => {
    if (!acc[d.sectionId]) acc[d.sectionId] = [];
    acc[d.sectionId].push(d);
    return acc;
  }, {} as Record<string, FlowData[]>);

  const sedimentBySection = sedimentData.reduce((acc, d) => {
    if (!acc[d.sectionId]) acc[d.sectionId] = [];
    acc[d.sectionId].push(d);
    return acc;
  }, {} as Record<string, SedimentData[]>);

  const sectionFlows = flowBySection[targetSectionId] || [];
  const sectionSediments = sedimentBySection[targetSectionId] || [];

  return result.timestamps.map((timestamp, idx) => ({
    time: timestamp,
    flow: getValueAtTime(sectionFlows, timestamp, 'flow'),
    sediment: getValueAtTime(sectionSediments, timestamp, 'concentration'),
    erosion: result.erosionVolume * (idx / result.timestamps.length),
    deposition: result.depositionVolume * (idx / result.timestamps.length),
  }));
}
