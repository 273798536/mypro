export interface CurvePoint {
  x: number;
  y: number;
  locked: boolean;
}

export interface CurveSegment {
  id: string;
  label: string;
  points: CurvePoint[];
  segmentType: 'normal' | 'inverted' | 'flat';
}

export type RatingGrade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B';

export interface BondCard {
  id: string;
  issuer: string;
  parValue: number;
  couponRate: number;
  ytm: number;
  simpleDuration: number;
  effectiveDuration: number;
  rating: RatingGrade;
  callable: boolean;
  maturity: string;
}

export type EventType = 'rate_hike' | 'recession' | 'liquidity_crisis' | 'credit_spread';

export interface CurveImpact {
  shortEndShift: number;
  longEndShift: number;
  spreadWidening: number;
}

export interface EventCard {
  id: string;
  eventType: EventType;
  label: string;
  description: string;
  curveImpact: CurveImpact;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: '初级' | '中级' | '高级';
  targetDuration: number;
  baseCurve: CurveSegment[];
  bondCards: BondCard[];
  eventCards: EventCard[];
}

export interface ValidationResult {
  ruleId: string;
  passed: boolean;
  actualValue: number;
  threshold: number;
  feedback: string;
}

export interface RunRecord {
  id: string;
  scenarioId: string;
  timestamp: number;
  rerunFromId: string | null;
  curveSnapshot: CurveSegment[];
  portfolioSnapshot: BondCard[];
  activeEventIds: string[];
  totalScore: number;
  validationResults: ValidationResult[];
  portfolioDuration: number;
  portfolioEffDuration: number;
  durationGap: number;
  varValue: number;
  isInverted: boolean;
}

export interface RuleDef {
  id: string;
  category: 'curve' | 'settlement' | 'event' | 'duration';
  label: string;
  description: string;
  feedbackTemplate: string;
}

export const RULES: RuleDef[] = [
  {
    id: 'CR-01',
    category: 'curve',
    label: '久期缺口限制',
    description: '久期缺口不得超过组合净值的 5%',
    feedbackTemplate: '久期缺口 {actual}% 超出 5% 限制，建议调整 {direction} 端持仓',
  },
  {
    id: 'CR-02',
    category: 'curve',
    label: '曲线反向久期调整',
    description: '曲线反向时必须降低组合久期',
    feedbackTemplate: '曲线已反向，组合久期 {duration} 仍为正，应转为负久期或对冲',
  },
  {
    id: 'CR-03',
    category: 'settlement',
    label: 'VaR 限制',
    description: '组合 VaR 不得超过基准的 120%',
    feedbackTemplate: '组合 VaR {var}% 超出基准 120%，需减少高久期资产暴露',
  },
  {
    id: 'CR-04',
    category: 'settlement',
    label: '低评级持仓上限',
    description: '信用评级低于 BBB 不得超组合 20%',
    feedbackTemplate: '低评级债券占比 {ratio}%，超 20% 上限',
  },
  {
    id: 'CR-05',
    category: 'event',
    label: '双重事件风险检查',
    description: '双重事件下必须同时检查利率+信用风险',
    feedbackTemplate: '仅处理了利率风险，遗漏信用利差走阔影响',
  },
  {
    id: 'CR-06',
    category: 'duration',
    label: '含权债有效久期',
    description: '含权债必须使用有效久期',
    feedbackTemplate: '债券 {name} 含赎回条款，使用简单久期 {simple} 低估了 {diff}',
  },
];
