import { Scenario, Position, PricePoint } from '../types/game';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const scenarios: Scenario[] = [
  {
    id: 'tutorial',
    name: '新手教程',
    description: '10回合平稳行情，学习基本操作和一次价格跳变处理',
    totalRounds: 10,
    difficulty: 'easy',
    initialPosition: {
      borrowAmount: 10000,
      collateralAmount: 6,
      collateralType: 'ETH',
      collateralPrice: 3000,
      liquidationThreshold: 150,
      liquidationPrice: 2083.33,
    },
    priceEvents: [
      { round: 1, type: 'normal', priceChange: 0.02 },
      { round: 2, type: 'normal', priceChange: -0.01 },
      { round: 3, type: 'normal', priceChange: 0.03 },
      { round: 4, type: 'jump', priceChange: -0.18, isMalicious: true, verifier: 'Chainlink节点验证' },
      { round: 5, type: 'normal', priceChange: 0.01 },
      { round: 6, type: 'normal', priceChange: 0.02 },
      { round: 7, type: 'normal', priceChange: -0.02 },
      { round: 8, type: 'normal', priceChange: 0.01 },
      { round: 9, type: 'normal', priceChange: 0.02 },
      { round: 10, type: 'normal', priceChange: -0.01 },
    ],
  },
  {
    id: 'eth_crash',
    name: 'ETH暴跌',
    description: '15回合模拟极端行情，ETH价格暴跌30%',
    totalRounds: 15,
    difficulty: 'normal',
    initialPosition: {
      borrowAmount: 15000,
      collateralAmount: 8,
      collateralType: 'ETH',
      collateralPrice: 3200,
      liquidationThreshold: 150,
      liquidationPrice: 2343.75,
    },
    priceEvents: [
      { round: 1, type: 'normal', priceChange: 0.01 },
      { round: 2, type: 'normal', priceChange: -0.02 },
      { round: 3, type: 'crash', priceChange: -0.08 },
      { round: 4, type: 'crash', priceChange: -0.1 },
      { round: 5, type: 'crash', priceChange: -0.12 },
      { round: 6, type: 'normal', priceChange: 0.03 },
      { round: 7, type: 'normal', priceChange: 0.02 },
      { round: 8, type: 'jump', priceChange: 0.15, isMalicious: false, verifier: '多节点交叉验证' },
      { round: 9, type: 'normal', priceChange: -0.03 },
      { round: 10, type: 'normal', priceChange: -0.02 },
      { round: 11, type: 'normal', priceChange: 0.01 },
      { round: 12, type: 'crash', priceChange: -0.05 },
      { round: 13, type: 'normal', priceChange: 0.02 },
      { round: 14, type: 'normal', priceChange: 0.01 },
      { round: 15, type: 'normal', priceChange: 0.02 },
    ],
  },
  {
    id: 'oracle_attack',
    name: '预言机攻击',
    description: '12回合包含2次恶意价格报点，考验异常识别能力',
    totalRounds: 12,
    difficulty: 'hard',
    initialPosition: {
      borrowAmount: 20000,
      collateralAmount: 10,
      collateralType: 'ETH',
      collateralPrice: 3500,
      liquidationThreshold: 150,
      liquidationPrice: 2857.14,
    },
    priceEvents: [
      { round: 1, type: 'normal', priceChange: 0.01 },
      { round: 2, type: 'jump', priceChange: -0.25, isMalicious: true, verifier: 'Chainlink喂价验证' },
      { round: 3, type: 'normal', priceChange: 0.02 },
      { round: 4, type: 'normal', priceChange: -0.01 },
      { round: 5, type: 'normal', priceChange: 0.03 },
      { round: 6, type: 'jump', priceChange: -0.22, isMalicious: true, verifier: 'Uniswap TWAP验证' },
      { round: 7, type: 'normal', priceChange: 0.02 },
      { round: 8, type: 'normal', priceChange: -0.02 },
      { round: 9, type: 'normal', priceChange: 0.01 },
      { round: 10, type: 'normal', priceChange: 0.02 },
      { round: 11, type: 'crash', priceChange: -0.1 },
      { round: 12, type: 'normal', priceChange: 0.01 },
    ],
  },
];

export const oracleSources = [
  'Chainlink',
  'Uniswap TWAP',
  'SushiSwap TWAP',
  'Band Protocol',
  'Pyth Network',
];

export const createInitialPosition = (scenario: Scenario): Position => {
  const collateralValue = scenario.initialPosition.collateralAmount * scenario.initialPosition.collateralPrice;
  const currentRatio = (collateralValue / scenario.initialPosition.borrowAmount) * 100;
  
  let status: Position['status'] = 'safe';
  if (currentRatio <= scenario.initialPosition.liquidationThreshold) {
    status = 'danger';
  } else if (currentRatio <= scenario.initialPosition.liquidationThreshold * 1.2) {
    status = 'warning';
  }

  return {
    id: `pos-${generateId()}`,
    ...scenario.initialPosition,
    currentRatio,
    status,
    createdAt: Date.now(),
  };
};

export const createInitialPriceHistory = (scenario: Scenario): PricePoint[] => {
  const basePrice = scenario.initialPosition.collateralPrice;
  const history: PricePoint[] = [];
  
  for (let i = 0; i < 5; i++) {
    history.push({
      timestamp: Date.now() - (5 - i) * 60000,
      price: basePrice * (1 + (Math.random() - 0.5) * 0.02),
      source: oracleSources[Math.floor(Math.random() * oracleSources.length)],
      isConfirmed: true,
      isJump: false,
    });
  }
  
  return history;
};

export const sampleActionExplanations: Record<string, string> = {
  add_collateral: '玩家补充抵押物以提高抵押率',
  repay: '玩家偿还部分借贷以降低清算风险',
  hold: '玩家选择观望，未采取任何操作',
  liquidation: '系统触发清算，抵押率低于清算阈值',
  price_update: '预言机更新价格，市场行情变动',
};

export const verifierContacts: Record<string, string> = {
  'Chainlink节点验证': '联系Chainlink节点运营方或提交争议到Chainlink治理',
  '多节点交叉验证': '联系协议方进行多数据源交叉验证',
  'Chainlink喂价验证': '检查Chainlink喂价合约，联系节点运营商',
  'Uniswap TWAP验证': '查询Uniswap V3池TWAP数据，对比验证',
  '协议方核实': '联系借贷协议官方客服或治理论坛提交问题',
  '清算人核实': '联系执行清算的地址所有者或检查清算交易记录',
  '钱包方核实': '检查钱包Gas设置，联系钱包提供商支持',
};
