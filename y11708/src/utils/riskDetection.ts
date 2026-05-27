import type { TransitionMatrix, RiskDetection, TransitionRecord } from '../types';

export const LOW_SAMPLE_THRESHOLD = 50;
export const CHANNEL_MIX_THRESHOLD = 0.3;

export function detectRisks(
  matrix: TransitionMatrix,
  transitions: TransitionRecord[]
): RiskDetection[] {
  const risks: RiskDetection[] = [];
  
  const lowSampleRisks = detectLowSampleStates(matrix);
  risks.push(...lowSampleRisks);
  
  const channelRisks = detectChannelMixing(transitions);
  risks.push(...channelRisks);
  
  const absorbingRisks = detectAbsorbingMisuse(matrix);
  risks.push(...absorbingRisks);
  
  return risks;
}

export function detectLowSampleStates(matrix: TransitionMatrix): RiskDetection[] {
  const risks: RiskDetection[] = [];
  const lowSampleStates: { name: string; size: number }[] = [];
  
  matrix.sampleSizes.forEach((size, i) => {
    if (size > 0 && size < LOW_SAMPLE_THRESHOLD) {
      lowSampleStates.push({ name: matrix.states[i].name, size });
    }
  });
  
  if (lowSampleStates.length > 0) {
    const stateNames = lowSampleStates.map(s => `${s.name}(${s.size}样本)`).join('、');
    risks.push({
      type: 'low_sample',
      severity: 'warning',
      message: `检测到低样本状态：${stateNames}。样本量低于${LOW_SAMPLE_THRESHOLD}可能导致转移概率估计不稳定。`,
      details: {
        states: lowSampleStates,
        threshold: LOW_SAMPLE_THRESHOLD
      }
    });
  }
  
  return risks;
}

export function detectChannelMixing(transitions: TransitionRecord[]): RiskDetection[] {
  const risks: RiskDetection[] = [];
  
  if (transitions.length === 0) return risks;
  
  const channels = new Set(transitions.map(t => t.channel).filter(Boolean));
  
  if (channels.size <= 1) return risks;
  
  const channelCounts = new Map<string, number>();
  transitions.forEach(t => {
    if (t.channel) {
      const current = channelCounts.get(t.channel) || 0;
      channelCounts.set(t.channel, current + t.count);
    }
  });
  
  const total = Array.from(channelCounts.values()).reduce((a, b) => a + b, 0);
  const maxChannel = Math.max(...channelCounts.values());
  const maxRatio = maxChannel / total;
  
  if (maxRatio < (1 - CHANNEL_MIX_THRESHOLD)) {
    risks.push({
      type: 'channel_mixed',
      severity: 'warning',
      message: `检测到多渠道混合数据（${channels.size}个渠道）。不同渠道的用户行为模式可能存在差异，建议分渠道分析以获得更准确的预测结果。`,
      details: {
        channelCount: channels.size,
        channelCounts: Object.fromEntries(channelCounts),
        maxRatio
      }
    });
  }
  
  return risks;
}

export function detectAbsorbingMisuse(matrix: TransitionMatrix): RiskDetection[] {
  const risks: RiskDetection[] = [];
  const absorbingStates = matrix.states.filter(s => s.isAbsorbing);
  
  absorbingStates.forEach(state => {
    const stateIdx = matrix.states.indexOf(state);
    const selfTransition = matrix.matrix[stateIdx]?.[stateIdx] || 0;
    
    if (selfTransition < 0.99 && matrix.sampleSizes[stateIdx] > 0) {
      risks.push({
        type: 'absorbing_misuse',
        severity: 'error',
        message: `吸收态"${state.name}"检测到流出转移（自留存率仅${(selfTransition * 100).toFixed(1)}%）。吸收态理论上应为终态，不应有流出。这可能影响预测结果的准确性。`,
        details: {
          state: state.name,
          selfTransition,
          expected: 1.0
        }
      });
    }
  });
  
  const nonAbsorbingToAbsorbing = matrix.states.filter(s => !s.isAbsorbing);
  nonAbsorbingToAbsorbing.forEach(state => {
    const stateIdx = matrix.states.indexOf(state);
    const toAbsorbing = matrix.states
      .filter(s => s.isAbsorbing)
      .reduce((sum, s) => {
        const idx = matrix.states.indexOf(s);
        return sum + (matrix.matrix[stateIdx]?.[idx] || 0);
      }, 0);
    
    if (toAbsorbing > 0.8 && matrix.sampleSizes[stateIdx] > 0) {
      risks.push({
        type: 'absorbing_misuse',
        severity: 'warning',
        message: `状态"${state.name}"向流失状态的转化率高达${(toAbsorbing * 100).toFixed(1)}%，该状态可能已接近实质流失。请确认状态定义是否准确。`,
        details: {
          state: state.name,
          toAbsorbingRate: toAbsorbing
        }
      });
    }
  });
  
  return risks;
}

export function generateRiskSummary(risks: RiskDetection[]): string {
  if (risks.length === 0) {
    return '未检测到数据质量问题，预测结果具有较高可信度。';
  }
  
  const errors = risks.filter(r => r.severity === 'error');
  const warnings = risks.filter(r => r.severity === 'warning');
  
  const parts: string[] = [];
  
  if (errors.length > 0) {
    parts.push(`检测到${errors.length}项严重问题，可能显著影响预测准确性。`);
  }
  
  if (warnings.length > 0) {
    parts.push(`检测到${warnings.length}项警告，建议在解读结果时予以关注。`);
  }
  
  return parts.join(' ');
}

export function getRiskIcon(type: string): string {
  switch (type) {
    case 'low_sample':
      return '📊';
    case 'channel_mixed':
      return '🔀';
    case 'absorbing_misuse':
      return '⚠️';
    default:
      return '❗';
  }
}
