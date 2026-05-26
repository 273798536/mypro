import type { RocketState, EnvironmentState, FlightFrame, FlightSummary } from '../types/game';
import { GAME_CONFIG } from '../types/game';
import { calculateLandingAccuracy } from './physics';

export interface ScoreBreakdown {
  baseScore: number;
  fuelBonus: number;
  accuracyBonus: number;
  speedPenalty: number;
  anglePenalty: number;
  totalScore: number;
}

export function calculateScore(
  rocket: RocketState,
  env: EnvironmentState,
  success: boolean
): ScoreBreakdown {
  if (!success) {
    return {
      baseScore: 0,
      fuelBonus: 0,
      accuracyBonus: 0,
      speedPenalty: 0,
      anglePenalty: 0,
      totalScore: 0,
    };
  }

  const baseScore = 1000;

  const fuelBonus = Math.round(rocket.fuel * 5);

  const accuracy = calculateLandingAccuracy(rocket.x, env.platformX, env.platformWidth);
  const accuracyBonus = Math.round(accuracy * 5);

  let speedPenalty = 0;
  const excessVy = Math.max(0, Math.abs(rocket.vy) - GAME_CONFIG.SAFE_LANDING_VY * 0.5);
  const excessVx = Math.max(0, Math.abs(rocket.vx) - GAME_CONFIG.SAFE_LANDING_VX * 0.5);
  speedPenalty = Math.round((excessVy * 30 + excessVx * 50));

  let anglePenalty = 0;
  const excessAngle = Math.max(0, Math.abs(rocket.angle) - GAME_CONFIG.SAFE_LANDING_ANGLE * 0.3);
  anglePenalty = Math.round(excessAngle * 10);

  const totalScore = Math.max(0, baseScore + fuelBonus + accuracyBonus - speedPenalty - anglePenalty);

  return {
    baseScore,
    fuelBonus,
    accuracyBonus,
    speedPenalty,
    anglePenalty,
    totalScore,
  };
}

export function calculateFlightSummary(
  frames: FlightFrame[],
  env: EnvironmentState
): FlightSummary {
  if (frames.length === 0) {
    return {
      maxAltitude: 0,
      maxVelocity: 0,
      fuelUsed: 0,
      flightTime: 0,
      landingAccuracy: 0,
      impactSpeed: 0,
    };
  }

  const groundY = env.groundY;
  let maxAltitude = 0;
  let maxVelocity = 0;

  frames.forEach((frame) => {
    const altitude = groundY - frame.rocket.y;
    maxAltitude = Math.max(maxAltitude, altitude);
    
    const velocity = Math.sqrt(frame.rocket.vx ** 2 + frame.rocket.vy ** 2);
    maxVelocity = Math.max(maxVelocity, velocity);
  });

  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  const fuelUsed = firstFrame.rocket.maxFuel - lastFrame.rocket.fuel;
  const flightTime = (lastFrame.timestamp - firstFrame.timestamp) / 1000;

  const landingAccuracy = calculateLandingAccuracy(
    lastFrame.rocket.x,
    env.platformX,
    env.platformWidth
  );

  const impactSpeed = Math.sqrt(lastFrame.rocket.vx ** 2 + lastFrame.rocket.vy ** 2);

  return {
    maxAltitude,
    maxVelocity,
    fuelUsed,
    flightTime,
    landingAccuracy,
    impactSpeed,
  };
}

export function formatScore(score: number): string {
  return score.toLocaleString();
}

export function getGradeFromScore(score: number): { grade: string; color: string } {
  if (score >= 1800) return { grade: 'S', color: '#ffd700' };
  if (score >= 1500) return { grade: 'A', color: '#00ff88' };
  if (score >= 1200) return { grade: 'B', color: '#00d4ff' };
  if (score >= 900) return { grade: 'C', color: '#ffaa00' };
  if (score >= 600) return { grade: 'D', color: '#ff6b35' };
  return { grade: 'F', color: '#ff4757' };
}
