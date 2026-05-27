import type { Asset, Portfolio, VersionHistory } from '../types/portfolio';
import type { Constraint } from '../types/constraints';

export const mockAssets: Asset[] = [
  { id: 'a1', name: '沪深300指数', code: '000300', expectedReturn: 0.08, volatility: 0.15, maxDrawdown: -0.25, category: '股票' },
  { id: 'a2', name: '中证500指数', code: '000905', expectedReturn: 0.10, volatility: 0.20, maxDrawdown: -0.32, category: '股票' },
  { id: 'a3', name: '创业板指', code: '399006', expectedReturn: 0.12, volatility: 0.25, maxDrawdown: -0.40, category: '股票' },
  { id: 'a4', name: '国债指数', code: '000012', expectedReturn: 0.03, volatility: 0.02, maxDrawdown: -0.03, category: '债券' },
  { id: 'a5', name: '企业债指数', code: '000013', expectedReturn: 0.045, volatility: 0.04, maxDrawdown: -0.06, category: '债券' },
  { id: 'a6', name: '黄金ETF', code: '518880', expectedReturn: 0.05, volatility: 0.12, maxDrawdown: -0.18, category: '商品' },
  { id: 'a7', name: '货币基金', code: '000001', expectedReturn: 0.02, volatility: 0.005, maxDrawdown: -0.005, category: '现金' },
  { id: 'a8', name: '恒生指数', code: 'HSI', expectedReturn: 0.07, volatility: 0.18, maxDrawdown: -0.30, category: '股票' },
];

const generateId = () => Math.random().toString(36).substring(2, 10);

function createPortfolio(
  weights: Record<string, number>,
  name: string,
  source: string,
  hasAnomaly?: 'weight' | 'overlap' | 'constraint'
): Portfolio {
  const assetIds = Object.keys(weights);
  const assetList = assetIds.map(id => mockAssets.find(a => a.id === id)!).filter(Boolean);
  
  const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedWeights = hasAnomaly === 'weight' 
    ? weights 
    : Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / weightSum]));
  
  const expectedReturn = assetList.reduce((sum, asset) => {
    return sum + (normalizedWeights[asset.id] || 0) * asset.expectedReturn;
  }, 0);
  
  const volatility = Math.sqrt(assetList.reduce((sum, asset, i) => {
    return sum + assetList.reduce((inner, asset2, j) => {
      const w1 = normalizedWeights[asset.id] || 0;
      const w2 = normalizedWeights[asset2.id] || 0;
      const corr = i === j ? 1 : (0.3 + Math.random() * 0.4);
      return inner + w1 * w2 * asset.volatility * asset2.volatility * corr;
    }, 0);
  }, 0));
  
  const maxDrawdown = assetList.reduce((sum, asset) => {
    return sum + (normalizedWeights[asset.id] || 0) * asset.maxDrawdown;
  }, 0);
  
  const sharpeRatio = volatility > 0 ? (expectedReturn - 0.02) / volatility : 0;
  
  const anomalies: Portfolio['anomalies'] = [];
  let status: Portfolio['status'] = 'normal';
  
  if (hasAnomaly === 'weight') {
    anomalies.push({
      type: 'weight_sum',
      severity: 'error',
      message: `权重和不为1，当前值: ${weightSum.toFixed(4)}`,
      details: { weightSum, expected: 1, diff: Math.abs(weightSum - 1) }
    });
    status = 'error';
  }
  
  if (hasAnomaly === 'overlap') {
    anomalies.push({
      type: 'risk_overlap',
      severity: 'warning',
      message: '检测到风险点重叠，与另一组合高度相关',
      details: { overlappingCount: 2, correlation: 0.95 }
    });
    status = 'warning';
  }
  
  if (hasAnomaly === 'constraint') {
    anomalies.push({
      type: 'constraint_inactive',
      severity: 'warning',
      message: '部分约束条件未生效，无满足条件的组合',
      details: { inactiveConstraints: ['股票权重上限30%', '波动率上限10%'] }
    });
    status = 'warning';
  }
  
  const now = new Date();
  
  return {
    id: generateId(),
    name,
    source,
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    weights: normalizedWeights,
    expectedReturn,
    volatility,
    maxDrawdown,
    sharpeRatio,
    status,
    anomalies,
    riskContributions: Object.fromEntries(
      assetList.map(asset => [asset.id, Math.random() * 0.3])
    )
  };
}

