import { ConsistencyIssue, ConsistencyReport } from '../types/review';

let issueIdCounter = 0;

function generateIssueId(): string {
  return `consistency_${Date.now()}_${++issueIdCounter}`;
}

export function checkDisplayVsCalculation(
  displayData: Record<string, unknown>,
  calculationData: Record<string, unknown>
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const allKeys = new Set([...Object.keys(displayData), ...Object.keys(calculationData)]);

  allKeys.forEach(key => {
    const displayValue = displayData[key];
    const calcValue = calculationData[key];

    if (displayValue === undefined && calcValue === undefined) return;

    const displayStr = displayValue === undefined ? '（未定义）' : String(displayValue);
    const calcStr = calcValue === undefined ? '（未定义）' : String(calcValue);

    if (displayStr !== calcStr) {
      let difference = 0;
      if (typeof displayValue === 'number' && typeof calcValue === 'number') {
        difference = Math.abs(displayValue - calcValue);
      }

      const description = typeof displayValue === 'number' && typeof calcValue === 'number'
        ? `${key} 字段存在数值差异：页面显示 ${displayValue}，计算结果 ${calcValue}，差值 ${difference.toFixed(4)}`
        : `${key} 字段不一致：页面显示 "${displayStr}"，计算结果为 "${calcStr}"`;

      issues.push({
        id: generateIssueId(),
        description,
        displayValue: displayStr,
        calculatedValue: calcStr,
        difference,
        resolved: false,
        resolution: null,
      });
    }
  });

  return issues;
}

export function resolveConflict(
  issue: ConsistencyIssue,
  resolution: 'use_display' | 'use_calculated'
): { issue: ConsistencyIssue; resolvedValue: string; explanation: string } {
  const resolvedValue = resolution === 'use_display' ? issue.displayValue : issue.calculatedValue;
  const explanation = resolution === 'use_display'
    ? `已确认以页面展示值为准：${resolvedValue}。`
    : `已确认以计算结果为准：${resolvedValue}。`;

  return {
    issue: { ...issue, resolution, resolved: true },
    resolvedValue,
    explanation,
  };
}

export function generateConsistencyReport(
  issues: ConsistencyIssue[],
  totalChecked: number
): ConsistencyReport {
  const unresolved = issues.filter(i => !i.resolved);
  const isConsistent = unresolved.length === 0;

  const displayResolved = issues.filter(i => i.resolution === 'use_display').length;
  const calcResolved = issues.filter(i => i.resolution === 'use_calculated').length;

  let explanation: string;
  if (issues.length === 0) {
    explanation = `共校验 ${totalChecked} 个数据字段，未发现不一致项。数据一致性良好，可以直接导出。`;
  } else if (isConsistent) {
    explanation = `共校验 ${totalChecked} 个数据字段，发现 ${issues.length} 处不一致，已全部处理。其中 ${displayResolved} 处以页面展示值为准，${calcResolved} 处以计算结果为准。数据已对齐，可以导出。`;
  } else {
    explanation = `共校验 ${totalChecked} 个数据字段，发现 ${issues.length} 处不一致，其中 ${unresolved.length} 处尚未处理。${displayResolved} 处已确认以页面展示值为准，${calcResolved} 处已确认以计算结果为准。请先处理所有不一致项后再导出。`;
  }

  return {
    totalChecked,
    issues,
    isConsistent,
    explanation,
  };
}

export function checkTideDataConsistency(
  displayRecords: { id: string; tideLevel: number; time: Date }[],
  calcRecords: { id: string; tideLevel: number; time: Date }[]
): ConsistencyIssue[] {
  const allIssues: ConsistencyIssue[] = [];

  const displayMap = new Map(displayRecords.map(r => [r.id, r]));
  const calcMap = new Map(calcRecords.map(r => [r.id, r]));

  const allIds = new Set([...displayMap.keys(), ...calcMap.keys()]);

  allIds.forEach(id => {
    const display = displayMap.get(id);
    const calc = calcMap.get(id);

    if (!display) {
      allIssues.push({
        id: generateIssueId(),
        description: `记录 ${id} 缺失：页面展示中无该条记录，但计算结果中存在潮位 ${calc?.tideLevel.toFixed(2)}m`,
        displayValue: '缺失',
        calculatedValue: `潮位 ${calc?.tideLevel.toFixed(2)}m`,
        difference: 0,
        resolved: false,
        resolution: null,
      });
      return;
    }

    if (!calc) {
      allIssues.push({
        id: generateIssueId(),
        description: `记录 ${id} 缺失：计算结果中无该条记录，但页面展示中存在潮位 ${display.tideLevel.toFixed(2)}m`,
        displayValue: `潮位 ${display.tideLevel.toFixed(2)}m`,
        calculatedValue: '缺失',
        difference: 0,
        resolved: false,
        resolution: null,
      });
      return;
    }

    const levelIssues = checkDisplayVsCalculation(
      { tideLevel: display.tideLevel, time: display.time.toISOString() },
      { tideLevel: calc.tideLevel, time: calc.time.toISOString() }
    );

    levelIssues.forEach(issue => {
      allIssues.push({
        ...issue,
        id: generateIssueId(),
        description: `记录 ${id}：${issue.description}`,
      });
    });
  });

  return allIssues;
}
