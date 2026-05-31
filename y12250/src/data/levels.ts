import type { Level, MazeNode } from '../engine/types';

export const LEVELS: Level[] = [
  {
    id: 'level-1',
    name: '新手村：稳定市场',
    difficulty: 1,
    safetyRatio: 150,
    liquidationRatio: 110,
    description:
      'ETH价格稳定，Gas费用正常。学习基本的抵押率管理，避开简单的价格波动陷阱。',
    startNodeId: 'node-1-1',
    endNodeId: 'node-1-5',
    positionId: 'pos-001',
    initialGas: 500,
  },
  {
    id: 'level-2',
    name: '波动区：价格跳变',
    difficulty: 2,
    safetyRatio: 160,
    liquidationRatio: 120,
    description:
      'ETH波动率上升，存在价格跳变风险。关键节点可能触发价格暴跌，需要预留足够安全边际。',
    startNodeId: 'node-2-1',
    endNodeId: 'node-2-6',
    positionId: 'pos-003',
    initialGas: 400,
  },
  {
    id: 'level-3',
    name: '拥堵链：Gas战争',
    difficulty: 3,
    safetyRatio: 170,
    liquidationRatio: 130,
    description:
      '网络严重拥堵，Gas价格飙升。每步操作都要精打细算，避免Gas耗尽导致清算失败。',
    startNodeId: 'node-3-1',
    endNodeId: 'node-3-6',
    positionId: 'pos-002',
    initialGas: 300,
  },
];