export const mockPortfolios: Portfolio[] = [
  createPortfolio({ a1: 0.3, a2: 0.2, a4: 0.3, a7: 0.2 }, '稳健成长组合', '内部投研模型'),
  createPortfolio({ a1: 0.15, a3: 0.25, a5: 0.3, a6: 0.15, a7: 0.15 }, '均衡配置组合', '内部投研模型'),
  createPortfolio({ a2: 0.4, a3: 0.3, a5: 0.2, a6: 0.1 }, '积极进取组合', '客户定制方案'),
  createPortfolio({ a4: 0.6, a5: 0.3, a7: 0.1 }, '保本增值组合', '低风险策略库'),
  createPortfolio({ a1: 0.25, a8: 0.25, a4: 0.3, a6: 0.2 }, '全球配置组合', '全球策略模型'),
  createPortfolio({ a3: 0.5, a2: 0.3, a5: 0.2 }, '科创成长组合', '行业主题策略'),
  createPortfolio({ a1: 0.3, a2: 0.2, a4: 0.3, a7: 0.25 }, '权重异常测试', '测试数据', 'weight'),
  createPortfolio({ a1: 0.3, a2: 0.2, a4: 0.3, a7: 0.2 }, '风险重叠测试', '测试数据', 'overlap'),
  createPortfolio({ a2: 0.6, a3: 0.4 }, '约束未生效测试', '测试数据', 'constraint'),
  createPortfolio({ a7: 0.5, a4: 0.3, a5: 0.2 }, '货币增强组合', '流动性管理'),
  createPortfolio({ a1: 0.2, a2: 0.2, a3: 0.2, a4: 0.2, a7: 0.2 }, '等权分散组合', '智能配置'),
  createPortfolio({ a6: 0.4, a4: 0.4, a7: 0.2 }, '避险对冲组合', '尾部风险策略'),
];

export const mockConstraints: Constraint[] = [
  { id: 'c1', type: 'weight', operator: 'lt', value: 0.4, assetId: 'a1', enabled: true, label: '沪深300权重上限' },
  { id: 'c2', type: 'weight', operator: 'lt', value: 0.3, assetId: 'a3', enabled: true, label: '创业板权重上限' },
  { id: 'c3', type: 'return', operator: 'gt', value: 0.04, enabled: true, label: '预期收益率下限' },
  { id: 'c4', type: 'volatility', operator: 'lt', value: 0.15, enabled: false, label: '波动率上限' },
  { id: 'c5', type: 'drawdown', operator: 'gt', value: -0.20, enabled: true, label: '最大回撤下限' },
  { id: 'c6', type: 'weight', operator: 'gt', value: 0.1, enabled: true, label: '单资产权重下限' },
];

export const mockVersionHistory: VersionHistory[] = mockPortfolios.slice(0, 3).map((p, idx) => ({
  id: generateId(),
  portfolioId: p.id,
  parentId: idx > 0 ? generateId() : undefined,
  changeDescription: [
    '初始版本创建',
    '调整股票仓位，降低创业板权重5%',
    '优化债券配置，增加企业债比例'
  ][idx],
  modifiedBy: '投顾团队',
  timestamp: new Date(Date.now() - idx * 86400000),
  diff: {
    weights: {
      before: { a1: 0.35, a2: 0.25, a3: 0.2 },
      after: { a1: 0.3, a2: 0.2, a3: 0.15 }
    },
    expectedReturn: { before: 0.075, after: 0.072 },
    volatility: { before: 0.12, after: 0.11 }
  }
}));

export const covarianceMatrix: number[][] = [
  [0.0225, 0.0180, 0.0225, 0.0015, 0.0030, 0.0090, 0.0004, 0.0162],
  [0.0180, 0.0400, 0.0375, 0.0020, 0.0040, 0.0120, 0.0005, 0.0180],
  [0.0225, 0.0375, 0.0625, 0.0025, 0.0050, 0.0150, 0.0006, 0.0225],
  [0.0015, 0.0020, 0.0025, 0.0004, 0.0004, 0.0012, 0.0001, 0.0018],
  [0.0030, 0.0040, 0.0050, 0.0004, 0.0016, 0.0024, 0.0001, 0.0036],
  [0.0090, 0.0120, 0.0150, 0.0012, 0.0024, 0.0144, 0.0003, 0.0108],
  [0.0004, 0.0005, 0.0006, 0.0001, 0.0001, 0.0003, 0.000025, 0.0005],
  [0.0162, 0.0180, 0.0225, 0.0018, 0.0036, 0.0108, 0.0005, 0.0324],
];
