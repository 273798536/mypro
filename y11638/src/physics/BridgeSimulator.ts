import Matter from 'matter-js';
import { Node, Member, Material, Level, Vehicle } from '../types';
import { vehicles as vehicleData } from '../data/vehicles';

const { Engine, Render, Runner, Bodies, Composite, Constraint, Events, Body, Vector } = Matter;

export interface SimulationCallback {
  onUpdate: (
    time: number,
    progress: number,
    vehicleIndex: number,
    stresses: { [memberId: string]: number },
    nodePositions: { [nodeId: string]: { x: number; y: number } },
    warnings: string[]
  ) => void;
  onFailure: (reason: 'overload' | 'anchor_fail' | 'wind' | 'vehicle_fall', message: string, memberId?: string) => void;
  onSuccess: () => void;
}

export class BridgeSimulator {
  private engine: Matter.Engine;
  private render: Matter.Render | null = null;
  private runner: Matter.Runner | null = null;
  private container: HTMLElement | null = null;

  private level: Level;
  private nodes: Node[];
  private members: Member[];
  private materials: Material[];
  private windSetting: number;

  private nodeBodies: Map<string, Matter.Body> = new Map();
  private memberBodyMap: Map<string, { body: Matter.Body; memberId: string }> = new Map();
  private memberConstraintMap: Map<string, Matter.Constraint[]> = new Map();

  private vehicleChassis: Matter.Body | null = null;
  private vehicleWheels: Matter.Body[] = [];
  private vehicleConstraints: Matter.Constraint[] = [];
  private currentVehicleIndex: number = 0;

  private startTime: number = 0;
  private isRunning: boolean = false;
  private hasFinished: boolean = false;
  private callbacks: SimulationCallback;

  private anchorBodies: Map<string, Matter.Body> = new Map();
  private anchorOriginalPositions: Map<string, { x: number; y: number }> = new Map();
  private maxAnchorDisplacement: number = 15;

  private windForce: number = 0;
  private windDirection: number = 1;

  private emittedWarnings: Set<string> = new Set();
  private frameCount: number = 0;

  private leftAnchorX: number = 0;
  private rightAnchorX: number = 0;
  private deckY: number = 0;

