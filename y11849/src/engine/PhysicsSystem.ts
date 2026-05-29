import type { Ship, Planet, NoiseStorm } from '../types/game';

export class PhysicsSystem {
  private friction = 0.98;
  private acceleration = 0.5;
  private maxSpeed = 8;

  updateShip(
    ship: Ship,
    keyboard: { up: boolean; down: boolean; left: boolean; right: boolean },
    canvasWidth: number,
    canvasHeight: number
  ): Ship {
    let { vx, vy, angle } = ship;

    if (keyboard.up) vy -= this.acceleration;
    if (keyboard.down) vy += this.acceleration;
    if (keyboard.left) vx -= this.acceleration;
    if (keyboard.right) vx += this.acceleration;

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > this.maxSpeed) {
      vx = (vx / speed) * this.maxSpeed;
      vy = (vy / speed) * this.maxSpeed;
    }

    vx *= this.friction;
    vy *= this.friction;

    if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
      angle = Math.atan2(vy, vx);
    }

    let x = ship.x + vx;
    let y = ship.y + vy;

    x = Math.max(ship.radius, Math.min(canvasWidth - ship.radius, x));
    y = Math.max(ship.radius, Math.min(canvasHeight - 150, y));

    return { ...ship, x, y, vx, vy, angle };
  }

  checkCircleCollision(
    x1: number,
    y1: number,
    r1: number,
    x2: number,
    y2: number,
    r2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
  }

  checkShipPlanetCollision(ship: Ship, planet: Planet): boolean {
    return this.checkCircleCollision(
      ship.x,
      ship.y,
      ship.radius,
      planet.x,
      planet.y,
      planet.radius
    );
  }

  checkShipStormCollision(ship: Ship, storm: NoiseStorm): boolean {
    return this.checkCircleCollision(
      ship.x,
      ship.y,
      ship.radius,
      storm.x,
      storm.y,
      storm.radius
    );
  }
}

export const physicsSystem = new PhysicsSystem();
