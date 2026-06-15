import {
  QualityIssue,
  QualityIssueType,
  DataStatus,
  NextStep,
  QUALITY_ISSUE_LABELS,
} from '../types/common';
import { TideRecord } from '../types/tide';
import { WaterRecord } from '../types/risk';
import { detectTimezoneIssues } from './timezone';
import { detectSalinityUnitMismatch } from './unitConverter';

let issueIdCounter = 0;

function generateIssueId(): string {
  return `issue_${Date.now()}_${++issueIdCounter}`;
}

function createIssue(
  recordId: string,
  type: QualityIssueType,
  description: string,
  suggestion: string
): QualityIssue {
  const label = QUALITY_ISSUE_LABELS[type];
  return {
    id: generateIssueId(),
    recordId,
    type,
    severity: label.defaultStatus,
    description,
    suggestion,
    nextStep: label.defaultNextStep,
  };
}

export function detectNullValues<T extends { id: string }>(
  records: T[],
  fields: (keyof T)[]
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  records.forEach(record => {
    fields.forEach(field => {
      const value = record[field];
      if (value === null || value === undefined || value === '') {
        issues.push(createIssue(
          record.id,
          QualityIssueType.NULL_VALUE,
          `字段"${String(field)}"存在空值`,
          `建议补充该字段数据，或使用相邻记录进行插值补全。空值将标记为"暂缓"状态，补全后可重新计算。`
        ));
      }
    });
  });

  return issues;
}

export function detectDuplicates(
  records: { id: string; recordTime: Date; pointId?: string }[]
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const seen = new Map<string, string[]>();

  records.forEach(record => {
    const key = `${record.pointId || 'default'}_${record.recordTime.getTime()}`;
    if (seen.has(key)) {
      seen.get(key)!.push(record.id);
    } else {
      seen.set(key, [record.id]);
    }
  });

  seen.forEach((ids, key) => {
    if (ids.length > 1) {
      const time = new Date(parseInt(key.split('_')[1])).toLocaleString('zh-CN');
      ids.slice(1).forEach((id, index) => {
        issues.push(createIssue(
          id,
          QualityIssueType.DUPLICATE,
          `与第${index + 1}条记录重复（时间：${time}）`,
          `该记录与同点位同时刻的其他记录重复。建议改口径：保留第一条，删除后续重复记录，或取平均值。`
        ));
      });
    }
  });

  return issues;
}

export function detectOutOfRange(
  records: { id: string; [key: string]: unknown }[],
  field: string,
  min: number,
  max: number,
  fieldLabel: string
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  records.forEach(record => {
    const value = record[field];
    if (typeof value === 'number' && (value < min || value > max)) {
      issues.push(createIssue(
        record.id,
        QualityIssueType.OUT_OF_RANGE,
        `${fieldLabel}值${value}超出合理范围[${min}, ${max}]`,
        `该数据异常程度较高，可能是采集设备故障或录入错误。建议重新采集该点位数据。`
      ));
    }
  });

  return issues;
}

export function detectNoteMixed(
  records: { id: string; note?: string }[]
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const mixedPatterns = ['?', '？', '不确定', '待确认', '可能', '疑似', '备注', '注'];

  records.forEach(record => {
    if (record.note) {
      const hasMixedContent = mixedPatterns.some(pattern =>
        record.note!.includes(pattern)
      );
      if (hasMixedContent) {
        issues.push(createIssue(
          record.id,
          QualityIssueType.NOTE_MIXED,
          `备注中包含不确定内容："${record.note}"`,
          `备注内容不够明确，建议补充材料说明该备注的具体含义，或由场长确认数据有效性。`
        ));
      }
    }
  });

  return issues;
}

