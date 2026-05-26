import type { FlightRecord, FlightFrame } from '../types/game';
import { GAME_CONFIG } from '../types/game';

function generateFrames(
  startY: number,
  endY: number,
  platformX: number,
  duration: number,
  options: {
    finalVx?: number;
    finalVy?: number;
    finalAngle?: number;
    driftX?: number;
    fuelUsed?: number;
  } = {}
): FlightFrame[] {
  const frames: FlightFrame[] = [];
  const frameCount = Math.floor(duration * 60);
  const { finalVx = 0.5, finalVy = 3, finalAngle = 3, driftX = 0, fuelUsed = 60 } = options;

  for (let i = 0; i < frameCount; i++) {
    const t = i / frameCount;
    const easeT = t * t * (3 - 2 * t);

    const y = startY + (endY - startY) * easeT;
    const x = platformX + driftX * Math.sin(t * Math.PI);
    const vx = finalVx * t;
    const vy = finalVy * (0.5 + 0.5 * t);
    const angle = finalAngle * Math.sin(t * Math.PI * 0.5);
    const fuel = GAME_CONFIG.MAX_FUEL - fuelUsed * t;
    const thrust = 0.4 + 0.3 * Math.sin(t * Math.PI * 4);

    frames.push({
      timestamp: Date.now() + i * 16,
      rocket: {
        x,
        y,
        vx,
        vy,
        angle,
        angularVelocity: 0.1 * Math.sin(t * 5),
        fuel,
        maxFuel: GAME_CONFIG.MAX_FUEL,
        thrust: thrust * GAME_CONFIG.MAX_THRUST,
        maxThrust: GAME_CONFIG.MAX_THRUST,
      },
      thrustInput: thrust,
    });
  }

  return frames;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLATFORM_X = CANVAS_WIDTH / 2;
const PLATFORM_Y = CANVAS_HEIGHT - 60;

export const normalLanding: FlightRecord = {
  id: 'sample-normal-001',
  startTime: Date.now() - 50000,
  endTime: Date.now() - 45000,
  success: true,
  score: 1568,
  frames: generateFrames(100, PLATFORM_Y - 40, PLATFORM_X, 8, {
    finalVx: 0.8,
    finalVy: 3.5,
    finalAngle: 4,
    driftX: 20,
    fuelUsed: 55,
  }),
  summary: {
    maxAltitude: 450,
    maxVelocity: 8.5,
    fuelUsed: 55,
    flightTime: 8.2,
    landingAccuracy: 92,
    impactSpeed: 3.6,
  },
  createdAt: Date.now() - 50000,
};

export const borderlineLanding: FlightRecord = {
  id: 'sample-borderline-001',
  startTime: Date.now() - 40000,
  endTime: Date.now() - 35000,
  success: true,
  score: 912,
  frames: generateFrames(100, PLATFORM_Y - 40, PLATFORM_X + 45, 10, {
    finalVx: 1.8,
    finalVy: 4.8,
    finalAngle: 12,
    driftX: 50,
    fuelUsed: 82,
  }),
  summary: {
    maxAltitude: 420,
    maxVelocity: 11.2,
    fuelUsed: 82,
    flightTime: 10.5,
    landingAccuracy: 25,
    impactSpeed: 5.1,
  },
  createdAt: Date.now() - 40000,
};

export const failedLanding: FlightRecord = {
  id: 'sample-failed-001',
  startTime: Date.now() - 30000,
  endTime: Date.now() - 25000,
  success: false,
  score: 0,
  failureReason: '下降速度过快！硬着陆风险; 横向速度超标！无法稳定着陆; 姿态失控！火箭倾倒; 偏离着陆平台！任务失败',
  frames: generateFrames(100, PLATFORM_Y - 40, PLATFORM_X + 150, 6, {
    finalVx: 5.5,
    finalVy: 12.5,
    finalAngle: 38,
    driftX: 150,
    fuelUsed: 95,
  }),
  summary: {
    maxAltitude: 380,
    maxVelocity: 15.8,
    fuelUsed: 95,
    flightTime: 6.3,
    landingAccuracy: 0,
    impactSpeed: 13.7,
  },
  createdAt: Date.now() - 30000,
};

export const sampleRecords: FlightRecord[] = [normalLanding, borderlineLanding, failedLanding];

export function getSampleRecords(): FlightRecord[] {
  return JSON.parse(JSON.stringify(sampleRecords));
}

export function getSampleRecordById(id: string): FlightRecord | undefined {
  return sampleRecords.find(r => r.id === id);
}
