import { ScenarioData } from '@/types/game';

export const scenarioSmooth: ScenarioData = {
  id: 'scenario-smooth',
  name: '平稳调度',
  description: '降雨逐渐增强，合理控制闸门开度，在保障上游安全的同时兼顾下游村镇。',
  initialState: {
    reservoirLevel: 42,
    reservoirCapacity: 55,
    gateOpenPercent: 0,
    downstreamBaseFlow: 120,
    downstreamSafeThreshold: 500,
  },
  rainfallCards: [
    {
      id: 'rc-s1',
      arrivalOrder: 1,
      rainfallIntensity: 15,
      duration: 2,
      description: '小雨来袭',
    },
    {
      id: 'rc-s2',
      arrivalOrder: 2,
      rainfallIntensity: 35,
      duration: 2,
      description: '中雨持续',
    },
    {
      id: 'rc-s3',
      arrivalOrder: 3,
      rainfallIntensity: 55,
      duration: 2,
      description: '大雨倾盆',
    },
    {
      id: 'rc-s4',
      arrivalOrder: 4,
      rainfallIntensity: 20,
      duration: 1,
      description: '雨势减弱',
    },
  ],
  totalRounds: 6,
  passingScore: 60,
  recommendedDecisions: [
    { round: 1, gateOpenPercent: 25, warningIssued: false },
    { round: 2, gateOpenPercent: 50, warningIssued: true },
    { round: 3, gateOpenPercent: 50, warningIssued: false },
    { round: 4, gateOpenPercent: 75, warningIssued: false },
    { round: 5, gateOpenPercent: 50, warningIssued: false },
    { round: 6, gateOpenPercent: 25, warningIssued: false },
  ],
};

export const scenarioRush: ScenarioData = {
  id: 'scenario-rush',
  name: '开闸过猛',
  description: '降雨来势凶猛，如果开闸过快，下游村镇将面临洪峰冲击——这次你能忍住吗？',
  initialState: {
    reservoirLevel: 48,
    reservoirCapacity: 55,
    gateOpenPercent: 0,
    downstreamBaseFlow: 150,
    downstreamSafeThreshold: 500,
  },
  rainfallCards: [
    {
      id: 'rc-r1',
      arrivalOrder: 1,
      rainfallIntensity: 30,
      duration: 2,
      description: '阵雨突至',
    },
    {
      id: 'rc-r2',
      arrivalOrder: 2,
      rainfallIntensity: 65,
      duration: 3,
      description: '暴雨来袭',
    },
    {
      id: 'rc-r3',
      arrivalOrder: 3,
      rainfallIntensity: 45,
      duration: 2,
      description: '大雨持续',
    },
    {
      id: 'rc-r4',
      arrivalOrder: 4,
      rainfallIntensity: 10,
      duration: 1,
      description: '小雨渐止',
    },
  ],
  totalRounds: 6,
  passingScore: 60,
  recommendedDecisions: [
    { round: 1, gateOpenPercent: 25, warningIssued: false },
    { round: 2, gateOpenPercent: 50, warningIssued: true },
    { round: 3, gateOpenPercent: 50, warningIssued: false },
    { round: 4, gateOpenPercent: 75, warningIssued: false },
    { round: 5, gateOpenPercent: 50, warningIssued: false },
    { round: 6, gateOpenPercent: 25, warningIssued: false },
  ],
};

export const allScenarios: ScenarioData[] = [scenarioSmooth, scenarioRush];
