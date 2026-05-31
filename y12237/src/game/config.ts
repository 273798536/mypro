import { ValidatorNode } from './types';

export const GAME_CONFIG = {
  INITIAL_BALANCE: 10000,
  MAX_ROUNDS: 10,
  REWARD_SETTLEMENT_INTERVAL: 3,
  UNLOCK_MISCLICK_THRESHOLD: 2,
  DUPLICATE_PENALTY_MULTIPLIER: 1.3,
};

export const RISK_LEVEL_CONFIG = {
  low: {
    label: '低风险',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    offlineChance: 0.005,
    basePenaltyRate: 0.02,
  },
  medium: {
    label: '中风险',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    offlineChance: 0.022,
    basePenaltyRate: 0.03,
  },
  high: {
    label: '高风险',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
    offlineChance: 0.077,
    basePenaltyRate: 0.04,
  },
  extreme: {
    label: '极高风险',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    offlineChance: 0.15,
    basePenaltyRate: 0.05,
  },
};

export const VALIDATOR_NODES: ValidatorNode[] = [
  {
    id: 'node-alpha',
    name: '稳健节点 Alpha',
    avatar: '🛡️',
    uptime: 99.5,
    yieldRate: 4.2,
    penaltyCoefficient: 0.8,
    riskLevel: 'low',
    isOnline: true,
    description: '企业级节点运营商，99.9% SLA保障，适合稳健型投资者',
  },
  {
    id: 'node-beta',
    name: '平衡节点 Beta',
    avatar: '⚖️',
    uptime: 97.8,
    yieldRate: 5.8,
    penaltyCoefficient: 1.0,
    riskLevel: 'medium',
    isOnline: true,
    description: '专业矿池运营，收益与风险平衡，适合大多数投资者',
  },
  {
    id: 'node-gamma',
    name: '高收益节点 Gamma',
    avatar: '⚡',
    uptime: 92.3,
    yieldRate: 8.5,
    penaltyCoefficient: 1.5,
    riskLevel: 'high',
    isOnline: true,
    description: '创新型节点，高收益伴随较高离线风险，适合激进投资者',
  },
  {
    id: 'node-delta',
    name: '实验节点 Delta',
    avatar: '🧪',
    uptime: 85.0,
    yieldRate: 12.0,
    penaltyCoefficient: 2.0,
    riskLevel: 'extreme',
    isOnline: true,
    description: '测试网节点，极高收益但不稳定，仅用于教学演示',
  },
];

export const PENALTY_TEMPLATES = {
  offline: {
    title: '⚠️ 离线惩罚触发',
    reasonTemplate: (nodeName: string, round: number, uptime: number, riskLevel: string) => [
      `节点「${nodeName}」在第 ${round} 回合检测到离线状态`,
      `该节点历史在线率为 ${uptime}%，属于${riskLevel}风险节点`,
      `本次离线持续时间：1 回合`,
    ],
    formula: '惩罚金额 = 该节点质押金额 × 基础惩罚率 × 节点惩罚系数',
    suggestions: [
      '立即转移部分质押至高在线率节点（>98%）',
      '设置节点离线告警通知，及时响应异常',
      '分散质押到多个节点，降低单点故障风险',
      '下次选择节点时，优先查看近30天在线率数据',
    ],
  },
  duplicate: {
    title: '🔄 重复质押风险提示',
    reasonTemplate: (nodeName: string) => [
      `您已在节点「${nodeName}」存在质押记录`,
      `重复质押将使该节点的惩罚系数增加 30%`,
      `集中质押增加了单点风险敞口`,
    ],
    formula: '惩罚系数增幅 = 1.3 × 质押次数',
    suggestions: [
      '考虑分散质押至不同节点',
      '评估单一节点集中度风险',
      '设置单节点质押上限（建议不超过总资金30%）',
    ],
  },
  unlock_misclick: {
    title: '⏰ 解锁误点惩罚',
    reasonTemplate: (round: number, settlementRound: number) => [
      `您在第 ${round} 回合申请解锁`,
      `距离奖励结算日（第 ${settlementRound} 回合）不足 2 回合`,
      `提前解锁将损失 50% 的预期累计奖励`,
    ],
    formula: '惩罚金额 = 预期奖励 × 50%',
    suggestions: [
      '提前规划解锁时机，避开结算日前2回合',
      '设置日历提醒，标记重要结算日期',
      '紧急解锁前核算机会成本',
      '小额资金可随时解锁，大额建议等待结算',
    ],
  },
};
