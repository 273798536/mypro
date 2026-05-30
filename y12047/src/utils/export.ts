import type { SimulationResult, BridgeVersion, JudgeResult, Member, Node } from '../types';

export interface ExportReport {
  versionId: string;
  levelName: string;
  totalSteps: number;
  loadMagnitude: number;
  results: SimulationResult[];
  finalResult: SimulationResult;
  judgeResult: JudgeResult;
  members: Member[];
  nodes: Node[];
  budget: number;
}

export function generateExportReport(
  version: BridgeVersion,
  results: SimulationResult[],
  judgeResult: JudgeResult,
  levelName: string
): ExportReport {
  const finalResult = results[results.length - 1];
  const loadMagnitude = finalResult ? (finalResult.maxStress / (finalResult.maxStress > 0 ? finalResult.maxStress : 1)) * 100000 : 100000;

  return {
    versionId: version.id,
    levelName,
    totalSteps: results.length,
    loadMagnitude,
    results,
    finalResult,
    judgeResult,
    members: version.members,
    nodes: version.nodes,
    budget: version.budget,
  };
}

export function exportToCSV(report: ExportReport): string {
  const lines: string[] = [];
  const { results, finalResult, judgeResult, members, levelName, loadMagnitude, totalSteps, budget } = report;

  const maxStressByMember: Record<string, number> = {};
  const maxForceByMember: Record<string, number> = {};

  for (const result of results) {
    for (const [memberId, stress] of Object.entries(result.memberStresses)) {
      if (!maxStressByMember[memberId] || stress > maxStressByMember[memberId]) {
        maxStressByMember[memberId] = stress;
      }
    }
    for (const [memberId, force] of Object.entries(result.memberForces)) {
      const absForce = Math.abs(force);
      if (!maxForceByMember[memberId] || absForce > maxForceByMember[memberId]) {
        maxForceByMember[memberId] = absForce;
      }
    }
  }

  const overallMaxStress = Math.max(...Object.values(maxStressByMember));
  const overallMaxStressMember = Object.entries(maxStressByMember)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  lines.push('=== 桥梁受力分析报告 ===');
  lines.push('');
  lines.push('--- 版本信息 ---');
  lines.push('版本ID,' + report.versionId);
  lines.push('关卡,' + levelName);
  lines.push('载荷大小(N),' + loadMagnitude.toLocaleString());
  lines.push('预算,¥' + budget.toFixed(0));
  lines.push('');

  lines.push('--- 结算摘要 ---');
  lines.push('总步数,' + totalSteps);
  lines.push('最大应力(MPa),' + Math.round(overallMaxStress / 1e6 * 100) / 100);
  lines.push('最大应力杆件,' + overallMaxStressMember);
  lines.push('总造价,¥' + finalResult.totalCost.toFixed(0));
  lines.push('结算结果,' + (judgeResult.passed ? '通过' : '失败'));
  if (judgeResult.message) {
    lines.push('失败原因,' + judgeResult.message);
  }
  lines.push('');

  lines.push('--- 详细结果 ---');
  lines.push('步号,载荷位置(%),最大应力(MPa),最大应力杆件,状态');
  for (const r of results) {
    const status = r.status === 'running' ? (judgeResult.passed ? '通过' : '失败') : r.status;
    lines.push(`${r.loadStep},${Math.round(r.loadPosition * 100) / 100},${Math.round(r.maxStress / 1e6 * 100) / 100},${r.maxStressMemberId},${status}`);
  }
  lines.push('');

  lines.push('--- 杆件详情 ---');
  lines.push('杆件ID,起点,终点,截面积(cm²),材料,最大轴力(N),最大应力(MPa),屈服强度(MPa),安全系数');
  for (const member of members) {
    const maxStress = maxStressByMember[member.id] || 0;
    const maxForce = maxForceByMember[member.id] || 0;
    const yieldStressPa = member.yieldStrength * 1e6;
    const safetyFactor = maxStress > 0 ? yieldStressPa / maxStress : Infinity;

    lines.push(
      `${member.id},${member.startNodeId},${member.endNodeId},${member.area},${member.material},` +
      `${Math.round(maxForce * 100) / 100},${Math.round(maxStress / 1e6 * 100) / 100},${member.yieldStrength},${Math.round(safetyFactor * 100) / 100}`
    );
  }

  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportResultToCSV(
  version: BridgeVersion,
  results: SimulationResult[],
  judgeResult: JudgeResult,
  levelName: string
): void {
  const report = generateExportReport(version, results, judgeResult, levelName);
  const csv = exportToCSV(report);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `桥梁受力分析_${version.name}_${timestamp}.csv`;
  downloadCSV(csv, filename);
}
