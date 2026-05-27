import type { StatePoint, Process } from '../types';
import { PROCESS_LABELS } from '../types';

export function exportScreenshot(canvas: HTMLCanvasElement, filename: string = 'pv-diagram.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function generateReport(
  statePoints: StatePoint[],
  processes: Process[],
  cycleResult: {
    netWork: number;
    netHeat: number;
    efficiency: number;
    heatIn: number;
    heatOut: number;
    isClosed: boolean;
  } | null,
  anomalies: Array<{ type: string; message: string; severity: string }>
): string {
  const timestamp = new Date().toLocaleString('zh-CN');

  let report = `# 热力学循环计算报告\n`;
  report += `生成时间: ${timestamp}\n\n`;

  report += `## 状态点\n\n`;
  report += `| 标签 | 压强 P (Pa) | 体积 V (m³) | 温度 T (K) | 来源 |\n`;
  report += `|------|------------|------------|-----------|------|\n`;
  statePoints.forEach(p => {
    report += `| ${p.label} | ${p.P.toExponential(4)} | ${p.V.toExponential(4)} | ${p.T.toFixed(2)} | ${p.source || '-'} |\n`;
  });
  report += `\n`;

  report += `## 过程\n\n`;
  report += `| 序号 | 过程 | 类型 | 功 W (J) | 热量 Q (J) | 内能变化 ΔU (J) | 来源 |\n`;
  report += `|------|------|------|---------|----------|----------------|------|\n`;
  processes.forEach((p, i) => {
    const fromLabel = statePoints.find(sp => sp.id === p.from)?.label || '?';
    const toLabel = statePoints.find(sp => sp.id === p.to)?.label || '?';
    report += `| ${i + 1} | ${fromLabel}→${toLabel} | ${PROCESS_LABELS[p.type]} | ${p.W.toFixed(2)} | ${p.Q.toFixed(2)} | ${p.deltaU.toFixed(2)} | ${p.source || '-'} |\n`;
  });
  report += `\n`;

  if (cycleResult) {
    report += `## 循环分析\n\n`;
    report += `- 循环状态: ${cycleResult.isClosed ? '✓ 已闭合' : '✗ 未闭合'}\n`;
    report += `- 净功 W_net: ${cycleResult.netWork.toFixed(2)} J\n`;
    report += `- 净热量 Q_net: ${cycleResult.netHeat.toFixed(2)} J\n`;
    report += `- 总吸热 Q_in: ${cycleResult.heatIn.toFixed(2)} J\n`;
    report += `- 总放热 Q_out: ${cycleResult.heatOut.toFixed(2)} J\n`;
    if (cycleResult.isClosed) {
      report += `- 循环效率 η: ${cycleResult.efficiency.toFixed(4)}%\n`;
    }
    report += `\n`;
  }

  if (anomalies.length > 0) {
    report += `## 异常检测\n\n`;
    const errors = anomalies.filter(a => a.severity === 'error');
    const warnings = anomalies.filter(a => a.severity === 'warning');

    if (errors.length > 0) {
      report += `### 错误 (${errors.length})\n\n`;
      errors.forEach((a, i) => {
        report += `${i + 1}. **[${a.type}]** ${a.message}\n`;
      });
      report += `\n`;
    }

    if (warnings.length > 0) {
      report += `### 警告 (${warnings.length})\n\n`;
      warnings.forEach((a, i) => {
        report += `${i + 1}. **[${a.type}]** ${a.message}\n`;
      });
      report += `\n`;
    }
  } else {
    report += `## 异常检测\n\n✓ 未检测到异常\n\n`;
  }

  report += `---\n`;
  report += `*本报告由热力学循环教学器自动生成*\n`;

  return report;
}

export function downloadReport(report: string, filename: string = 'thermodynamics-report.md') {
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
