import type { Node, Member, SimulationResult, JudgeResult } from '../types';
import { matrixSolver } from './matrixSolver';

export class ResultJudge {
  private static readonly MISALIGNMENT_THRESHOLD = 15;

  private getMemberLength(member: Member, nodes: Node[]): number {
    return matrixSolver.getMemberLength(member, nodes);
  }

  checkOverload(
    stresses: Record<string, number>,
    members: Member[]
  ): JudgeResult {
    const sortedMembers = [...members].sort((a, b) => a.id.localeCompare(b.id));
    
    for (const member of sortedMembers) {
      const stress = stresses[member.id];
      if (stress === undefined) continue;
      
      const yieldStressPa = member.yieldStrength * 1e6;
      const ratio = stress / yieldStressPa;

      if (ratio > 1.0) {
        return {
          passed: false,
          reason: 'member_overload',
          message: `杆件#${member.id}应力过载：${(stress / 1e6).toFixed(1)}MPa，屈服强度${member.yieldStrength}MPa，比值${ratio.toFixed(2)}`,
          memberId: member.id,
          data: { stress, yieldStrength: member.yieldStrength, ratio },
        };
      }
    }

    return { passed: true };
  }

  checkSupportMisalignment(
    reactions: Record<string, { x: number; y: number }>,
    nodes: Node[]
  ): JudgeResult {
    const totalDOF = nodes.length * 2;
    let constraintCount = 0;
    for (const node of nodes) {
      if (node.constraintType === 'fixed') constraintCount += 2;
      else if (node.constraintType === 'pin') constraintCount += 2;
      else if (node.constraintType === 'roller') constraintCount += 1;
    }
    if (constraintCount < 3) {
      return {
        passed: false,
        reason: 'support_misalignment',
        message: `约束不足：仅${constraintCount}个约束DOF（最少需要3个），结构为机构`,
        data: { constraintCount, minRequired: 3 },
      };
    }
    
    const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    
    for (const node of sortedNodes) {
      if (node.constraintType === 'roller') {
        const reaction = reactions[node.id];
        if (reaction && Math.abs(reaction.x) > 1e-3) {
          const totalForce = Math.sqrt(reaction.x * reaction.x + reaction.y * reaction.y);
          if (totalForce > 1e-3) {
            const angle = Math.atan2(Math.abs(reaction.x), Math.abs(reaction.y)) * 180 / Math.PI;
            if (angle > ResultJudge.MISALIGNMENT_THRESHOLD) {
              return {
                passed: false,
                reason: 'support_misalignment',
                message: `支点#${node.id}约束反力偏差${angle.toFixed(1)}°，超过阈值${ResultJudge.MISALIGNMENT_THRESHOLD}°`,
                nodeId: node.id,
                data: { angle, threshold: ResultJudge.MISALIGNMENT_THRESHOLD, reaction },
              };
            }
          }
        }
      }
    }

    return { passed: true };
  }

  checkSolverError(result: SimulationResult): JudgeResult {
    if (result.status === 'failed' || result.error) {
      return {
        passed: false,
        reason: 'solver_error',
        message: result.error || result.failureReason || '求解器失败：结构可能不稳定或约束不足',
        data: { error: result.error },
      };
    }
    return { passed: true };
  }

  checkBudget(members: Member[], nodes: Node[], totalBudget: number): JudgeResult {
    const totalCost = members.reduce((sum, m) => {
      const length = this.getMemberLength(m, nodes);
      return sum + (length / 100) * m.unitCost;
    }, 0);

    if (totalCost > totalBudget) {
      return {
        passed: false,
        reason: 'over_budget',
        message: `预算超支：总造价¥${totalCost.toFixed(0)}，预算¥${totalBudget}，超支¥${(totalCost - totalBudget).toFixed(0)}`,
        data: { totalCost, totalBudget, overrun: totalCost - totalBudget },
      };
    }

    return { passed: true };
  }

  calculateTotalCost(members: Member[], nodes: Node[]): number {
    return members.reduce((sum, m) => {
      const length = this.getMemberLength(m, nodes);
      return sum + (length / 100 * m.unitCost);
    }, 0);
  }

  judgeAll(
    result: SimulationResult,
    members: Member[],
    nodes: Node[],
    budget: number
  ): JudgeResult {
    const solverResult = this.checkSolverError(result);
    const overloadResult = this.checkOverload(result.memberStresses, members);
    const misalignmentResult = this.checkSupportMisalignment(result.reactions, nodes);
    const budgetResult = this.checkBudget(members, nodes, budget);

    const details = {
      overload: !overloadResult.passed,
      misalignment: !misalignmentResult.passed || !solverResult.passed,
      overbudget: !budgetResult.passed,
    };

    if (!solverResult.passed) {
      return {
        ...solverResult,
        reason: 'support_misalignment',
        message: `支点错位：${solverResult.message}`,
        details,
      };
    }

    const failed = [overloadResult, misalignmentResult, budgetResult].find(r => !r.passed);
    if (failed) {
      return { ...failed, details };
    }
    return { passed: true, message: '所有检查通过', details };
  }
}

export const resultJudge = new ResultJudge();
