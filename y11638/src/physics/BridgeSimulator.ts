import Matter from 'matter-js';
import { Node, Member, Material, Level, Vehicle } from '../types';
import { vehicles as vehicleData } from '../data/vehicles';

const { Engine, Render, Runner, Bodies, Composite, Constraint, Events, Body } = Matter;

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
  private memberConstraints: Map<string, Matter.Constraint> = new Map();
  private memberBodyMap: Map<string, { body: Matter.Body; memberId: string }> = new Map();
  
  private vehicleBodies: Matter.Body[] = [];
  private currentVehicleIndex: number = 0;
  private vehicleProgress: number = 0;
  
  private startTime: number = 0;
  private isRunning: boolean = false;
  private callbacks: SimulationCallback;
  
  private anchorOriginalPositions: Map<string, { x: number; y: number }> = new Map();
  private maxAnchorDisplacement: number = 20;
  
  private windForce: number = 0;
  private windDirection: number = 1;
  
  private emittedWarnings: Set<string> = new Set();
  
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
    
    this.engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.002 }
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
        background: 'transparent',
        showAngleIndicator: false
      }
    });
    
    this.buildBridge();
    this.createGround();
    
    Events.on(this.engine, 'afterUpdate', () => this.handleUpdate());
    
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);
    Render.run(this.render);
    
    this.startTime = Date.now();
    this.isRunning = true;
    
    setTimeout(() => this.spawnNextVehicle(), 1000);
  }
  
  private buildBridge() {
    this.nodes.forEach(node => {
      const body = Bodies.circle(node.x, node.y, node.isAnchor ? 12 : 8, {
        isStatic: node.isAnchor,
        friction: 0.8,
        restitution: 0.1,
        render: {
          fillStyle: node.isAnchor ? '#f97316' : '#60a5fa',
          strokeStyle: '#1e3a5f',
          lineWidth: 2
        }
      });
      
      this.nodeBodies.set(node.id, body);
      Composite.add(this.engine.world, body);
      
      if (node.isAnchor) {
        this.anchorOriginalPositions.set(node.id, { x: node.x, y: node.y });
      }
    });
    
    this.members.forEach(member => {
      const startBody = this.nodeBodies.get(member.startNodeId);
      const endBody = this.nodeBodies.get(member.endNodeId);
      const material = this.materials.find(m => m.id === member.materialId);
      
      if (!startBody || !endBody || !material) return;
      
      const dx = endBody.position.x - startBody.position.x;
      const dy = endBody.position.y - startBody.position.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      const memberBody = Bodies.rectangle(
        (startBody.position.x + endBody.position.x) / 2,
        (startBody.position.y + endBody.position.y) / 2,
        length,
        6,
        {
          angle,
          density: material.density * 0.001,
          friction: 0.5,
          render: {
            fillStyle: material.color,
            strokeStyle: '#1e293b',
            lineWidth: 1
          }
        }
      );
      
      this.memberBodyMap.set(member.id, { body: memberBody, memberId: member.id });
      Composite.add(this.engine.world, memberBody);
      
      const constraint1 = Constraint.create({
        bodyA: startBody,
        bodyB: memberBody,
        pointB: { x: -length / 2, y: 0 },
        stiffness: 0.9,
        damping: 0.1,
        render: { visible: false }
      });
      
      const constraint2 = Constraint.create({
        bodyA: endBody,
        bodyB: memberBody,
        pointB: { x: length / 2, y: 0 },
        stiffness: 0.9,
        damping: 0.1,
        render: { visible: false }
      });
      
      this.memberConstraints.set(member.id, constraint1);
      Composite.add(this.engine.world, [constraint1, constraint2]);
    });
  }
  
  private createGround() {
    const groundY = this.level.groundY + 50;
    const ground = Bodies.rectangle(500, groundY, 2000, 100, {
      isStatic: true,
      render: {
        fillStyle: '#374151',
        strokeStyle: '#1f2937',
        lineWidth: 2
      }
    });
    
    const leftAbyss = Bodies.rectangle(-100, groundY + 200, 200, 500, {
      isStatic: true,
      render: { fillStyle: '#0f172a' }
    });
    
    const rightAbyss = Bodies.rectangle(1100, groundY + 200, 200, 500, {
      isStatic: true,
      render: { fillStyle: '#0f172a' }
    });
    
    Composite.add(this.engine.world, [ground, leftAbyss, rightAbyss]);
  }
  
  private spawnNextVehicle() {
    if (!this.isRunning) return;
    if (this.currentVehicleIndex >= this.level.vehicles.length) {
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
    const startX = this.level.anchors[0].x - 100;
    const startY = this.level.groundY - 40;
    
    const chassis = Bodies.rectangle(startX, startY, vehicle.width, 30, {
      density: vehicle.weight * 0.01,
      friction: 0.8,
      render: {
        fillStyle: vehicle.color,
        strokeStyle: '#1e293b',
        lineWidth: 2
      }
    });
    
    const wheels: Matter.Body[] = [];
    vehicle.wheels.forEach(w => {
      const wheel = Bodies.circle(startX + w.x, startY + 15, w.radius, {
        density: vehicle.weight * 0.005,
        friction: 1,
        render: {
          fillStyle: '#1e293b',
          strokeStyle: '#0f172a',
          lineWidth: 2
        }
      });
      wheels.push(wheel);
      
      const axle = Constraint.create({
        bodyA: chassis,
        bodyB: wheel,
        pointA: { x: w.x, y: 15 },
        stiffness: 1,
        damping: 0.5,
        render: { visible: false }
      });
      
      Composite.add(this.engine.world, [wheel, axle]);
    });
    
    Composite.add(this.engine.world, chassis);
    this.vehicleBodies.push(chassis);
  }
  
  private handleUpdate() {
    if (!this.isRunning) return;
    
    const time = (Date.now() - this.startTime) / 1000;
    
    this.applyWind();
    
    const stresses: { [memberId: string]: number } = {};
    const nodePositions: { [nodeId: string]: { x: number; y: number } } = {};
    const warnings: string[] = [];
    
    this.nodeBodies.forEach((body, nodeId) => {
      nodePositions[nodeId] = { x: body.position.x, y: body.position.y };
      
      if (this.anchorOriginalPositions.has(nodeId)) {
        const original = this.anchorOriginalPositions.get(nodeId)!;
        const displacement = Math.sqrt(
          Math.pow(body.position.x - original.x, 2) +
          Math.pow(body.position.y - original.y, 2)
        );
        
        if (displacement > this.maxAnchorDisplacement) {
          this.callbacks.onFailure(
            'anchor_fail',
            `支点位移过大 (${displacement.toFixed(1)}px)，支点失稳！`,
            nodeId
          );
          return;
        }
        
        if (displacement > this.maxAnchorDisplacement * 0.7) {
          const warning = `支点 ${nodeId} 位移警告: ${displacement.toFixed(1)}px`;
          if (!this.emittedWarnings.has(warning)) {
            warnings.push(warning);
            this.emittedWarnings.add(warning);
          }
        }
      }
    });
    
    let maxStress = 0;
    let failedMemberId: string | null = null;
    
    for (const member of this.members) {
      const material = this.materials.find(m => m.id === member.materialId);
      const memberData = this.memberBodyMap.get(member.id);
      
      if (!material || !memberData) continue;
      
      const startBody = this.nodeBodies.get(member.startNodeId);
      const endBody = this.nodeBodies.get(member.endNodeId);
      
      if (!startBody || !endBody) continue;
      
      const dx = endBody.position.x - startBody.position.x;
      const dy = endBody.position.y - startBody.position.y;
      const currentLength = Math.sqrt(dx * dx + dy * dy);
      
      const originalDx = this.nodes.find(n => n.id === member.startNodeId)!.x -
                         this.nodes.find(n => n.id === member.endNodeId)!.x;
      const originalDy = this.nodes.find(n => n.id === member.startNodeId)!.y -
                         this.nodes.find(n => n.id === member.endNodeId)!.y;
      const originalLength = Math.sqrt(originalDx * originalDx + originalDy * originalDy);
      
      const strain = (currentLength - originalLength) / originalLength;
      const stress = strain * material.maxCompression * 10;
      
      stresses[member.id] = stress;
      
      const absStress = Math.abs(stress);
      maxStress = Math.max(maxStress, absStress);
      
      const maxAllowed = strain > 0 ? material.maxTension : material.maxCompression;
      
      if (absStress > maxAllowed) {
        failedMemberId = member.id;
        Body.setVelocity(memberData.body, {
          x: (Math.random() - 0.5) * 20,
          y: -15
        });
        Body.setAngularVelocity(memberData.body, (Math.random() - 0.5) * 5);
        
        const constraintsToRemove: Matter.Constraint[] = [];
        Composite.allConstraints(this.engine.world).forEach(c => {
          if (c.bodyB === memberData.body) {
            constraintsToRemove.push(c);
          }
        });
        Composite.remove(this.engine.world, constraintsToRemove);
        
        this.callbacks.onFailure(
          'overload',
          `${material.name}杆件过载断裂！应力: ${absStress.toFixed(1)} / 最大: ${maxAllowed}`,
          member.id
        );
        return;
      }
      
      if (absStress > maxAllowed * 0.8) {
        const warning = `${material.name}杆件应力警告: ${absStress.toFixed(1)} / ${maxAllowed}`;
        if (!this.emittedWarnings.has(warning)) {
          warnings.push(warning);
          this.emittedWarnings.add(warning);
        }
      }
    }
    
    if (failedMemberId) return;
    
    const currentVehicle = this.vehicleBodies[this.currentVehicleIndex];
    if (currentVehicle) {
      this.vehicleProgress = currentVehicle.position.x;
      
      Body.applyForce(currentVehicle, currentVehicle.position, { x: 0.005, y: 0 });
      
      if (currentVehicle.position.y > this.level.groundY + 100) {
        this.callbacks.onFailure(
          'vehicle_fall',
          '车辆坠入桥下！桥梁结构无法支撑车辆重量',
          undefined
        );
        return;
      }
      
      const endX = this.level.anchors[this.level.anchors.length - 1].x + 100;
      if (currentVehicle.position.x > endX) {
        Composite.remove(this.engine.world, currentVehicle);
        this.vehicleBodies.shift();
        this.currentVehicleIndex++;
        
        setTimeout(() => this.spawnNextVehicle(), 1500);
      }
    }
    
    this.callbacks.onUpdate(
      time,
      this.vehicleProgress,
      this.currentVehicleIndex,
      stresses,
      nodePositions,
      warnings
    );
  }
  
  private applyWind() {
    if (this.windSetting <= 0) return;
    
    const baseForce = this.windSetting * 0.0003;
    this.windForce = baseForce * (0.8 + Math.sin(Date.now() * 0.002) * 0.4);
    
    if (Math.random() < 0.001 * this.windSetting) {
      this.windDirection *= -1;
    }
    
    this.memberBodyMap.forEach(({ body }) => {
      Body.applyForce(body, body.position, {
        x: this.windForce * this.windDirection,
        y: 0
      });
    });
    
    this.vehicleBodies.forEach(vehicle => {
      Body.applyForce(vehicle, vehicle.position, {
        x: this.windForce * this.windDirection * 2,
        y: 0
      });
    });
  }
  
  destroy() {
    this.isRunning = false;
    
    if (this.render) {
      Render.stop(this.render);
      if (this.render.canvas && this.container) {
        this.container.removeChild(this.render.canvas);
      }
      this.render = null;
    }
    
    if (this.runner) {
      Runner.stop(this.runner);
      this.runner = null;
    }
    
    if (this.engine) {
      Events.off(this.engine, 'afterUpdate', () => {});
      Composite.clear(this.engine.world, false);
      Engine.clear(this.engine);
    }
    
    this.nodeBodies.clear();
    this.memberConstraints.clear();
    this.memberBodyMap.clear();
    this.vehicleBodies = [];
    this.anchorOriginalPositions.clear();
    this.emittedWarnings.clear();
  }
  
  getWindForce() {
    return this.windForce * this.windDirection;
  }
  
  pause() {
    if (this.runner) {
      Runner.stop(this.runner);
    }
  }
  
  resume() {
    if (this.runner && this.engine) {
      Runner.run(this.runner, this.engine);
    }
  }
}
