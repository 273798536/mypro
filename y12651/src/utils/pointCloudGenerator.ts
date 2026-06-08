import type { Point3D, FrameData } from '@/types';
import { genId } from './storage';

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makePoint(
  x: number,
  y: number,
  z: number,
  intensity: number,
  isOutlier: boolean,
  frame: number
): Point3D {
  return {
    id: genId('p_'),
    x,
    y,
    z,
    intensity,
    isOutlier,
    originalFrame: frame,
  };
}

export function generatePointCloudFrame(frameIndex: number, totalFrames: number): Point3D[] {
  const rand = seededRandom(frameIndex * 1000 + 7);
  const points: Point3D[] = [];
  const t = frameIndex / totalFrames;

  const mainRadius = 2.2 + Math.sin(t * Math.PI * 2) * 0.3;
  const mainHeight = 3.5 + Math.cos(t * Math.PI * 1.5) * 0.4;

  const mainPoints = 350;
  for (let i = 0; i < mainPoints; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = rand() * Math.PI;
    const r = mainRadius * (0.85 + rand() * 0.3);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = (rand() - 0.5) * mainHeight;
    const intensity = 0.6 + rand() * 0.4;
    points.push(makePoint(x, y, z, intensity, false, frameIndex));
  }

  const slabY = Math.sin(t * Math.PI) * 0.8;
  for (let i = 0; i < 80; i++) {
    const x = (rand() - 0.5) * 4.5;
    const y = slabY + (rand() - 0.5) * 0.25;
    const z = (rand() - 0.5) * 4.5;
    const intensity = 0.7 + rand() * 0.3;
    points.push(makePoint(x, y, z, intensity, false, frameIndex));
  }

  for (let i = 0; i < 30; i++) {
    const theta = rand() * Math.PI * 2;
    const r = 0.3 + rand() * 0.4;
    const x = r * Math.cos(theta) + Math.sin(t * 3) * 1.2;
    const y = 0.9 + rand() * 0.15;
    const z = r * Math.sin(theta) + Math.cos(t * 2.5) * 1.0;
    const intensity = 0.55 + rand() * 0.25;
    points.push(makePoint(x, y, z, intensity, false, frameIndex));
  }

  const noiseCount = 40;
  for (let i = 0; i < noiseCount; i++) {
    const x = (rand() - 0.5) * 8;
    const y = (rand() - 0.5) * 6;
    const z = (rand() - 0.5) * 8;
    const intensity = 0.3 + rand() * 0.3;
    points.push(makePoint(x, y, z, intensity, false, frameIndex));
  }

  const outlierCount = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < outlierCount; i++) {
    const direction = Math.floor(rand() * 6);
    let x = 0, y = 0, z = 0;
    const distance = 3.8 + rand() * 2.5;
    switch (direction) {
      case 0: x = distance; break;
      case 1: x = -distance; break;
      case 2: y = distance; break;
      case 3: y = -distance; break;
      case 4: z = distance; break;
      case 5: z = -distance; break;
    }
    x += (rand() - 0.5) * 1.2;
    y += (rand() - 0.5) * 1.2;
    z += (rand() - 0.5) * 1.2;
    const intensity = 0.15 + rand() * 0.25;
    points.push(makePoint(x, y, z, intensity, true, frameIndex));
  }

  if (frameIndex === 8 || frameIndex === 15 || frameIndex === 22) {
    for (let i = 0; i < 3; i++) {
      points.push(makePoint(
        5.5 + rand() * 1.5,
        (rand() - 0.5) * 2,
        (rand() - 0.5) * 2,
        0.85,
        true,
        frameIndex
      ));
    }
  }

  return points;
}

export function generateFrames(totalFrames = 30): FrameData[] {
  const frames: FrameData[] = [];
  const baseTime = Date.now() - totalFrames * 100;

  for (let i = 0; i < totalFrames; i++) {
    let syncStatus: FrameData['syncStatus'] = 'synced';
    let syncOffsetMs = 0;

    if (i === 10) {
      syncStatus = 'delayed';
      syncOffsetMs = 280;
    } else if (i === 18) {
      syncStatus = 'skipped';
      syncOffsetMs = 0;
    } else if (i === 25) {
      syncStatus = 'offset';
      syncOffsetMs = -180;
    }

    frames.push({
      frameIndex: i,
      timestamp: baseTime + i * 100 + (syncOffsetMs || 0),
      points: generatePointCloudFrame(i, totalFrames),
      syncStatus,
      syncOffsetMs: syncOffsetMs || undefined,
    });
  }

  return frames;
}

export function getDefaultSectionParams() {
  return {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    normalX: 0,
    normalY: 1,
    normalZ: 0,
    thickness: 0.35,
    timeOffset: 0,
  };
}
