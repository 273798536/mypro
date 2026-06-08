import type { Cage, CameraView, ExportReport, LayoutConfig, ValidationIssue } from '@/types';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function generateRunId(): string {
  const now = new Date();
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '-' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export function buildReport(
  cages: Cage[],
  config: LayoutConfig,
  issues: ValidationIssue[],
  cameraViews: CameraView[],
): ExportReport {
  const summary = {
    total: cages.length,
    normal: cages.filter((c) => c.status === 'normal').length,
    pending: cages.filter((c) => c.status === 'pending').length,
    error: cages.filter((c) => c.status === 'error').length,
  };
  return {
    runId: generateRunId(),
    exportedAt: new Date().toISOString(),
    cages,
    config,
    issues,
    cameraViews,
    summary,
  };
}

function statusText(s: Cage['status']): string {
  return s === 'normal' ? '正常' : s === 'pending' ? '待确认' : '异常';
}

function issueTypeText(t: ValidationIssue['type']): string {
  return t === 'out_of_bounds' ? '坐标越界' : t === 'floating' ? '离群漂浮' : '视角丢失';
}

export function reportToText(report: ExportReport): string {
  const lines: string[] = [];
  lines.push('========================================');
  lines.push('  实验动物笼位三维排布 - 审核报告');
  lines.push('========================================');
  lines.push(`运行编号: ${report.runId}`);
  lines.push(`导出时间: ${new Date(report.exportedAt).toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push('--- 统计概览 ---');
  lines.push(`笼位总数: ${report.summary.total}`);
  lines.push(`  正常:   ${report.summary.normal}`);
  lines.push(`  待确认: ${report.summary.pending}`);
  lines.push(`  异常:   ${report.summary.error}`);
  lines.push('');
  lines.push('--- 排布参数 ---');
  lines.push(`行数: ${report.config.rows}  列数: ${report.config.cols}  层数: ${report.config.layers}`);
  lines.push(
    `间距 X: ${report.config.spacingX}  Y: ${report.config.spacingY}  Z: ${report.config.spacingZ}`,
  );
  const b = report.config.bounds;
  lines.push(
    `边界 X: [${b.minX}, ${b.maxX}]  Y: [${b.minY}, ${b.maxY}]  Z: [${b.minZ}, ${b.maxZ}]`,
  );
  lines.push('');
  lines.push('--- 笼位明细 ---');
  lines.push('编号\t行列层\t坐标(X,Y,Z)\t\t状态\t备注');
  for (const c of report.cages) {
    lines.push(
      `${c.id}\tL${c.layer + 1}R${c.row + 1}C${c.col + 1}\t(${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})\t${statusText(c.status)}\t${c.remark}`,
    );
  }
  lines.push('');
  lines.push('--- 校验问题 / 拦截说明 ---');
  if (report.issues.length === 0) {
    lines.push('无异常，排布通过审核。');
  } else {
    for (const iss of report.issues) {
      lines.push(`[${issueTypeText(iss.type)}] ${iss.message}`);
      lines.push(`   详情: ${iss.detail}`);
      if (iss.cageId) lines.push(`   关联笼位: ${iss.cageId}`);
      if (iss.type === 'camera_lost') {
        lines.push('   处理建议: 该问题将阻止排布提交，请加载已保存视角或重新调整相机目标点至笼位区域内。');
      }
    }
  }
  lines.push('');
  lines.push('--- 已保存视角 ---');
  if (report.cameraViews.length === 0) {
    lines.push('（无）');
  } else {
    for (const v of report.cameraViews) {
      lines.push(
        `${v.name} - 相机(${v.position.x.toFixed(2)}, ${v.position.y.toFixed(2)}, ${v.position.z.toFixed(2)}) -> 目标(${v.target.x.toFixed(2)}, ${v.target.y.toFixed(2)}, ${v.target.z.toFixed(2)})`,
      );
    }
  }
  lines.push('');
  lines.push('========================================');
  return lines.join('\n');
}

export function downloadReport(report: ExportReport): void {
  const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const textBlob = new Blob([reportToText(report)], { type: 'text/plain;charset=utf-8' });

  const jsonUrl = URL.createObjectURL(jsonBlob);
  const textUrl = URL.createObjectURL(textBlob);

  const a1 = document.createElement('a');
  a1.href = jsonUrl;
  a1.download = `cage-layout-${report.runId}.json`;
  document.body.appendChild(a1);
  a1.click();
  document.body.removeChild(a1);
  URL.revokeObjectURL(jsonUrl);

  const a2 = document.createElement('a');
  a2.href = textUrl;
  a2.download = `cage-layout-${report.runId}.txt`;
  document.body.appendChild(a2);
  a2.click();
  document.body.removeChild(a2);
  URL.revokeObjectURL(textUrl);
}
