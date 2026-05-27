import { GRAVITY, PIXELS_PER_METER, BALL_RADIUS } from '../types';

export class Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;

  constructor(x: number, y: number, mass: number = 1) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = BALL_RADIUS;
    this.mass = mass;
  }

  update(dt: number, groundY: number, restitution: number): { bounced: boolean; penetration: number } {
    const gravityPixels = GRAVITY * PIXELS_PER_METER;
    
    this.vy += gravityPixels * dt;
    
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    let bounced = false;
    let penetration = 0;

    if (this.y + this.radius >= groundY) {
      penetration = this.y + this.radius - groundY;
      
      if (penetration > 0) {
        this.y = groundY - this.radius;
        
        if (this.vy > 0) {
          this.vy = -this.vy * restitution;
          bounced = true;
          
          if (Math.abs(this.vy) < 1) {
            this.vy = 0;
          }
        }
      }
    }

    return { bounced, penetration };
  }

  getPotentialEnergy(groundY: number): number {
    const heightPixels = groundY - this.y - this.radius;
    const heightMeters = heightPixels / PIXELS_PER_METER;
    return this.mass * GRAVITY * Math.max(0, heightMeters);
  }

  getKineticEnergy(): number {
    const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const velocityMeters = velocity / PIXELS_PER_METER;
    return 0.5 * this.mass * velocityMeters * velocityMeters;
  }

  getHeight(groundY: number): number {
    const heightPixels = groundY - this.y - this.radius;
    return Math.max(0, heightPixels / PIXELS_PER_METER);
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  clone(): Ball {
    const ball = new Ball(this.x, this.y, this.mass);
    ball.vx = this.vx;
    ball.vy = this.vy;
    ball.radius = this.radius;
    return ball;
  }
}
