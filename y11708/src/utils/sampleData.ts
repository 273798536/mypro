import type { UserState, TransitionRecord } from '../types';
import { generateId } from './cn';

export const defaultStates: UserState[] = [
  { id: 'high_active', name: '高活跃', description: '每周访问≥5次，核心付费用户', color: '#00B42A', isAbsorbing: false },
  { id: 'medium_active', name: '中活跃', description: '每周访问2-4次， regular用户', color: '#165DFF', isAbsorbing: false },
  { id: 'low_active', name: '低活跃', description: '每周访问1次，边缘用户', color: '#FF7D00', isAbsorbing: false },
  { id: 'dormant', name: '沉睡', description: '连续2周未访问，需唤醒', color: '#86909C', isAbsorbing: false },
  { id: 'churned', name: '流失', description: '连续4周未访问，已流失', color: '#F53F3F', isAbsorbing: true }
];

export function generateSampleTransitions(states: UserState[]): TransitionRecord[] {
  const transitions: TransitionRecord[] = [];
  const period = '2024-01';
  
  const transitionPatterns: Record<string, Record<string, number>> = {
    'high_active': { 'high_active': 450, 'medium_active': 80, 'low_active': 20, 'dormant': 10, 'churned': 5 },
    'medium_active': { 'high_active': 60, 'medium_active': 320, 'low_active': 90, 'dormant': 40, 'churned': 15 },
    'low_active': { 'high_active': 20, 'medium_active': 50, 'low_active': 180, 'dormant': 80, 'churned': 40 },
    'dormant': { 'high_active': 5, 'medium_active': 15, 'low_active': 30, 'dormant': 200, 'churned': 120 },
    'churned': { 'high_active': 0, 'medium_active': 2, 'low_active': 5, 'dormant': 10, 'churned': 280 }
  };

  Object.entries(transitionPatterns).forEach(([fromState, toStates]) => {
    Object.entries(toStates).forEach(([toState, count]) => {
      if (count > 0) {
        transitions.push({
          id: generateId(),
          fromState,
          toState,
          count,
          channel: ['App', 'H5', '小程序'][Math.floor(Math.random() * 3)],
          campaignTag: Math.random() > 0.5 ? '新年活动' : undefined,
          period,
          source: '示例数据'
        });
      }
    });
  });

  return transitions;
}

export function getStateInterpretation(stateId: string): string {
  const interpretations: Record<string, string> = {
    'high_active': '高活跃用户是平台的核心价值群体，贡献主要收入。需重点维护，提供专属权益增强粘性。',
    'medium_active': '中活跃用户有较大上升空间，是运营转化的重点对象。可通过活动引导向高活跃转化。',
    'low_active': '低活跃用户处于流失边缘，需要及时干预。可通过push召回、新人优惠等方式激活。',
    'dormant': '沉睡用户已出现流失迹象，需紧急唤醒。建议通过定向优惠券、个性化推送进行召回。',
    'churned': '流失用户挽回成本较高，可作为A/B测试对象验证召回策略有效性。'
  };
  return interpretations[stateId] || '暂无详细解读';
}

export function getTransitionInsight(fromState: string, toState: string, rate: number): string {
  if (rate < 0.05) {
    return '此转移路径发生概率较低，属于长尾现象。';
  }
  if (rate > 0.5) {
    return `这是主要的转移方向，${fromState}用户大部分会流向${toState}。`;
  }
  if (fromState === toState) {
    return rate > 0.7 ? '该状态用户留存率较高，状态稳定性好。' : '该状态用户留存率偏低，容易发生状态转移。';
  }
  return '这是一条中等重要的转移路径。';
}
