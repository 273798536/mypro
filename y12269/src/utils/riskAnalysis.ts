import { RiskItem, CityArea, DecibelCalculation, SoundSource, TimePeriod, Severity } from '../types';
import { getThreshold } from './decibel';

function generateId(): string {
  return `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getSeverity(excessDb: number): Severity {
  if (excessDb <= 5) return 'low';
  if (excessDb <= 15) return 'medium';
  return 'high';
}

export function analyzeNightThreshold(
  area: CityArea,
  calculation: DecibelCalculation,
  period: TimePeriod,
  currentTurn: number,
  soundSources: SoundSource[],
): RiskItem | null {
  if (period !== 'night') return null;

  const threshold = getThreshold(area, period);
  const excessDb = calculation.correctValue - threshold;

  if (excessDb <= 0) return null;

  const relatedSourceNames = calculation.sources
    .map((id) => soundSources.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  const areaTypeNames: Record<string, string> = {
    residential: '居民区',
    commercial: '商业区',
    industrial: '工业区',
    park: '公园',
  };

  return {
    id: generateId(),
    type: 'night_threshold',
    severity: getSeverity(excessDb),
    title: `夜间噪声超标 - ${area.name}`,
    description: `${area.name}夜间噪声${calculation.correctValue.toFixed(1)}dB，超过阈值${threshold}dB`,
    cause: `原因：${relatedSourceNames.join('、')}等声源在夜间仍在运作。${area.name}属于${areaTypeNames[area.type]}，夜间标准更为严格。`,
    suggestion: `处理建议：
1. 立即移除夜间不允许的声源
2. 对必须运行的设备采取静音改造措施
3. 设置声屏障减少噪声传播
4. 调整工作时间避开夜间敏感时段`,
    relatedSources: calculation.sources,
    relatedArea: area.id,
    triggeredAt: currentTurn,
  };
}

export function analyzeSourceOverlap(
  area: CityArea,
  calculation: DecibelCalculation,
  currentTurn: number,
  soundSources: SoundSource[],
): RiskItem | null {
  if (!calculation.isOverlap || calculation.overlapCount === 0) return null;

  const relatedSourceNames = calculation.sources
    .map((id) => soundSources.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  return {
    id: generateId(),
    type: 'source_overlap',
    severity: calculation.overlapCount >= 2 ? 'high' : 'medium',
    title: `声源重叠 - ${area.name}`,
    description: `${area.name}存在${calculation.overlapCount + 1}个声源同时发声`,
    cause: `原因：${relatedSourceNames.join('、')}在同一区域叠加。多个声源叠加会产生复合噪声，影响远大于单个声源。`,
    suggestion: `处理建议：
1. 将声源分散到不同区域，避免集中
2. 错峰安排产生噪声的活动
3. 对高噪声声源优先进行治理
4. 重新规划区域功能布局`,
    relatedSources: calculation.sources,
    relatedArea: area.id,
    triggeredAt: currentTurn,
  };
}

export function analyzeDecibelError(
  area: CityArea,
  calculation: DecibelCalculation,
  currentTurn: number,
): RiskItem | null {
  if (calculation.sources.length <= 1) return null;

  const errorDiff = calculation.rawSum - calculation.correctValue;
  if (errorDiff < 10) return null;

  return {
    id: generateId(),
    type: 'decibel_error',
    severity: 'medium',
    title: `分贝计算误区 - ${area.name}`,
    description: `简单相加(${calculation.rawSum}dB) vs 对数叠加(${calculation.correctValue}dB)，相差${errorDiff.toFixed(1)}dB`,
    cause: `原因：分贝是对数单位，不能直接算术相加。正确的计算公式是 L_total = 10 × log10(Σ 10^(Li/10))。误以为70dB+70dB=140dB是常见错误，实际约为73dB。`,
    suggestion: `学习要点：
1. 分贝采用对数刻度，每增加10dB能量增加10倍
2. 相同分贝的两个声源叠加，仅增加约3dB
3. 相差10dB以上的声源，较弱的可忽略
4. 使用专业声级计测量，而非估算相加`,
    relatedSources: calculation.sources,
    relatedArea: area.id,
    triggeredAt: currentTurn,
  };
}

export function analyzeAllRisks(
  areas: CityArea[],
  calculations: Record<string, DecibelCalculation>,
  period: TimePeriod,
  currentTurn: number,
  soundSources: SoundSource[],
): RiskItem[] {
  const risks: RiskItem[] = [];

  areas.forEach((area) => {
    const calc = calculations[area.id];
    if (!calc) return;

    const nightRisk = analyzeNightThreshold(area, calc, period, currentTurn, soundSources);
    if (nightRisk) risks.push(nightRisk);

    const overlapRisk = analyzeSourceOverlap(area, calc, currentTurn, soundSources);
    if (overlapRisk) risks.push(overlapRisk);

    const errorRisk = analyzeDecibelError(area, calc, currentTurn);
    if (errorRisk) risks.push(errorRisk);
  });

  return risks;
}

export function getRiskColor(type: string): string {
  switch (type) {
    case 'night_threshold':
      return 'bg-warning-night';
    case 'source_overlap':
      return 'bg-warning-overlap';
    case 'decibel_error':
      return 'bg-warning-decibel';
    default:
      return 'bg-gray-500';
  }
}

export function getRiskTextColor(type: string): string {
  switch (type) {
    case 'night_threshold':
      return 'text-warning-night';
    case 'source_overlap':
      return 'text-warning-overlap';
    case 'decibel_error':
      return 'text-warning-decibel';
    default:
      return 'text-gray-500';
  }
}

export function getRiskBorderColor(type: string): string {
  switch (type) {
    case 'night_threshold':
      return 'border-warning-night';
    case 'source_overlap':
      return 'border-warning-overlap';
    case 'decibel_error':
      return 'border-warning-decibel';
    default:
      return 'border-gray-500';
  }
}

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'low':
      return 'bg-yellow-100 text-yellow-800';
    case 'medium':
      return 'bg-orange-100 text-orange-800';
    case 'high':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getSeverityLabel(severity: Severity): string {
  switch (severity) {
    case 'low':
      return '低风险';
    case 'medium':
      return '中风险';
    case 'high':
      return '高风险';
    default:
      return '未知';
  }
}
