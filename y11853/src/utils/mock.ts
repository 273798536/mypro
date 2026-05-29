import type { Asset, TimePoint, Industry } from '../types/asset';
import { INDUSTRIES } from '../types/asset';
import { randomNormal, randomLogNormal, clamp, std, mean } from './math';

const STOCK_CODES = [
  '600519', '000858', '601318', '600036', '000333',
  '600276', '002415', '601166', '000651', '600030',
  '002594', '601899', '600887', '002475', '300750',
  '603288', '600900', '601888', '002304', '600009',
  '601288', '600585', '000001', '600048', '601398',
  '601601', '601628', '002714', '002821', '600000',
  '601939', '601668', '000063', '002142', '601186',
  '600741', '601988', '601766', '002202', '002007',
  '000961', '000568', '600176', '601727', '000425',
  '300059', '000938', '601633', '002460', '601877',
  '600031', '002555', '600809', '002648', '601360',
  '000895', '603259', '600547', '002352', '600019',
];

const STOCK_NAMES = [
  '贵州茅台', '五粮液', '中国平安', '招商银行', '美的集团',
  '恒瑞医药', '海康威视', '兴业银行', '格力电器', '中信证券',
  '比亚迪', '紫金矿业', '伊利股份', '立讯精密', '宁德时代',
  '海天味业', '长江电力', '中国中免', '洋河股份', '上海机场',
  '农业银行', '海螺水泥', '平安银行', '保利发展', '工商银行',
  '中国太保', '中国人寿', '牧原股份', '药明康德', '浦发银行',
  '建设银行', '中国建筑', '中兴通讯', '宁波银行', '中国铁建',
  '华域汽车', '中国银行', '中国中车', '金风科技', '华兰生物',
  '中南建设', '泸州老窖', '中国巨石', '上海电气', '徐工机械',
  '东方财富', '紫光股份', '长城汽车', '赣锋锂业', '正泰电器',
  '三一重工', '三七互娱', '山西汾酒', '卫星化学', '三六零',
  '双汇发展', '药明生物', '山东黄金', '顺丰控股', '宝钢股份',
];

const SPECIAL_WEIGHTS: Record<number, number> = {
  3: 0.8,
  7: 1.2,
  12: 0,
  18: 2.5,
  25: 0.5,
  31: 1.5,
  40: -0.3,
  47: 3.0,
};

function generateReturns(meanReturn: number, volatility: number, periods: number): number[] {
  const returns: number[] = [];
  for (let i = 0; i < periods; i++) {
    const r = randomNormal(meanReturn, volatility / Math.sqrt(12));
    returns.push(r);
  }
  return returns;
}

function generateTimeSeries(
  baseReturn: number,
  baseVolatility: number,
  baseDrawdown: number,
  periods: number
): TimePoint[] {
  const series: TimePoint[] = [];
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < periods; i++) {
    const progress = i / (periods - 1);
    const trendFactor = 1 + (Math.random() - 0.3) * progress * 0.5;
    
    series.push({
      timestamp: now - (periods - 1 - i) * monthMs,
      return: baseReturn * trendFactor * (0.8 + Math.random() * 0.4),
      volatility: baseVolatility * (0.9 + Math.random() * 0.2),
      drawdown: baseDrawdown * (0.85 + Math.random() * 0.3),
    });
  }
  
  return series;
}

function calculateRiskLevel(
  volatility: number,
  maxDrawdown: number,
  thresholds: { low: number; medium: number }
): 'low' | 'medium' | 'high' {
  const compositeScore = volatility * 0.6 + maxDrawdown * 0.4;
  if (compositeScore < thresholds.low) return 'low';
  if (compositeScore < thresholds.medium) return 'medium';
  return 'high';
}

export function generateMockAssets(count: number = 60): Asset[] {
  const assets: Asset[] = [];
  const actualCount = Math.min(count, STOCK_CODES.length);
  
  const thresholds = {
    low: 0.15,
    medium: 0.25,
  };
  
  for (let i = 0; i < actualCount; i++) {
    const industry = INDUSTRIES[i % INDUSTRIES.length] as Industry;
    
    const industryRiskMultiplier: Record<Industry, number> = {
      '科技': 1.3,
      '金融': 0.9,
      '医药': 1.1,
      '消费': 0.8,
      '能源': 1.2,
      '制造': 1.0,
      '地产': 1.4,
      '通信': 0.85,
      '军工': 1.35,
      '农业': 0.95,
    };
    
    const riskMult = industryRiskMultiplier[industry];
    
    const baseReturn = clamp(randomNormal(0.08, 0.05), -0.05, 0.25);
    const baseVolatility = clamp(randomLogNormal(-2.5, 0.5) * riskMult, 0.05, 0.4);
    const returns = generateReturns(baseReturn, baseVolatility, 24);
    
    const expectedReturn = mean(returns);
    const volatility = std(returns);
    const maxDD = clamp(randomLogNormal(-1.5, 0.4) * riskMult, 0.05, 0.5);
    
    const riskLevel = calculateRiskLevel(volatility, maxDD, thresholds);
    
    const weight = SPECIAL_WEIGHTS[i] ?? 1;
    
    const hasWeightAnomaly = weight < 0 || weight > 2 || weight === 0;
    
    assets.push({
      id: `asset-${i}`,
      code: STOCK_CODES[i],
      name: STOCK_NAMES[i],
      industry,
      weight,
      returns,
      volatility,
      maxDrawdown: maxDD,
      expectedReturn,
      riskLevel,
      position: { x: 0, y: 0, z: 0 },
      timeSeries: generateTimeSeries(expectedReturn, volatility, maxDD, 24),
      hasWeightAnomaly,
    });
  }
  
  return assets;
}

export function generateSecondRunAssets(firstRunAssets: Asset[]): Asset[] {
  return firstRunAssets.map((asset, index) => {
    const changeProbability = 0.3;
    const shouldChange = Math.random() < changeProbability;
    
    if (!shouldChange) {
      return { ...asset, position: { x: 0, y: 0, z: 0 } };
    }
    
    const changeType = Math.floor(Math.random() * 3);
    let newReturn = asset.expectedReturn;
    let newVolatility = asset.volatility;
    let newDrawdown = asset.maxDrawdown;
    
    const changeMagnitude = 0.15 + Math.random() * 0.2;
    
    if (changeType === 0 || changeType === 2) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      newReturn = asset.expectedReturn * (1 + direction * changeMagnitude);
    }
    if (changeType === 1 || changeType === 2) {
      newVolatility = asset.volatility * (1 + changeMagnitude * 0.8);
      newDrawdown = asset.maxDrawdown * (1 + changeMagnitude * 0.6);
    }
    
    const newReturns = asset.returns.map(r => r * (1 + (Math.random() - 0.5) * 0.1));
    
    return {
      ...asset,
      returns: newReturns,
      expectedReturn: newReturn,
      volatility: newVolatility,
      maxDrawdown: newDrawdown,
      position: { x: 0, y: 0, z: 0 },
    };
  });
}

export function generateRiskThresholds() {
  return {
    low: 0.15,
    medium: 0.25,
  };
}
