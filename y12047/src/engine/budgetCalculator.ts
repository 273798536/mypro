import type { Member, Node } from '../types';
import { matrixSolver } from './matrixSolver';

export interface BudgetSummary {
  totalCost: number;
  totalBudget: number;
  remaining: number;
  usedPercentage: number;
  memberCosts: Record<string, number>;
  materialBreakdown: Record<string, { cost: number; length: number }>;
}

export class BudgetCalculator {
  calculateMemberCost(member: Member, nodes: Node[]): number {
    const length = matrixSolver.getMemberLength(member, nodes);
    return (length / 100) * member.unitCost;
  }

  calculateTotalCost(members: Member[], nodes: Node[]): number {
    return members.reduce((sum, m) => sum + this.calculateMemberCost(m, nodes), 0);
  }

  calculateBudgetSummary(
    members: Member[],
    nodes: Node[],
    totalBudget: number
  ): BudgetSummary {
    const memberCosts: Record<string, number> = {};
    const materialBreakdown: Record<string, { cost: number; length: number }> = {};

    let totalCost = 0;

    for (const member of members) {
      const cost = this.calculateMemberCost(member, nodes);
      const length = matrixSolver.getMemberLength(member, nodes);

      memberCosts[member.id] = Math.round(cost * 100) / 100;
      totalCost += cost;

      if (!materialBreakdown[member.material]) {
        materialBreakdown[member.material] = { cost: 0, length: 0 };
      }
      materialBreakdown[member.material].cost += cost;
      materialBreakdown[member.material].length += length;
    }

    for (const material of Object.keys(materialBreakdown)) {
      materialBreakdown[material].cost = Math.round(materialBreakdown[material].cost * 100) / 100;
      materialBreakdown[material].length = Math.round(materialBreakdown[material].length * 100) / 100;
    }

    totalCost = Math.round(totalCost * 100) / 100;
    const remaining = Math.round((totalBudget - totalCost) * 100) / 100;
    const usedPercentage = Math.round((totalCost / totalBudget) * 10000) / 100;

    return {
      totalCost,
      totalBudget,
      remaining,
      usedPercentage,
      memberCosts,
      materialBreakdown,
    };
  }

  checkBudgetExceeded(members: Member[], nodes: Node[], totalBudget: number): boolean {
    const totalCost = this.calculateTotalCost(members, nodes);
    return totalCost > totalBudget;
  }

  estimateCostChange(
    originalMember: Member,
    updatedMember: Member,
    nodes: Node[]
  ): number {
    const originalCost = this.calculateMemberCost(originalMember, nodes);
    const newCost = this.calculateMemberCost(updatedMember, nodes);
    return Math.round((newCost - originalCost) * 100) / 100;
  }
}

export const budgetCalculator = new BudgetCalculator();
