import { BridgeNode, BridgeMember, VibrationFrame } from '../types/bridge';

export class PhysicsEngine {
  private nodes: BridgeNode[];
  private members: BridgeMember[];
  private nodeVelocities: Map<string, { vx: number; vy: number }>;
  private nodeDisplacements: Map<string, { dx: number; dy: number }>;
  private time: number = 0;

  constructor(nodes: BridgeNode[], members: BridgeMember[]) {
    this.nodes = nodes;
    this.members = members;
    this.nodeVelocities = new Map();
    this.nodeDisplacements = new Map();
    
    nodes.forEach(n => {
      this.nodeVelocities.set(n.id, { vx: 0, vy: 0 });
      this.nodeDisplacements.set(n.id, { dx: 0, dy: 0 });
    });
  }

  update(dt: number, windForce: number, windFrequency: number): VibrationFrame {
    this.time += dt;
    
    const windFactor = Math.sin(this.time * windFrequency) * windForce;
    let maxAmplitude = 0;
    let maxStress = 0;

    this.nodes.forEach(node => {
      if (node.fixed) return;

      const velocity = this.nodeVelocities.get(node.id)!;
      const displacement = this.nodeDisplacements.get(node.id)!;

      let forceX = windFactor * (0.5 + Math.random() * 0.5);
      let forceY = windFactor * (Math.random() - 0.5) * 0.3;

      this.members.forEach(member => {
        const otherNodeId = member.startNodeId === node.id ? member.endNodeId :
          member.endNodeId === node.id ? member.startNodeId : null;
        
        if (!otherNodeId) return;

        const otherNode = this.nodes.find(n => n.id === otherNodeId)!;
        const otherDisp = this.nodeDisplacements.get(otherNodeId)!;

        const origLength = Math.sqrt(
          Math.pow(otherNode.x - node.x, 2) + Math.pow(otherNode.y - node.y, 2)
        );
        
        const curLength = Math.sqrt(
          Math.pow((otherNode.x + otherDisp.dx) - (node.x + displacement.dx), 2) +
          Math.pow((otherNode.y + otherDisp.dy) - (node.y + displacement.dy), 2)
        );

        const strain = (curLength - origLength) / origLength;
        const stress = strain * member.stiffness;
        member.currentStress = Math.abs(stress);
        
        if (Math.abs(stress) > maxStress) {
          maxStress = Math.abs(stress);
        }

        if (stress > member.maxStress * 0.3) {
          const angle = Math.atan2(
            (otherNode.y + otherDisp.dy) - (node.y + displacement.dy),
            (otherNode.x + otherDisp.dx) - (node.x + displacement.dx)
          );
          const dampingForce = -member.damping * (velocity.vx * Math.cos(angle) + velocity.vy * Math.sin(angle));
          
          forceX += stress * Math.cos(angle) + dampingForce * Math.cos(angle);
          forceY += stress * Math.sin(angle) + dampingForce * Math.sin(angle);
        }
      });

      const mass = node.mass;
      const accX = forceX / mass;
      const accY = forceY / mass - 0.5;

      velocity.vx += accX * dt;
      velocity.vy += accY * dt;
      velocity.vx *= 0.995;
      velocity.vy *= 0.995;

      displacement.dx += velocity.vx * dt;
      displacement.dy += velocity.vy * dt;

      const amplitude = Math.sqrt(displacement.dx ** 2 + displacement.dy ** 2);
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
      }
    });

    return {
      timestamp: Date.now(),
      windLevel: Math.floor(windForce / 100),
      windForce,
      amplitude: maxAmplitude,
      maxStress,
      nodeDisplacements: this.nodes.map(n => ({
        nodeId: n.id,
        dx: this.nodeDisplacements.get(n.id)?.dx || 0,
        dy: this.nodeDisplacements.get(n.id)?.dy || 0
      }))
    };
  }

  getNodeDisplacement(nodeId: string): { dx: number; dy: number } {
    return this.nodeDisplacements.get(nodeId) || { dx: 0, dy: 0 };
  }

  checkResonance(windFrequency: number, history: VibrationFrame[]): boolean {
    if (history.length < 50) return false;

    const recentAmplitudes = history.slice(-50).map(f => f.amplitude);
    const avgAmplitude = recentAmplitudes.reduce((a, b) => a + b, 0) / recentAmplitudes.length;
    
    const growth = recentAmplitudes.slice(-20).reduce((a, b) => a + b, 0) / 20 -
                   recentAmplitudes.slice(-40, -20).reduce((a, b) => a + b, 0) / 20;

    const naturalFreq = this.calculateNaturalFrequency();
    const freqMatch = Math.abs(windFrequency - naturalFreq) < 0.15;

    return freqMatch && avgAmplitude > 40 && growth > 5;
  }

  private calculateNaturalFrequency(): number {
    const freeNodes = this.nodes.filter(n => !n.fixed);
    if (freeNodes.length === 0) return 1;

    const totalMass = freeNodes.reduce((sum, n) => sum + n.mass, 0);
    const totalStiffness = this.members.reduce((sum, m) => sum + m.stiffness, 0);
    
    return Math.sqrt(totalStiffness / totalMass) / 100;
  }

  checkOverload(): { overloaded: boolean; memberId?: string; stress?: number } {
    for (const member of this.members) {
      if (member.currentStress > member.maxStress) {
        return { overloaded: true, memberId: member.id, stress: member.currentStress };
      }
    }
    return { overloaded: false };
  }
}
