import { Fund, RouteBranch, MazeNode, IndustryGate } from '@/types';
import { calculateIndustryConcentration, getMaxConcentration } from './risk';

export function determineRouteBranch(
  selectedFund: Fund,
  portfolio: Record<string, number>,
  funds: Fund[],
  industryGates: IndustryGate[]
): { branch: RouteBranch; reason: string } {
  const concentration = calculateIndustryConcentration(portfolio, funds);
  const maxConc = getMaxConcentration(concentration);
  
  const fundIndustryId = selectedFund.industryId;
  const fundConcentration = fundIndustryId ? concentration[fundIndustryId] || 0 : 0;
  
  const industryGate = industryGates.find(g => g.industryId === fundIndustryId);
  const overallGate = industryGates.find(g => g.industryId === null);
  
  if (selectedFund.riskLevel >= 4 && fundConcentration > 0.3) {
    return {
      branch: 'C',
      reason: `选择高风险${selectedFund.industryName || '基金'}，行业集中度${(fundConcentration * 100).toFixed(0)}%，进入高风险路线`,
    };
  }
  
  if (industryGate && fundConcentration > industryGate.maxConcentration) {
    return {
      branch: 'B',
      reason: `${selectedFund.industryName}行业持仓${(fundConcentration * 100).toFixed(0)}%，超过阈值${(industryGate.maxConcentration * 100).toFixed(0)}%，触发行业门`,
    };
  }
  
  if (overallGate && maxConc > overallGate.maxConcentration) {
    return {
      branch: 'B',
      reason: `最高行业集中度${(maxConc * 100).toFixed(0)}%，超过整体阈值，触发整体风险门`,
    };
  }
  
  if (selectedFund.riskLevel <= 2 && fundConcentration < 0.2) {
    return {
      branch: 'A',
      reason: `选择${selectedFund.riskLevel <= 2 ? '低风险' : '稳健'}基金，行业配置均衡，进入稳健路线`,
    };
  }
  
  if (selectedFund.isHot) {
    return {
      branch: 'B',
      reason: `追涨热门基金"${selectedFund.name}"，进入波动路线`,
    };
  }
  
  return {
    branch: 'A',
    reason: `选择"${selectedFund.name}"，配置合理，进入常规路线`,
  };
}

export function getNextNode(
  currentNode: MazeNode,
  branch: RouteBranch
): string | null {
  const connection = currentNode.connections.find(c => c.branch === branch);
  if (connection) {
    return connection.nodeId;
  }
  
  if (currentNode.connections.length > 0) {
    return currentNode.connections[0].nodeId;
  }
  
  return null;
}

export function getAvailableFunds(
  node: MazeNode,
  allFunds: Fund[],
  step: number
): Fund[] {
  const seed = node.id.charCodeAt(node.id.length - 1) + step;
  
  const shuffled = [...allFunds].sort((a, b) => {
    const aScore = (a.expectedReturn * 100 + a.riskLevel * 10 + seed) % 100;
    const bScore = (b.expectedReturn * 100 + b.riskLevel * 10 + seed) % 100;
    return bScore - aScore;
  });
  
  return shuffled.slice(0, 3);
}

export function calculateNodeReturn(
  node: MazeNode,
  branch: RouteBranch,
  fund: Fund
): number {
  const baseReturn = fund.expectedReturn / 8;
  
  const branchMultiplier: Record<RouteBranch, number> = {
    'A': 1.0,
    'B': 0.7,
    'C': 0.5,
  };
  
  if (node.type === 'event') {
    if (node.eventType === 'market_crash') {
      return -0.08;
    }
    if (node.eventType === 'fee_surge') {
      return baseReturn * 0.5;
    }
    if (node.eventType === 'black_swan') {
      return -0.15;
    }
  }
  
  return baseReturn * (branchMultiplier[branch] || 1);
}
