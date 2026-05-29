import type { WarningItem, ProblemResult } from '../types';
import { generateUnrestrictedCount } from './partition';

let warningIdCounter = 0;
const generateWarningId = (): string => `w_${++warningIdCounter}_${Date.now()}`;

export function detectAnomalies(
  result: ProblemResult
): WarningItem[] {
  const warnings: WarningItem[] = [];
  const { input, rawPartitions, partitions } = result;

  if (!input.conditions.allowDuplicate && rawPartitions.length > partitions.length * 2) {
    const ratio = rawPartitions.length / partitions.length;
    warnings.push({
      id: generateWarningId(),
      type: 'duplicate_miss',
      problemId: input.id,
      message: `去重比例较高 (${ratio.toFixed(1)}:1)，请确认学生是否遗漏了重复排列`,
      details: {
        rawCount: rawPartitions.length,
        finalCount: partitions.length,
        ratio
      },
      confirmed: false
    });
  }

  const hasConditions = 
    input.conditions.maxParts !== undefined || 
    input.conditions.minParts !== undefined || 
    input.conditions.maxValue !== undefined || 
    input.conditions.minValue !== undefined ||
    (input.conditions.includeNumbers && input.conditions.includeNumbers.length > 0) ||
    (input.conditions.excludeNumbers && input.conditions.excludeNumbers.length > 0);

  if (hasConditions) {
    const unrestricted = generateUnrestrictedCount(input.targetNumber);
    const restricted = partitions.length;
    if (unrestricted === restricted) {
      warnings.push({
        id: generateWarningId(),
        type: 'condition_unused',
        problemId: input.id,
        message: '限制条件似乎未生效，拆分数量与无限制时相同',
        details: { unrestricted, restricted },
        confirmed: false
      });
    }
  }

  if (partitions.length > 50) {
    warnings.push({
      id: generateWarningId(),
      type: 'explosion',
      problemId: input.id,
      message: `拆分方案较多 (${partitions.length} 种)，建议增加限制条件`,
      details: { count: partitions.length },
      confirmed: false
    });
  }

  return warnings;
}
