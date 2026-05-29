import type { CartPhysics, InputState, MinecartConfig } from '../types/game';

export class LowGravityPhysics {
  gravity: number = 1.62;
  airResistance: number = 0.015;
  frictionCoefficient: number = 0.02;

  update(
    physics: CartPhysics,
    input: InputState,
    config: MinecartConfig,
    dt: number
  ): void {
    const baseAcceleration = config.acceleration * 50;
    const maxSpeed = config.maxSpeed * 100;

    physics.acceleration.x = 0;
    physics.acceleration.y = 0;

    if (input.accelerate) {
      const accelX = Math.cos(physics.angle) * baseAcceleration;
      const accelY = Math.sin(physics.angle) * baseAcceleration;
      physics.acceleration.x += accelX;
      physics.acceleration.y += accelY;
    }

    if (input.brake) {
      const brakeForce = 0.8;
      physics.velocity.x *= brakeForce;
      physics.velocity.y *= brakeForce;
    }

    const gravityX = 0;
    const gravityY = this.gravity * 10;
    physics.acceleration.x += gravityX;
    physics.acceleration.y += gravityY;

    const speed = Math.hypot(physics.velocity.x, physics.velocity.y);
    if (speed > 0.1) {
      const frictionForce = this.frictionCoefficient * config.friction * 10;
      const frictionX = (-physics.velocity.x / speed) * frictionForce;
      const frictionY = (-physics.velocity.y / speed) * frictionForce;
      physics.acceleration.x += frictionX;
      physics.acceleration.y += frictionY;
    }

    if (speed > 0.1) {
      const airResistanceForce = this.airResistance * speed * speed;
      physics.acceleration.x += (-physics.velocity.x / speed) * airResistanceForce;
      physics.acceleration.y += (-physics.velocity.y / speed) * airResistanceForce;
    }

    physics.velocity.x += physics.acceleration.x * dt;
    physics.velocity.y += physics.acceleration.y * dt;

    const currentSpeed = Math.hypot(physics.velocity.x, physics.velocity.y);
    if (currentSpeed > maxSpeed) {
      physics.velocity.x *= maxSpeed / currentSpeed;
      physics.velocity.y *= maxSpeed / currentSpeed;
    }

    physics.position.x += physics.velocity.x * dt;
    physics.position.y += physics.velocity.y * dt;
  }

  applyTrackConstraint(
    physics: CartPhysics,
    trackAngle: number,
    trackFriction: number
  ): void {
    const speed = Math.hypot(physics.velocity.x, physics.velocity.y);
    const direction = Math.atan2(physics.velocity.y, physics.velocity.x);
    
    const angleDiff = trackAngle - direction;
    const snapStrength = 0.1 * trackFriction;
    
    const newDirection = direction + angleDiff * snapStrength;
    
    physics.velocity.x = Math.cos(newDirection) * speed;
    physics.velocity.y = Math.sin(newDirection) * speed;
    physics.angle = trackAngle;
  }

  getSpeed(physics: CartPhysics): number {
    return Math.hypot(physics.velocity.x, physics.velocity.y);
  }
}

export const physicsEngine = new LowGravityPhysics();