export const MAZE_NODES: Record<string, MazeNode[]> = {
  'level-1': [
    {
      id: 'node-1-1',
      x: 80,
      y: 200,
      type: 'start',
      label: '起点',
      description: '你的初始仓位：5 ETH抵押，借出10,000 USDC',
      choices: [
        {
          id: 'choice-1-1-a',
          label: '维持现状',
          description: '不做操作，观察市场变化',
          nextNodeId: 'node-1-2',
          impact: {},
          ruleHint: '规则：不操作意味着被动承受价格波动。',
        },
        {
          id: 'choice-1-1-b',
          label: '补充0.5 ETH抵押物',
          description: '增加抵押物提升安全边际',
          nextNodeId: 'node-1-2',
          impact: {
            collateralChange: 0.5,
            gasChange: -30,
          },
          ruleHint: '规则：增加抵押物可提升抵押率。',
        },
      ],
    },
    {
      id: 'node-1-2',
      x: 250,
      y: 120,
      type: 'decision',
      label: '决策点 A',
      description: 'ETH价格小幅波动，抵押率变化',
      priceJumpChance: 0.1,
      gasCost: 20,
      choices: [
        {
          id: 'choice-1-2-a',
          label: '部分还款 1000 USDC',
          description: '偿还部分债务降低清算风险',
          nextNodeId: 'node-1-3',
          impact: {
            debtChange: -1000,
            gasChange: -40,
          },
          ruleHint: '规则：还款降低债务，抵押率上升。',
        },
        {
          id: 'choice-1-2-b',
          label: '继续持有',
          description: '相信价格会回升',
          nextNodeId: 'node-1-3',
          impact: {
            gasChange: -10,
          },
          ruleHint: '规则：持有期间需承担价格波动风险。',
        },
      ],
    },
    {
      id: 'node-1-3',
      x: 420,
      y: 200,
      type: 'risk',
      label: '风险点',
      description: '⚠️ 市场波动加剧，注意风险',
      priceJumpChance: 0.3,
      gasCost: 30,
      choices: [
        {
          id: 'choice-1-3-a',
          label: '置换1 ETH为稳定币',
          description: '降低波动资产比例',
          nextNodeId: 'node-1-4',
          impact: {
            priceVolatilityMultiplier: 0.5,
            gasChange: -50,
          },
          ruleHint: '规则：稳定币价格波动小，但需支付交易手续费。',
        },
        {
          id: 'choice-1-3-b',
          label: '等待观望',
          description: '等待市场明朗再决策',
          nextNodeId: 'node-1-4',
          impact: {
            gasChange: -5,
            priceVolatilityMultiplier: 1.2,
          },
          ruleHint: '规则：等待可能错过最佳操作时机。',
        },
      ],
    },
    {
      id: 'node-1-4',
      x: 590,
      y: 120,
      type: 'decision',
      label: '决策点 B',
      description: '接近清算周期，需要最终决策',
      priceJumpChance: 0.2,
      gasCost: 25,
      choices: [
        {
          id: 'choice-1-4-a',
          label: '委托清算人',
          description: '支付5%清算奖励，委托专业清算人',
          nextNodeId: 'node-1-5',
          impact: {
            collateralChange: -0.25,
            gasChange: -20,
          },
          ruleHint: '规则：委托清算可获得优先Gas处理权。',
        },
        {
          id: 'choice-1-4-b',
          label: '自行清算',
          description: '自己发起清算交易',
          nextNodeId: 'node-1-5',
          impact: {
            gasChange: -80,
          },
          ruleHint: '规则：自行清算节省费用但需承担Gas竞争风险。',
        },
      ],
    },
    {
      id: 'node-1-5',
      x: 760,
      y: 200,
      type: 'end',
      label: '终点',
      description: '成功维持抵押率在安全线以上，仓位安全！',
      choices: [],
    },
  ],
  'level-2': [
    {
      id: 'node-2-1',
      x: 80,
      y: 200,
      type: 'start',
      label: '起点',
      description: '高波动率市场：12 ETH抵押，借出25,000 DAI',
      choices: [
        {
          id: 'choice-2-1-a',
          label: '立即补充2 ETH',
          description: '提升安全边际应对高波动',
          nextNodeId: 'node-2-2',
          impact: {
            collateralChange: 2,
            gasChange: -40,
          },
          ruleHint: '规则：高波动市场建议额外增加20%安全边际。',
        },
        {
          id: 'choice-2-1-b',
          label: '设置止损触发',
          description: '价格下跌时自动清算',
          nextNodeId: 'node-2-2',
          impact: {
            gasChange: -20,
            priceVolatilityMultiplier: 0.9,
          },
          ruleHint: '规则：自动化止损可减少人为反应延迟。',
        },
      ],
    },
    {
      id: 'node-2-2',
      x: 250,
      y: 80,
      type: 'risk',
      label: '风险点 1',
      description: '⚠️ 波动率上升，可能触发价格跳变',
      priceJumpChance: 0.4,
      gasCost: 35,
      choices: [
        {
          id: 'choice-2-2-a',
          label: '偿还5000 DAI',
          description: '主动降低债务',
          nextNodeId: 'node-2-3',
          impact: {
            debtChange: -5000,
            gasChange: -45,
          },
          ruleHint: '规则：降低债务是提升抵押率最直接的方式。',
        },
        {
          id: 'choice-2-2-b',
          label: '借入更多Dai加抵押',
          description: '杠杆循环提升抵押率',
          nextNodeId: 'node-2-3',
          impact: {
            debtChange: 3000,
            collateralChange: 1,
            gasChange: -60,
          },
          ruleHint: '规则：循环抵押提升名义抵押率但增加了债务总量。',
        },
      ],
    },
    {
      id: 'node-2-3',
      x: 420,
      y: 200,
      type: 'decision',
      label: '决策点 A',
      description: '市场剧烈震荡，预言机价格更新延迟',
      priceJumpChance: 0.5,
      gasCost: 40,
      choices: [
        {
          id: 'choice-2-3-a',
          label: '使用闪电贷应急',
          description: '临时借入流动性偿还债务',
          nextNodeId: 'node-2-4',
          impact: {
            debtChange: -3000,
            gasChange: -100,
          },
          ruleHint: '规则：闪电贷需在同一交易内偿还，手续费0.3%。',
        },
        {
          id: 'choice-2-3-b',
          label: '等待预言机更新',
          description: '相信价格会回调',
          nextNodeId: 'node-2-4',
          impact: {
            gasChange: -10,
            priceVolatilityMultiplier: 1.5,
          },
          ruleHint: '规则：预言机更新可能滞后于市场真实价格。',
        },
      ],
    },
    {
      id: 'node-2-4',
      x: 590,
      y: 80,
      type: 'risk',
      label: '风险点 2',
      description: '⚠️ 关键风险点：大概率触发价格跳变',
      priceJumpChance: 0.7,
      gasCost: 50,
      choices: [
        {
          id: 'choice-2-4-a',
          label: '紧急清算50%仓位',
          description: '主动清算部分降低风险',
          nextNodeId: 'node-2-5',
          impact: {
            collateralChange: -5,
            debtChange: -12000,
            gasChange: -80,
          },
          ruleHint: '规则：主动部分清算可避免被强制全额清算。',
        },
        {
          id: 'choice-2-4-b',
          label: '全仓持有赌反弹',
          description: '高风险高收益',
          nextNodeId: 'node-2-5',
          impact: {
            gasChange: -5,
            priceVolatilityMultiplier: 2,
          },
          ruleHint: '规则：高波动下全仓持有可能瞬间击穿清算线。',
        },
      ],
    },
    {
      id: 'node-2-5',
      x: 760,
      y: 200,
      type: 'decision',
      label: '决策点 B',
      description: '最终清算窗口',
      priceJumpChance: 0.3,
      gasCost: 30,
      choices: [
        {
          id: 'choice-2-5-a',
          label: '完成清算',
          description: '成功维持仓位安全',
          nextNodeId: 'node-2-6',
          impact: {
            gasChange: -50,
          },
          ruleHint: '规则：清算完成后债务结清，仓位安全。',
        },
        {
          id: 'choice-2-5-b',
          label: '继续持有仓位',
          description: '不进行清算，继续承担风险',
          nextNodeId: 'node-2-6',
          impact: {
            gasChange: -10,
            priceVolatilityMultiplier: 1.3,
          },
          ruleHint: '规则：不清算意味着继续承担所有市场风险。',
        },
      ],
    },
    {
      id: 'node-2-6',
      x: 900,
      y: 200,
      type: 'end',
      label: '终点',
      description: '高波动市场挑战完成！',
      choices: [],
    },
  ],
  'level-3': [
    {
      id: 'node-3-1',
      x: 80,
      y: 200,
      type: 'start',
      label: '起点',
      description: '拥堵网络：20 ETH + 1 BTC抵押，借出50,000 USDT',
      choices: [
        {
          id: 'choice-3-1-a',
          label: '设置高Gas价格',
          description: '确保交易优先打包',
          nextNodeId: 'node-3-2',
          impact: {
            gasChange: -60,
          },
          ruleHint: '规则：高Gas价格交易优先被矿工打包。',
        },
        {
          id: 'choice-3-1-b',
          label: '使用Flashbots保护',
          description: '避免抢跑和MEV',
          nextNodeId: 'node-3-2',
          impact: {
            gasChange: -40,
          },
          ruleHint: '规则：Flashbots可保护交易不被公开内存池抢跑。',
        },
      ],
    },
    {
      id: 'node-3-2',
      x: 250,
      y: 80,
      type: 'risk',
      label: 'Gas高峰',
      description: '⚠️ 网络极度拥堵，Gas价格飙升3倍',
      priceJumpChance: 0.2,
      gasCost: 80,
      choices: [
        {
          id: 'choice-3-2-a',
          label: '支付溢价Gas',
          description: '确保交易立即执行',
          nextNodeId: 'node-3-3',
          impact: {
            gasChange: -120,
          },
          ruleHint: '规则：拥堵时可能需要支付2-5倍的正常Gas。',
        },
        {
          id: 'choice-3-2-b',
          label: '等待Gas下降',
          description: '延迟交易节省成本',
          nextNodeId: 'node-3-3',
          impact: {
            gasChange: -30,
            priceVolatilityMultiplier: 1.4,
          },
          ruleHint: '规则：等待可能错过清算窗口导致更大损失。',
        },
      ],
    },
    {
      id: 'node-3-3',
      x: 420,
      y: 200,
      type: 'decision',
      label: '决策点 A',
      description: '多个清算人竞争同一仓位',
      priceJumpChance: 0.3,
      gasCost: 60,
      choices: [
        {
          id: 'choice-3-3-a',
          label: '提升Gas价格抢跑',
          description: '用更高Gas击败竞争对手',
          nextNodeId: 'node-3-4',
          impact: {
            gasChange: -100,
          },
          ruleHint: '规则：Gas价格最高的交易优先被打包。',
        },
        {
          id: 'choice-3-3-b',
          label: '合并多笔清算',
          description: '批量清算节省Gas',
          nextNodeId: 'node-3-4',
          impact: {
            gasChange: -50,
          },
          ruleHint: '规则：批量清算可分摊固定Gas成本。',
        },
      ],
    },
    {
      id: 'node-3-4',
      x: 590,
      y: 80,
      type: 'risk',
      label: 'MEV攻击',
      description: '⚠️ 检测到清算机器人抢跑攻击',
      priceJumpChance: 0.25,
      gasCost: 70,
      choices: [
        {
          id: 'choice-3-4-a',
          label: '使用私有交易池',
          description: '隐藏交易避免被抢跑',
          nextNodeId: 'node-3-5',
          impact: {
            gasChange: -80,
          },
          ruleHint: '规则：私有交易池不公开内存池，可防御MEV。',
        },
        {
          id: 'choice-3-4-b',
          label: '提高清算奖励',
          description: '增加激励吸引诚实清算人',
          nextNodeId: 'node-3-5',
          impact: {
            collateralChange: -0.5,
            gasChange: -40,
          },
          ruleHint: '规则：更高的清算奖励可吸引更多清算人竞争。',
        },
      ],
    },
    {
      id: 'node-3-5',
      x: 760,
      y: 200,
      type: 'decision',
      label: '决策点 B',
      description: '最终清算确认',
      priceJumpChance: 0.2,
      gasCost: 50,
      choices: [
        {
          id: 'choice-3-5-a',
          label: '提交清算交易',
          description: '完成最终清算',
          nextNodeId: 'node-3-6',
          impact: {
            gasChange: -60,
          },
          ruleHint: '规则：清算交易需要足够的Gas才能成功上链。',
        },
        {
          id: 'choice-3-5-b',
          label: '再等一个区块',
          description: '希望Gas下降',
          nextNodeId: 'node-3-6',
          impact: {
            gasChange: -20,
            priceVolatilityMultiplier: 1.2,
          },
          ruleHint: '规则：每个区块约12秒，期间价格可能继续变化。',
        },
      ],
    },
    {
      id: 'node-3-6',
      x: 900,
      y: 200,
      type: 'end',
      label: '终点',
      description: '拥堵网络挑战完成！',
      choices: [],
    },
  ],
};

export function getLevelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getMazeNodes(levelId: string): MazeNode[] {
  return MAZE_NODES[levelId] || [];
}

export function getMazeNode(levelId: string, nodeId: string): MazeNode | undefined {
  return MAZE_NODES[levelId]?.find((n) => n.id === nodeId);
}

export function getLevelName(levelId: string): string {
  const level = getLevelById(levelId);
  return level?.name || '未知关卡';
}