  constructor(
    level: Level,
    nodes: Node[],
    members: Member[],
    materials: Material[],
    windSetting: number,
    callbacks: SimulationCallback
  ) {
    this.level = level;
    this.nodes = JSON.parse(JSON.stringify(nodes));
    this.members = JSON.parse(JSON.stringify(members));
    this.materials = materials;
    this.windSetting = windSetting;
    this.callbacks = callbacks;

    this.leftAnchorX = level.anchors[0].x;
    this.rightAnchorX = level.anchors[level.anchors.length - 1].x;
    this.deckY = level.anchors[0].y;

    this.engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 }
    });
  }

  init(container: HTMLElement, width: number, height: number) {
    this.container = container;

    this.render = Render.create({
      element: container,
      engine: this.engine,
      options: {
        width,
        height,
        wireframes: false,
        background: '#0f172a',
        showAngleIndicator: false
      }
    });

    this.buildBridge();
    this.createTerrain();

    Events.on(this.engine, 'afterUpdate', () => this.handleUpdate());

    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);
    Render.run(this.render);

    this.startTime = Date.now();
    this.isRunning = true;

    setTimeout(() => this.spawnNextVehicle(), 2000);
  }

  private anchorPinBodies: Map<string, Matter.Body> = new Map();
  private anchorPinConstraints: Map<string, Matter.Constraint> = new Map();

  private buildBridge() {
    this.nodes.forEach(node => {
      let body: Matter.Body;

      if (node.isAnchor) {
        const pin = Bodies.circle(node.x, node.y, 4, {
          isStatic: true,
          render: { visible: false }
        });
        this.anchorPinBodies.set(node.id, pin);
        Composite.add(this.engine.world, pin);

        body = Bodies.circle(node.x, node.y, 14, {
          isStatic: false,
          mass: 50,
          friction: 1,
          restitution: 0,
          render: {
            fillStyle: '#f97316',
            strokeStyle: '#c2410c',
            lineWidth: 3
          }
        });

        const anchorSpring = Constraint.create({
          bodyA: pin,
          bodyB: body,
          stiffness: 0.08,
          damping: 0.3,
          length: 0,
          render: { visible: false }
        });
        this.anchorPinConstraints.set(node.id, anchorSpring);
        Composite.add(this.engine.world, [body, anchorSpring]);

        this.anchorBodies.set(node.id, body);
        this.anchorOriginalPositions.set(node.id, { x: node.x, y: node.y });
      } else {
        body = Bodies.circle(node.x, node.y, 8, {
          isStatic: false,
          mass: 0.5,
          friction: 0.8,
          restitution: 0.05,
          render: {
            fillStyle: '#60a5fa',
            strokeStyle: '#1e3a5f',
            lineWidth: 2
          }
        });
      }

      this.nodeBodies.set(node.id, body);
      Composite.add(this.engine.world, body);
    });

    this.members.forEach(member => {
      const startBody = this.nodeBodies.get(member.startNodeId);
      const endBody = this.nodeBodies.get(member.endNodeId);
      const material = this.materials.find(m => m.id === member.materialId);

      if (!startBody || !endBody || !material) return;

      const dx = endBody.position.x - startBody.position.x;
      const dy = endBody.position.y - startBody.position.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 1) return;
      const angle = Math.atan2(dy, dx);

      const memberBody = Bodies.rectangle(
        (startBody.position.x + endBody.position.x) / 2,
        (startBody.position.y + endBody.position.y) / 2,
        length,
        8,
        {
          angle,
          density: material.density * 0.0005,
          friction: 0.8,
          frictionStatic: 1.2,
          restitution: 0,
          render: {
            fillStyle: material.color,
            strokeStyle: '#1e293b',
            lineWidth: 1
          }
        }
      );

      this.memberBodyMap.set(member.id, { body: memberBody, memberId: member.id });

      const c1 = Constraint.create({
        bodyA: startBody,
        bodyB: memberBody,
        pointB: { x: -length / 2, y: 0 },
        stiffness: 1,
        damping: 0.05,
        render: { visible: false }
      });

      const c2 = Constraint.create({
        bodyA: endBody,
        bodyB: memberBody,
        pointB: { x: length / 2, y: 0 },
        stiffness: 1,
        damping: 0.05,
        render: { visible: false }
      });

      this.memberConstraintMap.set(member.id, [c1, c2]);
      Composite.add(this.engine.world, [memberBody, c1, c2]);
    });
  }

  private createTerrain() {
    const groundY = this.level.groundY;
    const leftX = this.leftAnchorX;
    const rightX = this.rightAnchorX;
    const canvasWidth = 1000;
    const wallHeight = 2000;

    const leftGround = Bodies.rectangle(
      leftX / 2,
      groundY + wallHeight / 2 - 25,
      leftX + 40,
      wallHeight,
      {
        isStatic: true,
        friction: 1,
        render: { fillStyle: '#475569' }
      }
    );

    const rightGround = Bodies.rectangle(
      (rightX + canvasWidth) / 2,
      groundY + wallHeight / 2 - 25,
      (canvasWidth - rightX) + 40,
      wallHeight,
      {
        isStatic: true,
        friction: 1,
        render: { fillStyle: '#475569' }
      }
    );

    const leftWall = Bodies.rectangle(
      leftX - 10,
      groundY - 100,
      20,
      200,
      {
        isStatic: true,
        friction: 0.5,
        render: { fillStyle: '#334155' }
      }
    );

    const rightWall = Bodies.rectangle(
      rightX + 10,
      groundY - 100,
      20,
      200,
      {
        isStatic: true,
        friction: 0.5,
        render: { fillStyle: '#334155' }
      }
    );

    Composite.add(this.engine.world, [leftGround, rightGround, leftWall, rightWall]);
  }

  private spawnNextVehicle() {
    if (!this.isRunning || this.hasFinished) return;

    if (this.currentVehicleIndex >= this.level.vehicles.length) {
      this.hasFinished = true;
      this.callbacks.onSuccess();
      return;
    }

    const vehicleId = this.level.vehicles[this.currentVehicleIndex];
    const vehicle = vehicleData.find(v => v.id === vehicleId);
    if (!vehicle) {
      this.currentVehicleIndex++;
      this.spawnNextVehicle();
      return;
    }

    this.createVehicle(vehicle);
  }

  private createVehicle(vehicle: Vehicle) {
    const startX = this.leftAnchorX - 60;
    const startY = this.deckY - 25;

    const chassis = Bodies.rectangle(startX, startY, vehicle.width, 24, {
      density: vehicle.weight * 0.008,
      friction: 0.95,
      frictionStatic: 1.5,
      restitution: 0,
      render: {
        fillStyle: vehicle.color,
        strokeStyle: '#1e293b',
        lineWidth: 2
      }
    });

    this.vehicleChassis = chassis;
    this.vehicleWheels = [];
    this.vehicleConstraints = [];

    vehicle.wheels.forEach(w => {
      const wheel = Bodies.circle(startX + w.x, startY + 18, w.radius, {
        density: vehicle.weight * 0.002,
        friction: 1,
        frictionStatic: 2,
        restitution: 0,
        render: {
          fillStyle: '#1e293b',
          strokeStyle: '#0f172a',
          lineWidth: 2
        }
      });
      this.vehicleWheels.push(wheel);

      const axle = Constraint.create({
        bodyA: chassis,
        bodyB: wheel,
        pointA: { x: w.x, y: 12 },
        stiffness: 0.8,
        damping: 0.3,
        length: 0,
        render: { visible: false }
      });
      this.vehicleConstraints.push(axle);
    });

    Composite.add(this.engine.world, [chassis, ...this.vehicleWheels, ...this.vehicleConstraints]);
  }

  private cleanupVehicle() {
    if (this.vehicleChassis) {
      Composite.remove(this.engine.world, this.vehicleChassis);
      this.vehicleChassis = null;
    }
    this.vehicleWheels.forEach(w => {
      try { Composite.remove(this.engine.world, w); } catch (_e) { /* already removed */ }
    });
    this.vehicleWheels = [];
    this.vehicleConstraints.forEach(c => {
      try { Composite.remove(this.engine.world, c); } catch (_e) { /* already removed */ }
    });
    this.vehicleConstraints = [];
  }

  private handleUpdate() {
    if (!this.isRunning || this.hasFinished) return;

    const time = (Date.now() - this.startTime) / 1000;
    this.frameCount++;

    this.applyWind();

    const stresses: { [memberId: string]: number } = {};
    const nodePositions: { [nodeId: string]: { x: number; y: number } } = {};
    const warnings: string[] = [];

    this.nodeBodies.forEach((body, nodeId) => {
      nodePositions[nodeId] = { x: body.position.x, y: body.position.y };
    });

    this.anchorBodies.forEach((body, nodeId) => {
      const original = this.anchorOriginalPositions.get(nodeId);
      if (!original) return;

      const displacement = Vector.magnitude(Vector.sub(body.position, original));

      if (displacement > this.maxAnchorDisplacement) {
        this.hasFinished = true;
        this.callbacks.onFailure(
          'anchor_fail',
          `支点 ${nodeId} 位移过大 (${displacement.toFixed(1)}px)，结构失稳！`,
          nodeId
        );
        return;
      }

      if (displacement > this.maxAnchorDisplacement * 0.5) {
        const key = `anchor_warn_${nodeId}_${Math.round(displacement)}`;
        if (!this.emittedWarnings.has(key)) {
          const w = `⚠ 支点 ${nodeId} 位移 ${displacement.toFixed(1)}px (极限 ${this.maxAnchorDisplacement}px)`;
          warnings.push(w);
          this.emittedWarnings.add(key);
        }
      }
    });

    if (this.hasFinished) return;

    let failedMemberId: string | null = null;

    for (const member of this.members) {
      const material = this.materials.find(m => m.id === member.materialId);
      const memberData = this.memberBodyMap.get(member.id);
      if (!material || !memberData) continue;

      const startNode = this.nodes.find(n => n.id === member.startNodeId);
      const endNode = this.nodes.find(n => n.id === member.endNodeId);
      if (!startNode || !endNode) continue;

      const startBody = this.nodeBodies.get(member.startNodeId);
      const endBody = this.nodeBodies.get(member.endNodeId);
      if (!startBody || !endBody) continue;

      const origDx = endNode.x - startNode.x;
      const origDy = endNode.y - startNode.y;
      const origLen = Math.sqrt(origDx * origDx + origDy * origDy);
      if (origLen < 1) continue;

      const curDx = endBody.position.x - startBody.position.x;
      const curDy = endBody.position.y - startBody.position.y;
      const curLen = Math.sqrt(curDx * curDx + curDy * curDy);

      const strain = (curLen - origLen) / origLen;

      let stress: number;
      if (strain >= 0) {
        stress = strain * material.maxTension * 50;
      } else {
        stress = Math.abs(strain) * material.maxCompression * 50;
      }

      stresses[member.id] = stress;

      const maxAllowed = strain >= 0 ? material.maxTension : material.maxCompression;

      if (Math.abs(stress) > maxAllowed) {
        failedMemberId = member.id;

        const constraints = this.memberConstraintMap.get(member.id);
        if (constraints) {
          Composite.remove(this.engine.world, constraints);
        }

        Body.setVelocity(memberData.body, {
          x: (Math.random() - 0.5) * 10,
          y: -8
        });
        Body.setAngularVelocity(memberData.body, (Math.random() - 0.5) * 3);

        const stressDir = strain >= 0 ? '拉力' : '压力';
        this.hasFinished = true;
        this.callbacks.onFailure(
          'overload',
          `${material.name}杆件${stressDir}过载断裂！应力 ${Math.abs(stress).toFixed(1)} 超过极限 ${maxAllowed}`,
          member.id
        );
        return;
      }

      if (Math.abs(stress) > maxAllowed * 0.7) {
        const stressDir = strain >= 0 ? '拉' : '压';
        const key = `member_warn_${member.id}_${Math.round(Math.abs(stress))}`;
        if (!this.emittedWarnings.has(key)) {
          warnings.push(`⚠ ${material.name}杆件${stressDir}应力 ${Math.abs(stress).toFixed(1)} / ${maxAllowed}`);
          this.emittedWarnings.add(key);
        }
      }
    }

    if (this.vehicleChassis) {
      const forceX = 0.003 * (this.level.vehicles[this.currentVehicleIndex]
        ? (vehicleData.find(v => v.id === this.level.vehicles[this.currentVehicleIndex])?.speed || 1)
        : 1);

      Body.applyForce(this.vehicleChassis, this.vehicleChassis.position, { x: forceX, y: 0 });

      const vY = this.vehicleChassis.position.y;
      const vInGap = this.vehicleChassis.position.x > this.leftAnchorX + 20
                    && this.vehicleChassis.position.x < this.rightAnchorX - 20;

      if (vInGap && vY > this.deckY + 80) {
        this.hasFinished = true;
        this.callbacks.onFailure(
          'vehicle_fall',
          '车辆坠入河中！桥梁结构未能支撑车辆通行',
          undefined
        );
        return;
      }

      if (this.vehicleChassis.position.y > this.level.groundY + 150) {
        this.hasFinished = true;
        this.callbacks.onFailure(
          'vehicle_fall',
          '车辆坠落！桥梁未能提供通行路径',
          undefined
        );
        return;
      }

      const endX = this.rightAnchorX + 80;
      if (this.vehicleChassis.position.x > endX) {
        this.cleanupVehicle();
        this.currentVehicleIndex++;
        setTimeout(() => this.spawnNextVehicle(), 1500);
      }
    }

    this.callbacks.onUpdate(
      time,
      this.vehicleChassis?.position.x || 0,
      this.currentVehicleIndex,
      stresses,
      nodePositions,
      warnings
    );
  }

  private applyWind() {
    if (this.windSetting <= 0) return;

    const baseForce = this.windSetting * 0.00015;
    this.windForce = baseForce * (0.8 + Math.sin(Date.now() * 0.002) * 0.4);

    if (Math.random() < 0.002 * this.windSetting) {
      this.windDirection *= -1;
    }

    this.memberBodyMap.forEach(({ body }) => {
      Body.applyForce(body, body.position, {
        x: this.windForce * this.windDirection,
        y: 0
      });
    });

    this.nodeBodies.forEach((body) => {
      if (!body.isStatic) {
        Body.applyForce(body, body.position, {
          x: this.windForce * this.windDirection * 0.5,
          y: 0
        });
      }
    });

    if (this.vehicleChassis) {
      Body.applyForce(this.vehicleChassis, this.vehicleChassis.position, {
        x: this.windForce * this.windDirection * 1.5,
        y: 0
      });
    }
  }

  destroy() {
    this.isRunning = false;
    this.hasFinished = true;

    if (this.render) {
      Render.stop(this.render);
      if (this.render.canvas && this.container) {
        try { this.container.removeChild(this.render.canvas); } catch (_e) { /* ok */ }
      }
      this.render = null;
    }

    if (this.runner) {
      Runner.stop(this.runner);
      this.runner = null;
    }

    Events.off(this.engine, 'afterUpdate');

    this.cleanupVehicle();

    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);

    this.nodeBodies.clear();
    this.anchorBodies.clear();
    this.memberBodyMap.clear();
    this.memberConstraintMap.clear();
    this.anchorOriginalPositions.clear();
    this.emittedWarnings.clear();
  }
}
