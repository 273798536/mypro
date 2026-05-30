import type { Node, Member } from '../types';

interface Constraint {
  nodeId: string;
  direction: 'x' | 'y';
  value: number;
}

export class MatrixSolver {
  private static readonly PRECISION = 1e-10;

  createZeroMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => new Array(cols).fill(0));
  }

  getMemberLength(member: Member, nodes: Node[]): number {
    const startNode = nodes.find(n => n.id === member.startNodeId)!;
    const endNode = nodes.find(n => n.id === member.endNodeId)!;
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  computeLocalStiffnessMatrix(member: Member, nodes: Node[]): number[][] {
    const { crossSection, elasticModulus } = member;
    const L = this.getMemberLength(member, nodes);
    const EA = elasticModulus * 1e9 * crossSection * 1e-4;
    const k = EA / L;

    return [
      [k, 0, -k, 0],
      [0, 0, 0, 0],
      [-k, 0, k, 0],
      [0, 0, 0, 0],
    ];
  }

  computeTransformationMatrix(member: Member, nodes: Node[]): number[][] {
    const startNode = nodes.find(n => n.id === member.startNodeId)!;
    const endNode = nodes.find(n => n.id === member.endNodeId)!;
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    
    const c = dx / L;
    const s = dy / L;

    return [
      [c, s, 0, 0],
      [-s, c, 0, 0],
      [0, 0, c, s],
      [0, 0, -s, c],
    ];
  }

  transformToGlobal(kLocal: number[][], T: number[][]): number[][] {
    const Tinv = this.transposeMatrix(T);
    const temp = this.multiplyMatrices(Tinv, kLocal);
    return this.multiplyMatrices(temp, T);
  }

  getMemberDOFIndices(member: Member, nodes: Node[]): number[] {
    const startIdx = nodes.findIndex(n => n.id === member.startNodeId);
    const endIdx = nodes.findIndex(n => n.id === member.endNodeId);
    return [
      startIdx * 2,
      startIdx * 2 + 1,
      endIdx * 2,
      endIdx * 2 + 1,
    ];
  }

  assembleIntoGlobal(
    K: number[][],
    kGlobal: number[][],
    member: Member,
    nodes: Node[]
  ): void {
    const dofIndices = this.getMemberDOFIndices(member, nodes);
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const gi = dofIndices[i];
        const gj = dofIndices[j];
        K[gi][gj] += kGlobal[i][j];
      }
    }
  }

  assembleGlobalStiffnessMatrix(nodes: Node[], members: Member[]): number[][] {
    const DOF = nodes.length * 2;
    const K = this.createZeroMatrix(DOF, DOF);

    const sortedMembers = [...members].sort((a, b) => a.id.localeCompare(b.id));
    
    for (const member of sortedMembers) {
      const kLocal = this.computeLocalStiffnessMatrix(member, nodes);
      const T = this.computeTransformationMatrix(member, nodes);
      const kGlobal = this.transformToGlobal(kLocal, T);
      this.assembleIntoGlobal(K, kGlobal, member, nodes);
    }

    return K;
  }

  extractConstraints(nodes: Node[]): Constraint[] {
    const constraints: Constraint[] = [];

    for (const node of nodes) {
      switch (node.constraintType) {
        case 'fixed':
          constraints.push({ nodeId: node.id, direction: 'x', value: 0 });
          constraints.push({ nodeId: node.id, direction: 'y', value: 0 });
          break;
        case 'pin':
          constraints.push({ nodeId: node.id, direction: 'x', value: 0 });
          constraints.push({ nodeId: node.id, direction: 'y', value: 0 });
          break;
        case 'roller':
          constraints.push({ nodeId: node.id, direction: 'y', value: 0 });
          break;
      }
    }

    return constraints.sort((a, b) => {
      const nodeCompare = a.nodeId.localeCompare(b.nodeId);
      if (nodeCompare !== 0) return nodeCompare;
      return a.direction.localeCompare(b.direction);
    });
  }

  applyConstraints(
    K: number[][],
    F: number[],
    constraints: Constraint[],
    nodes: Node[]
  ): [number[][], number[]] {
    const n = K.length;
    const K_modified = K.map(row => [...row]);
    const F_modified = [...F];

    for (const constraint of constraints) {
      const nodeIdx = nodes.findIndex(n => n.id === constraint.nodeId);
      const dofIdx = nodeIdx * 2 + (constraint.direction === 'x' ? 0 : 1);

      for (let i = 0; i < n; i++) {
        K_modified[dofIdx][i] = 0;
        K_modified[i][dofIdx] = 0;
      }
      K_modified[dofIdx][dofIdx] = 1;
      F_modified[dofIdx] = constraint.value;
    }

    return [K_modified, F_modified];
  }

  gaussianElimination(A: number[][], b: number[]): number[] {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(aug[i][i]) < MatrixSolver.PRECISION) {
          throw new Error(`矩阵奇异，无法求解（第${i + 1}行主元接近零）`);
        }
        const factor = aug[j][i] / aug[i][i];
        for (let k = i; k <= n; k++) {
          aug[j][k] -= factor * aug[i][k];
          if (Math.abs(aug[j][k]) < MatrixSolver.PRECISION) {
            aug[j][k] = 0;
          }
        }
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      x[i] /= aug[i][i];
      if (Math.abs(x[i]) < MatrixSolver.PRECISION) {
        x[i] = 0;
      }
    }

    return x.map(v => Math.round(v * 1e6) / 1e6);
  }

  extractMemberDisplacements(
    displacements: number[],
    member: Member,
    nodes: Node[]
  ): number[] {
    const dofIndices = this.getMemberDOFIndices(member, nodes);
    return dofIndices.map(i => displacements[i]);
  }

  multiplyMatrixVector(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, aij, j) => sum + aij * v[j], 0));
  }

  multiplyMatrices(A: number[][], B: number[][]): number[][] {
    const rows = A.length;
    const cols = B[0].length;
    const n = B.length;
    const result = this.createZeroMatrix(rows, cols);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        for (let k = 0; k < n; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }

    return result;
  }

  transposeMatrix(A: number[][]): number[][] {
    const rows = A.length;
    const cols = A[0].length;
    const result = this.createZeroMatrix(cols, rows);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = A[i][j];
      }
    }

    return result;
  }

  solveDisplacements(
    K: number[][],
    F: number[],
    nodes: Node[]
  ): number[] {
    const constraints = this.extractConstraints(nodes);
    const [K_modified, F_modified] = this.applyConstraints(K, F, constraints, nodes);
    return this.gaussianElimination(K_modified, F_modified);
  }

  computeMemberForces(
    displacements: number[],
    members: Member[],
    nodes: Node[]
  ): Record<string, number> {
    const forces: Record<string, number> = {};
    const sortedMembers = [...members].sort((a, b) => a.id.localeCompare(b.id));

    for (const member of sortedMembers) {
      const { crossSection, elasticModulus } = member;
      const L = this.getMemberLength(member, nodes);
      const EA = elasticModulus * 1e9 * crossSection * 1e-4;

      const u = this.extractMemberDisplacements(displacements, member, nodes);
      const T = this.computeTransformationMatrix(member, nodes);
      const uLocal = this.multiplyMatrixVector(T, u);

      const N = (EA / L) * (uLocal[2] - uLocal[0]);
      forces[member.id] = Math.round(N * 1e6) / 1e6;
    }

    return forces;
  }

  computeReactions(
    K: number[][],
    displacements: number[],
    F: number[],
    nodes: Node[]
  ): Record<string, { x: number; y: number }> {
    const reactions: Record<string, { x: number; y: number }> = {};
    const allForces = this.multiplyMatrixVector(K, displacements);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const fx = allForces[i * 2] - F[i * 2];
      const fy = allForces[i * 2 + 1] - F[i * 2 + 1];
      
      reactions[node.id] = {
        x: Math.round(fx * 1e6) / 1e6,
        y: Math.round(fy * 1e6) / 1e6,
      };
    }

    return reactions;
  }
}

export const matrixSolver = new MatrixSolver();
