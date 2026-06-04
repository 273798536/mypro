import { Vector2 } from './Vector2';
import { Ball } from './Ball';
import { generateId, ID_PREFIXES } from '../utils/id';
import type { CollisionEvent } from '../types/physics';

export class CollisionDetector {
  private width: number;
  private height: number;
  private boundaryErrorThreshold: number = 800;
  private boundaryErrorProbability: number = 0.3;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  detectBallBallCollision(ball1: Ball, ball2: Ball): boolean {
    const dist = Vector2.distance(ball1.position, ball2.position);
    return dist <= ball1.radius + ball2.radius;
  }

  resolveBallBallCollision(ball1: Ball, ball2: Ball): void {
    const relativeVelocity = ball2.velocity.sub(ball1.velocity);
    const collisionNormal = ball2.position.sub(ball1.position).normalize();
    
    const velocityAlongNormal = relativeVelocity.dot(collisionNormal);
    if (velocityAlongNormal > 0) return;

    const restitution = 0.9;
    const impulse = -(1 + restitution) * velocityAlongNormal / (1 / ball1.mass + 1 / ball2.mass);
    
    const impulseVector = collisionNormal.mul(impulse);
    ball1.velocity = ball1.velocity.sub(impulseVector.div(ball1.mass));
    ball2.velocity = ball2.velocity.add(impulseVector.div(ball2.mass));

    const overlap = ball1.radius + ball2.radius - Vector2.distance(ball1.position, ball2.position);
    const separation = collisionNormal.mul(overlap / 2);
    ball1.position = ball1.position.sub(separation);
    ball2.position = ball2.position.add(separation);
  }

  detectAndHandleWallCollision(ball: Ball): CollisionEvent | null {
    let collision: CollisionEvent | null = null;
    const isHighSpeed = ball.getSpeed() > this.boundaryErrorThreshold;
    const shouldTriggerError = isHighSpeed && Math.random() < this.boundaryErrorProbability;

    if (ball.position.x - ball.radius <= 0) {
      ball.position.x = ball.radius;
      
      if (shouldTriggerError) {
        ball.velocity.x = Math.abs(ball.velocity.x) * 0.3;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(0, ball.position.y),
          true,
          '高速运动下边界判定误差：球体实际未完全出界，但系统判定出界'
        );
      } else {
        ball.velocity.x = -ball.velocity.x * 0.9;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(0, ball.position.y)
        );
      }
    } else if (ball.position.x + ball.radius >= this.width) {
      ball.position.x = this.width - ball.radius;
      
      if (shouldTriggerError) {
        ball.velocity.x = -Math.abs(ball.velocity.x) * 0.3;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(this.width, ball.position.y),
          true,
          '高速运动下边界判定误差：球体实际未完全出界，但系统判定出界'
        );
      } else {
        ball.velocity.x = -ball.velocity.x * 0.9;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(this.width, ball.position.y)
        );
      }
    }

    if (ball.position.y - ball.radius <= 0) {
      ball.position.y = ball.radius;
      
      if (shouldTriggerError) {
        ball.velocity.y = Math.abs(ball.velocity.y) * 0.3;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(ball.position.x, 0),
          true,
          '高速运动下边界判定误差：球体实际未完全出界，但系统判定出界'
        );
      } else {
        ball.velocity.y = -ball.velocity.y * 0.9;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(ball.position.x, 0)
        );
      }
    } else if (ball.position.y + ball.radius >= this.height) {
      ball.position.y = this.height - ball.radius;
      
      if (shouldTriggerError) {
        ball.velocity.y = -Math.abs(ball.velocity.y) * 0.3;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(ball.position.x, this.height),
          true,
          '高速运动下边界判定误差：球体实际未完全出界，但系统判定出界'
        );
      } else {
        ball.velocity.y = -ball.velocity.y * 0.9;
        collision = this.createCollisionEvent(
          'ball-wall',
          [ball.id],
          new Vector2(ball.position.x, this.height)
        );
      }
    }

    return collision;
  }

  detectAllCollisions(balls: Ball[]): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    
    for (let i = 0; i < balls.length; i++) {
      const wallEvent = this.detectAndHandleWallCollision(balls[i]);
      if (wallEvent) {
        events.push(wallEvent);
      }
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (this.detectBallBallCollision(balls[i], balls[j])) {
          this.resolveBallBallCollision(balls[i], balls[j]);
          const collisionPos = Vector2.lerp(balls[i].position, balls[j].position, 0.5);
          events.push(this.createCollisionEvent(
            'ball-ball',
            [balls[i].id, balls[j].id],
            collisionPos
          ));
        }
      }
    }

    return events;
  }

  private createCollisionEvent(
    type: 'ball-ball' | 'ball-wall',
    ballIds: string[],
    position: Vector2,
    isBoundaryError: boolean = false,
    errorMessage?: string
  ): CollisionEvent {
    return {
      id: generateId(ID_PREFIXES.COLLISION),
      timestamp: Date.now(),
      type,
      ballIds,
      position: { x: position.x, y: position.y },
      isBoundaryError,
      boundaryErrorMessage: errorMessage,
    };
  }

  forceBoundaryError(ballId: string, balls: Ball[]): CollisionEvent | null {
    const ball = balls.find(b => b.id === ballId);
    if (!ball) return null;

    ball.position.x = this.width - ball.radius - 2;
    ball.velocity.x = -Math.abs(ball.velocity.x) * 0.3;
    
    return this.createCollisionEvent(
      'ball-wall',
      [ball.id],
      new Vector2(this.width, ball.position.y),
      true,
      '高速运动下边界判定误差：球体实际未完全出界，但系统判定出界'
    );
  }
}
