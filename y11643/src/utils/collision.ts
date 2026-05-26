import type { RocketState, EnvironmentState, CollisionResult } from '../types/game';
import { GAME_CONFIG, FAILURE_REASONS } from '../types/game';

export function checkCollision(
  rocket: RocketState,
  env: EnvironmentState
): CollisionResult {
  const rocketBottom = rocket.y + GAME_CONFIG.ROCKET_HEIGHT / 2;
  const rocketLeft = rocket.x - GAME_CONFIG.ROCKET_WIDTH / 2;
  const rocketRight = rocket.x + GAME_CONFIG.ROCKET_WIDTH / 2;

  const platformTop = env.platformY;
  const platformLeft = env.platformX - env.platformWidth / 2;
  const platformRight = env.platformX + env.platformWidth / 2;

  const groundCollision = rocketBottom >= env.groundY;
  const platformCollision = rocketBottom >= platformTop && 
                           rocketRight > platformLeft && 
                           rocketLeft < platformRight;

  const collided = groundCollision || platformCollision;

  if (!collided) {
    return {
      collided: false,
      success: false,
      impactVelocity: { vx: 0, vy: 0 },
      impactAngle: 0,
      onPlatform: false,
    };
  }

  const onPlatform = platformCollision;
  const impactVelocity = { vx: rocket.vx, vy: rocket.vy };
  const impactAngle = Math.abs(rocket.angle);

  let success = true;
  let failureReason: string | undefined;

  const violations: string[] = [];

  if (Math.abs(rocket.vy) > GAME_CONFIG.SAFE_LANDING_VY) {
    violations.push(FAILURE_REASONS.TOO_FAST_VERTICAL);
  }

  if (Math.abs(rocket.vx) > GAME_CONFIG.SAFE_LANDING_VX) {
    violations.push(FAILURE_REASONS.TOO_FAST_HORIZONTAL);
  }

  if (impactAngle > GAME_CONFIG.SAFE_LANDING_ANGLE) {
    violations.push(FAILURE_REASONS.TOO_MUCH_ANGLE);
  }

  if (!onPlatform) {
    violations.push(FAILURE_REASONS.OUT_OF_PLATFORM);
  }

  if (violations.length > 0) {
    success = false;
    failureReason = violations.join('; ');
  }

  return {
    collided: true,
    success,
    impactVelocity,
    impactAngle,
    onPlatform,
    failureReason,
  };
}

export function isFuelEmergency(rocket: RocketState, currentAltitude: number): boolean {
  if (rocket.fuel > 10) return false;
  
  const estimatedTimeToGround = currentAltitude / Math.max(Math.abs(rocket.vy), 1);
  const fuelTime = rocket.fuel / GAME_CONFIG.FUEL_CONSUMPTION_RATE;
  
  return fuelTime < estimatedTimeToGround * 0.5;
}

export function getCollisionSeverity(result: CollisionResult): 'mild' | 'moderate' | 'severe' | 'catastrophic' {
  if (result.success) return 'mild';

  const impactSpeed = Math.sqrt(
    result.impactVelocity.vx ** 2 + result.impactVelocity.vy ** 2
  );

  if (impactSpeed > 20 || result.impactAngle > 45) return 'catastrophic';
  if (impactSpeed > 10 || result.impactAngle > 30) return 'severe';
  return 'moderate';
}
