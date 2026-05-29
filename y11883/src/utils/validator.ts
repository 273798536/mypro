import type { PartitionConditions, ProblemInput, InputError } from '../types';

let errorIdCounter = 0;
const generateErrorId = (): string => `e_${++errorIdCounter}_${Date.now()}`;
let problemIdCounter = 0;
const generateProblemId = (): string => `prob_${++problemIdCounter}_${Date.now()}`;

export function parseConditionString(
  conditionStr: string,
  baseConditions: PartitionConditions
): PartitionConditions {
  const conditions: PartitionConditions = { ...baseConditions };
  const lower = conditionStr.toLowerCase();

  if (lower.includes('不允许重复')) {
    conditions.allowDuplicate = false;
  }
  if (lower.includes('允许重复')) {
    conditions.allowDuplicate = true;
  }

  const exactPartsMatch = conditionStr.match(/拆成\s*(\d+)\s*个/);
  if (exactPartsMatch) {
    const n = parseInt(exactPartsMatch[1], 10);
    conditions.minParts = n;
    conditions.maxParts = n;
  }

  const minPartsMatch = conditionStr.match(/最少\s*(\d+)\s*个/);
  if (minPartsMatch) {
    conditions.minParts = parseInt(minPartsMatch[1], 10);
  }

  const maxPartsMatch = conditionStr.match(/最多\s*(\d+)\s*个/);
  if (maxPartsMatch) {
    conditions.maxParts = parseInt(maxPartsMatch[1], 10);
  }

  const includeMatch = conditionStr.match(/包含数字([\d,，\s]+)/);
  if (includeMatch) {
    conditions.includeNumbers = includeMatch[1]
      .split(/[,，\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));
  }

  const excludeMatch = conditionStr.match(/排除数字([\d,，\s]+)/);
  if (excludeMatch) {
    conditions.excludeNumbers = excludeMatch[1]
      .split(/[,，\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));
  }

  const maxValueMatch = conditionStr.match(/最大数字\s*(\d+)/);
  if (maxValueMatch) {
    conditions.maxValue = parseInt(maxValueMatch[1], 10);
  }

  const minValueMatch = conditionStr.match(/最小数字\s*(\d+)/);
  if (minValueMatch) {
    conditions.minValue = parseInt(minValueMatch[1], 10);
  }

  return conditions;
}

export function parseBatchInput(
  input: string,
  globalConditions: PartitionConditions
): { problems: ProblemInput[]; errors: InputError[] } {
  const problems: ProblemInput[] = [];
  const errors: InputError[] = [];
  const lines = input.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (!trimmed) return;

    const parts = trimmed.split(/[,，]/).map(s => s.trim());

    if (parts.length < 1) {
      errors.push({
        id: generateErrorId(),
        lineNumber,
        rawInput: trimmed,
        errorType: 'format',
        message: '输入格式为空',
        suggestion: '请输入目标整数，例如：5'
      });
      return;
    }

    const targetNumber = parseInt(parts[0], 10);
    if (isNaN(targetNumber) || targetNumber <= 0 || !Number.isInteger(targetNumber)) {
      errors.push({
        id: generateErrorId(),
        lineNumber,
        rawInput: trimmed,
        errorType: 'invalid_number',
        message: `目标整数格式错误: "${parts[0]}"`,
        suggestion: '请输入正整数'
      });
      return;
    }

    let conditions = { ...globalConditions };
    if (parts.length >= 2 && parts[1]) {
      try {
        conditions = parseConditionString(parts[1], conditions);
      } catch {
        errors.push({
          id: generateErrorId(),
          lineNumber,
          rawInput: trimmed,
          errorType: 'condition_conflict',
          message: '条件解析失败',
          suggestion: '请检查条件格式'
        });
        return;
      }
    }

    let studentAnswer: string[] = [];
    if (parts.length >= 3 && parts[2]) {
      studentAnswer = parts[2]
        .split(/[;；]/)
        .map(s => s.trim())
        .filter(s => s);
    }

    problems.push({
      id: generateProblemId(),
      lineNumber,
      targetNumber,
      conditions,
      studentAnswer,
      rawInput: trimmed
    });
  });

  return { problems, errors };
}

export function formatConditionsDescription(conditions: PartitionConditions): string {
  const parts: string[] = [];

  if (conditions.minParts === conditions.maxParts && conditions.minParts !== undefined) {
    parts.push(`拆成${conditions.minParts}个数`);
  } else {
    if (conditions.minParts !== undefined) {
      parts.push(`最少${conditions.minParts}个数`);
    }
    if (conditions.maxParts !== undefined) {
      parts.push(`最多${conditions.maxParts}个数`);
    }
  }

  parts.push(conditions.allowDuplicate ? '允许重复数字' : '不允许重复数字');

  if (conditions.minValue !== undefined) {
    parts.push(`最小数字${conditions.minValue}`);
  }
  if (conditions.maxValue !== undefined) {
    parts.push(`最大数字${conditions.maxValue}`);
  }

  if (conditions.includeNumbers && conditions.includeNumbers.length > 0) {
    parts.push(`包含数字${conditions.includeNumbers.join(',')}`);
  }
  if (conditions.excludeNumbers && conditions.excludeNumbers.length > 0) {
    parts.push(`排除数字${conditions.excludeNumbers.join(',')}`);
  }

  return parts.join('，');
}
