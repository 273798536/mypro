import type { NodeState, NetworkEvent, DecisionOption } from '@/types';

export const initialNodes: NodeState[] = [
  {
    id: 'node-001',
    name: '阿尔法节点',
    syncProgress: 85,
    stakeAmount: 1000,
    isOnline: true,
    healthScore: 90,
    hasDuplicateStake: false,
    consecutiveOfflineRounds: 0,
    syncLagRounds: 0,
  },
  {
    id: 'node-002',
    name: '贝塔节点',
    syncProgress: 92,
    stakeAmount: 1000,
    isOnline: true,
    healthScore: 88,
    hasDuplicateStake: false,
    consecutiveOfflineRounds: 0,
    syncLagRounds: 0,
  },
  {
    id: 'node-003',
    name: '伽马节点',
    syncProgress: 78,
    stakeAmount: 1000,
    isOnline: true,
    healthScore: 85,
    hasDuplicateStake: false,
    consecutiveOfflineRounds: 0,
    syncLagRounds: 0,
  },
];

export const badNodeExample: NodeState = {
  id: 'node-bad-001',
  name: '故障演示节点',
  syncProgress: 0,
  stakeAmount: 1000,
  isOnline: false,
  healthScore: 15,
  hasDuplicateStake: true,
  consecutiveOfflineRounds: 5,
  syncLagRounds: 8,
};

export const networkEventPool: Omit<NetworkEvent, 'round'>[] = [
  {
    id: 'evt-001',
    message: '网络拥堵：区块确认延迟增加',
    severity: 'warning',
    effect: { syncProgress: -5 },
  },
  {
    id: 'evt-002',
    message: '检测到异常质押操作',
    severity: 'error',
    effect: { hasDuplicateStake: true },
  },
  {
    id: 'evt-003',
    message: '节点连接不稳定',
    severity: 'warning',
    effect: { isOnline: false },
  },
  {
    id: 'evt-004',
    message: '新版本发布，建议同步升级',
    severity: 'info',
    effect: { syncProgress: -10 },
  },
  {
    id: 'evt-005',
    message: '网络攻击预警：异常流量检测',
    severity: 'error',
    effect: { healthScore: -15 },
  },
  {
    id: 'evt-006',
    message: '链上数据同步正常',
    severity: 'info',
    effect: { syncProgress: 5 },
  },
  {
    id: 'evt-007',
    message: '节点性能优化生效',
    severity: 'info',
    effect: { healthScore: 10 },
  },
  {
    id: 'evt-008',
    message: '硬件故障警报',
    severity: 'error',
    effect: { isOnline: false, healthScore: -20 },
  },
];

export const decisionOptionPool: Omit<DecisionOption, 'id'>[] = [
  {
    title: '集中资源加速A节点同步',
    description: '消耗20资源点，将节点A同步提升15%，但节点B离线风险增加',
    effects: {
      syncChange: 15,
      resourceCost: 20,
      onlineChange: false,
    },
  },
  {
    title: '优先保障B节点在线',
    description: '消耗15资源点，确保节点B在线，但节点A同步落后加剧',
    effects: {
      syncChange: -8,
      resourceCost: 15,
      onlineChange: true,
    },
  },
  {
    title: '均衡分配资源',
    description: '消耗10资源点，所有节点同步+5%，无额外风险',
    effects: {
      syncChange: 5,
      resourceCost: 10,
    },
  },
  {
    title: '紧急修复重复质押',
    description: '消耗25资源点，清除重复质押标记，避免惩罚',
    effects: {
      resourceCost: 25,
    },
  },
  {
    title: '重启离线节点',
    description: '消耗30资源点，强制节点重新上线',
    effects: {
      resourceCost: 30,
      onlineChange: true,
    },
  },
  {
    title: '暂时忽略问题',
    description: '不消耗资源，但问题可能恶化',
    effects: {
      resourceCost: 0,
      syncChange: -3,
      penaltyRisk: 30,
    },
  },
];

export const generateRoundDecisions = (round: number, pendingCount: number): DecisionOption[] => {
  const options: DecisionOption[] = [];
  
  if (pendingCount > 0) {
    options.push({
      id: `opt-${round}-1`,
      title: '处理待确认事项',
      description: '消耗25资源点，解决当前待确认问题',
      effects: {
        resourceCost: 25,
      },
    });
  }
  
  options.push({
    id: `opt-${round}-2`,
    title: '集中资源提升同步',
    description: '消耗20资源点，所有节点同步+12%',
    effects: {
      syncChange: 12,
      resourceCost: 20,
    },
  });
  
  options.push({
    id: `opt-${round}-3`,
    title: '加固节点防御',
    description: '消耗15资源点，提升健康分+10，降低离线风险',
    effects: {
      resourceCost: 15,
    },
  });
  
  options.push({
    id: `opt-${round}-4`,
    title: '观察等待',
    description: '不消耗资源，回合自然推进',
    effects: {
      resourceCost: 0,
      syncChange: -5,
      penaltyRisk: 20,
    },
  });
  
  return options.slice(0, 3);
};
