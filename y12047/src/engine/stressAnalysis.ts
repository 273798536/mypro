import type { Node, Member, SimulationResult } from '../types';
import { matrixSolver } from './matrixSolver';

export interface SimulationConfig {
  totalSteps: number;
  loadMagnitude: number;
  startPosition: number;
  endPosition: number;
  loadNodeId?: string;
}

export class StressAnalysisEngine {
  private K: number[][] | null = null;
  private lastNodesHash: string = '';
  private lastMembersHash: string = '';

  private hashData(data: unknown): string {
    return JSON.stringify(data);
  }

  private needsRecompute(nodes: Node[], members: Member[]): boolean {
    const nodesHash = this.hashData(nodes);
    const membersHash = this.hashData(members);
    
    if (nodesHash !== this.lastNodesHash || membersHash !== this.lastMembersHash) {
      this.lastNodesHash = nodesHash;
      this.lastMembersHash = membersHash;
      return true;
    }
    return false;
  }

  private getStiffnessMatrix(nodes: Node[], members: Member[]): number[][] {
    if (!this.K || this.needsRecompute(nodes, members)) {
      this.K = matrixSolver.assembleGlobalStiffnessMatrix(nodes, members);
    }
    return this.K.map(row => [...row]);
  }

  private buildLoadVector(
    nodes: Node[],
    loadPosition: number,
    loadMagnitude: number,
    loadNodeId?: string
  ): number[] {
    const F = new Array(nodes.length * 2).fill(0);

    if (loadNodeId) {
      const nodeIdx = nodes.findIndex(n => n.id === loadNodeId);
      if (nodeIdx !== -1) {
        F[nodeIdx * 2 + 1] = -loadMagnitude;
      }
    } else {
      const loadNodes = nodes.filter(n => n.isLoadPoint).sort((a, b) => a.x - b.x);
      if (loadNodes.length > 0) {
        const totalLength = loadNodes[loadNodes.length - 1].x - loadNodes[0].x;
        const targetX = loadNodes[0].x + (loadPosition / 100) * totalLength;
        
        let closestNode = loadNodes[0];
        let minDist = Math.abs(closestNode.x - targetX);
        
        for (const node of loadNodes) {
          const dist = Math.abs(node.x - targetX);
          if (dist < minDist) {
            minDist = dist;
            closestNode = node;
          }
        }
        
        const nodeIdx = nodes.findIndex(n => n.id === closestNode.id);
        F[nodeIdx * 2 + 1] = -loadMagnitude;
      }
    }

    return F;
  }

  private computeStresses(
    memberForces: Record<string, number>,
    members: Member[]
  ): Record<string, number> {
    const stresses: Record<string, number> = {};
    
    for (const member of members) {
      const force = memberForces[member.id] || 0;
      const areaM2 = member.crossSection * 1e-4;
      const stress = Math.abs(force) / areaM2;
      stresses[member.id] = Math.round(stress * 1e6) / 1e6;
    }
    
    return stresses;
  }

  private findMaxStress(
    stresses: Record<string, number>
  ): { maxStress: number; maxStressMemberId: string } {
    let maxStress = 0;
    let maxStressMemberId = '';
    
    for (const [memberId, stress] of Object.entries(stresses)) {
      if (stress > maxStress) {
        maxStress = stress;
        maxStressMemberId = memberId;
      }
    }
    
    return { maxStress, maxStressMemberId };
  }

  simulateStep(
    nodes: Node[],
    members: Member[],
    loadStep: number,
    config: SimulationConfig
  ): SimulationResult {
    const loadPosition = config.startPosition + 
      (loadStep / config.totalSteps) * (config.endPosition - config.startPosition);

    try {
      const K = this.getStiffnessMatrix(nodes, members);
      const F = this.buildLoadVector(nodes, loadPosition, config.loadMagnitude, config.loadNodeId);

      const displacements = matrixSolver.solveDisplacements(K, F, nodes);
      const memberForces = matrixSolver.computeMemberForces(displacements, members, nodes);
      const reactions = matrixSolver.computeReactions(K, displacements, F, nodes);
      const memberStresses = this.computeStresses(memberForces, members);
      const { maxStress, maxStressMemberId } = this.findMaxStress(memberStresses);

      const totalCost = members.reduce((sum, m) => {
        const L = matrixSolver.getMemberLength(m, nodes);
        return sum + (L / 100) * m.unitCost;
      }, 0);

      return {
        id: `result-${Date.now()}-${loadStep}`,
        versionId: '',
        loadStep,
        loadPosition,
        memberForces,
        memberStresses,
        reactions,
        status: 'running',
        maxStress,
        maxStressMemberId,
        totalCost: Math.round(totalCost * 100) / 100,
        budgetExceeded: false,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      const totalCost = members.reduce((sum, m) => {
        const L = matrixSolver.getMemberLength(m, nodes);
        return sum + (L / 100) * m.unitCost;
      }, 0);

      return {
        id: `error-${Date.now()}-${loadStep}`,
        versionId: '',
        loadStep,
        loadPosition,
        memberForces: {},
        memberStresses: {},
        reactions: {},
        status: 'failed',
        failureReason: (e as Error).message,
        error: (e as Error).message,
        maxStress: Infinity,
        maxStressMemberId: '',
        totalCost: Math.round(totalCost * 100) / 100,
        budgetExceeded: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  simulateAllSteps(
    nodes: Node[],
    members: Member[],
    config: SimulationConfig,
    onProgress?: (step: number, result: SimulationResult) => void
  ): SimulationResult[] {
    const results: SimulationResult[] = [];
    
    for (let step = 0; step <= config.totalSteps; step++) {
      const result = this.simulateStep(nodes, members, step, config);
      results.push(result);
      
      if (onProgress) {
        onProgress(step, result);
      }
    }
    
    return results;
  }

  clearCache(): void {
    this.K = null;
    this.lastNodesHash = '';
    this.lastMembersHash = '';
  }
}

export const stressAnalysisEngine = new StressAnalysisEngine();
