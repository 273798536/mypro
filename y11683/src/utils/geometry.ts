import * as THREE from 'three';
import type { FuturesData, CurvePoint3D, TimeWindowGroup } from '../types';

export function groupByTimeWindow(data: FuturesData[]): TimeWindowGroup[] {
  const groups = new Map<string, FuturesData[]>();
  for (const d of data) {
    if (!groups.has(d.timeWindow)) {
      groups.set(d.timeWindow, []);
    }
    groups.get(d.timeWindow)!.push(d);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timeWindow, contracts]) => ({
      timeWindow,
      contracts: contracts.sort((a, b) => a.contractMonth.localeCompare(b.contractMonth)),
    }));
}

export function compute3DPoints(
  groups: TimeWindowGroup[],
  priceRange: [number, number],
  monthRange: [number, number]
): Map<string, CurvePoint3D[]> {
  const result = new Map<string, CurvePoint3D[]>();

  const [minPrice, maxPrice] = priceRange;
  const priceSpan = maxPrice - minPrice || 1;

  groups.forEach((group, zIdx) => {
    const points: CurvePoint3D[] = group.contracts.map((contract, xIdx) => {
      const x = (xIdx / Math.max(monthRange[1] - monthRange[0], 1)) * 80 - 40;
      const y = ((contract.price - minPrice) / priceSpan) * 60 - 30;
      const z = (zIdx / Math.max(groups.length - 1, 1)) * 80 - 40;

      return { x, y, z, data: contract };
    });
    result.set(group.timeWindow, points);
  });

  return result;
}

export function createTubeGeometry(points: CurvePoint3D[], radius: number = 0.4): THREE.BufferGeometry {
  if (points.length < 2) return new THREE.BufferGeometry();

  const vectorPoints = points.map(
    (p) => new THREE.Vector3(p.x, p.y, p.z)
  );

  const curve = new THREE.CatmullRomCurve3(vectorPoints, false, 'catmullrom', 0.5);
  const geometry = new THREE.TubeGeometry(curve, Math.min(points.length * 8, 200), radius, 8, false);

  return geometry;
}

export function computePriceRange(data: FuturesData[]): [number, number] {
  if (data.length === 0) return [0, 100];
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.1 || 10;
  return [min - padding, max + padding];
}

export function computeMonthRange(groups: TimeWindowGroup[]): [number, number] {
  let maxLen = 0;
  for (const g of groups) {
    maxLen = Math.max(maxLen, g.contracts.length);
  }
  return [0, maxLen - 1];
}

export function contractMonthToNumber(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + m;
}

export function getVolumeScale(volume: number, maxVolume: number): number {
  if (maxVolume === 0) return 0.3;
  return 0.3 + (volume / maxVolume) * 0.7;
}

export function basisToColor(basis: number, maxAbsBasis: number): THREE.Color {
  const t = Math.max(-1, Math.min(1, basis / (maxAbsBasis || 1)));
  if (t >= 0) {
    return new THREE.Color().lerpColors(
      new THREE.Color('#3B82F6'),
      new THREE.Color('#2ED573'),
      t
    );
  } else {
    return new THREE.Color().lerpColors(
      new THREE.Color('#3B82F6'),
      new THREE.Color('#FF4757'),
      Math.abs(t)
    );
  }
}

export function createAxesLabels(
  groups: TimeWindowGroup[],
  priceRange: [number, number]
): {
  xLabels: { text: string; position: [number, number, number] }[];
  yLabels: { text: string; position: [number, number, number] }[];
  zLabels: { text: string; position: [number, number, number] }[];
} {
  const xLabels: { text: string; position: [number, number, number] }[] = [];
  const yLabels: { text: string; position: [number, number, number] }[] = [];
  const zLabels: { text: string; position: [number, number, number] }[] = [];

  const maxGroupLen = Math.max(...groups.map((g) => g.contracts.length));
  for (let i = 0; i < maxGroupLen; i++) {
    const contract = groups.find((g) => g.contracts.length > i)?.contracts[i];
    if (contract) {
      xLabels.push({
        text: contract.contractMonth,
        position: [(i / Math.max(maxGroupLen - 1, 1)) * 80 - 40, -35, -42],
      });
    }
  }

  const [minP, maxP] = priceRange;
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const price = minP + ((maxP - minP) * i) / ySteps;
    yLabels.push({
      text: price.toFixed(0),
      position: [-45, (i / ySteps) * 60 - 30, -42],
    });
  }

  groups.forEach((group, i) => {
    zLabels.push({
      text: group.timeWindow,
      position: [-45, -35, (i / Math.max(groups.length - 1, 1)) * 80 - 40],
    });
  });

  return { xLabels, yLabels, zLabels };
}