export function checkTideDataQuality(records: TideRecord[]): {
  issues: QualityIssue[];
  score: number;
  summary: {
    nullValues: number;
    duplicates: number;
    timezoneErrors: number;
    outOfRange: number;
    noteMixed: number;
  };
  explanation: string;
} {
  const nullIssues = detectNullValues(records, ['tideLevel']);
  const duplicateIssues = detectDuplicates(records);
  const { errors: timezoneErrors } = detectTimezoneIssues(records);
  const rangeIssues = detectOutOfRange(records, 'tideLevel', -2, 5, '潮位');
  const noteIssues = detectNoteMixed(records);

  const timezoneIssues: QualityIssue[] = timezoneErrors.map(err =>
    createIssue(
      records[err.recordIndex].id,
      QualityIssueType.TIMEZONE_ERROR,
      err.explanation,
      `建议改口径：校正该记录的时区设置。时区错误会直接影响潮汐计算结果的准确性，请务必确认。`
    )
  );

  const issues = [
    ...nullIssues,
    ...duplicateIssues,
    ...timezoneIssues,
    ...rangeIssues,
    ...noteIssues,
  ];

  const totalRecords = records.length;
  const affectedRecords = new Set(issues.map(i => i.recordId)).size;
  const score = Math.max(0, Math.round(100 - (affectedRecords / totalRecords) * 100));

  const summary = {
    nullValues: nullIssues.length,
    duplicates: duplicateIssues.length,
    timezoneErrors: timezoneIssues.length,
    outOfRange: rangeIssues.length,
    noteMixed: noteIssues.length,
  };

  const hasIssues = issues.length > 0;
  const issueTypes = issues.length > 0
    ? Array.from(new Set(issues.map(i => QUALITY_ISSUE_LABELS[i.type].label))).join('、')
    : '';

  const explanation = hasIssues
    ? `共检测到${issues.length}个数据质量问题，涉及${affectedRecords}条记录，主要问题类型：${issueTypes}。数据质量评分：${score}/100。建议优先处理时区错误和超出范围的问题。`
    : `所有${totalRecords}条潮汐记录通过质量检测，数据完整、无重复、时区一致。评分：${score}/100。`;

  return { issues, score, summary, explanation };
}

export function checkWaterDataQuality(records: WaterRecord[]): {
  issues: QualityIssue[];
  score: number;
  summary: {
    nullValues: number;
    unitMixed: number;
    outOfRange: number;
  };
  explanation: string;
} {
  const nullIssues = detectNullValues(records, ['salinity', 'ph', 'dissolvedOxygen', 'temperature']);
  const { mismatched: unitMismatchCount } = detectSalinityUnitMismatch(records);
  const phIssues = detectOutOfRange(records, 'ph', 6, 9, 'pH值');
  const doIssues = detectOutOfRange(records, 'dissolvedOxygen', 3, 12, '溶解氧');
  const tempIssues = detectOutOfRange(records, 'temperature', 5, 35, '水温');
  const salinityIssues = detectOutOfRange(records, 'salinity', 10, 35, '盐度');

  const unitIssues: QualityIssue[] = unitMismatchCount > 0
    ? records
      .filter(r => r.salinityUnit !== 'PSU')
      .map(r => createIssue(
        r.id,
        QualityIssueType.UNIT_MIXED,
        `盐度单位为${r.salinityUnit}，与标准单位PSU混用`,
        `建议改口径：统一转换为PSU单位。不同单位混用可能导致盐度趋势分析出现偏差。`
      ))
    : [];

  const issues = [
    ...nullIssues,
    ...unitIssues,
    ...phIssues,
    ...doIssues,
    ...tempIssues,
    ...salinityIssues,
  ];

  const totalRecords = records.length;
  const affectedRecords = new Set(issues.map(i => i.recordId)).size;
  const score = Math.max(0, Math.round(100 - (affectedRecords / totalRecords) * 100));

  const summary = {
    nullValues: nullIssues.length,
    unitMixed: unitIssues.length,
    outOfRange: phIssues.length + doIssues.length + tempIssues.length + salinityIssues.length,
  };

  const hasIssues = issues.length > 0;
  const explanation = hasIssues
    ? `水质数据检测到${issues.length}个问题，涉及${affectedRecords}条记录。数据质量评分：${score}/100。盐度单位混用问题请优先统一。`
    : `所有${totalRecords}条水质记录通过质量检测。评分：${score}/100。`;

  return { issues, score, summary, explanation };
}

export function getIssueStatus(issue: QualityIssue): DataStatus {
  return issue.severity;
}

export function getNextStepSuggestion(issueType: QualityIssueType): NextStep {
  return QUALITY_ISSUE_LABELS[issueType].defaultNextStep;
}
