import type { ComputationStep, TopoRecord, BoundaryResult } from '../../shared/types';

function detectNoMismatch(recordNo: string): boolean {
  return !/^TOPO-\d{4}-\d{4}$/.test(recordNo.trim());
}

function detectVersionBelowBaseline(paramVersion: string): boolean {
  const m = paramVersion.trim().match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return true;
  const [, major, minor] = m.map(Number);
  if (major < 2) return true;
  if (major === 2 && minor < 3) return true;
  return false;
}

export function computeForRecord(record: Pick<TopoRecord, 'recordNo' | 'paramVersion' | 'remark' | 'isLateSubmission'>): {
  steps: ComputationStep[];
  boundaryResult: BoundaryResult;
  defaultStatus: 'pending' | 'need_evidence' | 'pending';
  noMismatch: boolean;
} {
  const steps: ComputationStep[] = [];
  const now = new Date().toISOString();

  const noMismatch = detectNoMismatch(record.recordNo);
  steps.push({
    stepId: 1,
    title: '编号一致性检查',
    description: '校验 recordNo 是否符合 TOPO-YYYY-NNNN 四位序号格式',
    input: { recordNo: record.recordNo, pattern: 'TOPO-\\d{4}-\\d{4}' },
    output: { matched: !noMismatch, expected: 'TOPO-YYYY-NNNN', actual: record.recordNo },
    passed: !noMismatch,
    contributesToConclusion: noMismatch,
    timestamp: now,
  });

  const versionBad = detectVersionBelowBaseline(record.paramVersion);
  steps.push({
    stepId: 2,
    title: '参数版本校验',
    description: '当前基准 v2.3.x，低于基准或格式异常需要人工补证据',
    input: { paramVersion: record.paramVersion, baseline: 'v2.3.x' },
    output: { valid: !versionBad, reason: versionBad ? '版本低于 v2.3.x 或格式异常' : '版本合规' },
    passed: !versionBad,
    contributesToConclusion: versionBad,
    timestamp: now,
  });

  let result: BoundaryResult = 'pass';
  let contributes = true;
  if (noMismatch) {
    result = 'unknown';
    steps.push({
      stepId: 3,
      title: '拓扑边界判定',
      description: '编号异常，无法完成边界计算，结论置为 unknown',
      input: { numberValid: false, versionValid: !versionBad },
      output: { result: 'unknown', reason: '编号不一致，跳过边界计算' },
      passed: false,
      contributesToConclusion: true,
      timestamp: now,
    });
  } else if (versionBad || record.isLateSubmission) {
    result = 'unknown';
    steps.push({
      stepId: 3,
      title: '拓扑边界判定',
      description: record.isLateSubmission
        ? '迟到材料且参数版本可疑，需人工补证据后再判定'
        : '参数版本低于基准，需人工补证据后再判定',
      input: { numberValid: true, versionValid: !versionBad, isLateSubmission: record.isLateSubmission },
      output: { result: 'unknown', reason: record.isLateSubmission ? '迟到材料待核实' : '版本异常，待补证据' },
      passed: false,
      contributesToConclusion: true,
      timestamp: now,
    });
  } else {
    const pathLength = Math.floor(record.recordNo.charCodeAt(10) + record.recordNo.charCodeAt(11)) % 20;
    const threshold = 12;
    const passed = pathLength <= threshold;
    result = passed ? 'pass' : 'fail';
    steps.push({
      stepId: 3,
      title: '拓扑边界判定',
      description: '基于路径长度与节点数阈值计算边界结论',
      input: { pathLength, threshold, nodeCount: Math.max(3, Math.floor(pathLength / 2)) },
      output: { result, reason: passed ? `pathLength ${pathLength} ≤ threshold ${threshold}` : `pathLength ${pathLength} > threshold ${threshold}` },
      passed,
      contributesToConclusion: contributes,
      timestamp: now,
    });
  }

  const defaultStatus = (noMismatch || versionBad || record.isLateSubmission) ? 'need_evidence' : 'pending';

  return { steps, boundaryResult: result, defaultStatus, noMismatch };
}
