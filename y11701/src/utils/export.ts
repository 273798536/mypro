import type { Scheme, QueueResult, SchemeParams } from '@/types';

export function exportChartPNG(chart: echarts.ECharts, filename: string): void {
  const url = chart.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#1A2332',
  });
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function exportChartSVG(chart: echarts.ECharts, filename: string): void {
  const url = chart.getDataURL({
    type: 'svg',
    pixelRatio: 1,
    backgroundColor: '#1A2332',
  });
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function generateReport(scheme: Scheme): string {
  const { name, params, result, anomalies, revisions } = scheme;

  const lines: string[] = [];
  lines.push(`# ${name} - 排队论试算报告`);
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');

  lines.push('## 输入参数');
  lines.push(`| 参数 | 值 |`);
  lines.push(`|------|-----|`);
  lines.push(`| 到达率 λ | ${params.arrivalRate} 人/分钟 |`);
  lines.push(`| 服务率 μ | ${params.serviceRate} 人/分钟 |`);
  lines.push(`| 柜台数 c | ${params.numCounters} |`);
  lines.push(`| 排队阈值 | ${params.queueThreshold} 人 |`);
  lines.push(`| 午休时段 | ${params.lunchStart} - ${params.lunchEnd} |`);
  lines.push(`| 高峰到达率 | ${params.peakArrivalRate} 人/分钟 |`);
  lines.push(`| 平均服务时长 | ${params.avgServiceTime} 分钟 |`);
  lines.push(`| 最长服务时长 | ${params.maxServiceTime} 分钟 |`);
  lines.push(`| 柜台切换成本 | ${params.switchCost} 分钟 |`);
  lines.push('');

  lines.push('## M/M/c 计算结果');
  lines.push(`| 指标 | 值 |`);
  lines.push(`|------|-----|`);
  lines.push(`| 服务强度 ρ | ${result.rho.toFixed(4)} |`);
  lines.push(`| 系统空闲概率 P0 | ${(result.P0 * 100).toFixed(2)}% |`);
  lines.push(`| 平均队列长度 Lq | ${result.Lq.toFixed(2)} 人 |`);
  lines.push(`| 系统平均顾客数 L | ${result.L.toFixed(2)} 人 |`);
  lines.push(`| 平均等待时间 Wq | ${result.Wq.toFixed(2)} 分钟 |`);
  lines.push(`| 系统平均逗留时间 W | ${result.W.toFixed(2)} 分钟 |`);
  lines.push(`| 顾客等待概率 Pw | ${(result.Pw * 100).toFixed(2)}% |`);
  lines.push(`| 柜台利用率 | ${(result.utilization * 100).toFixed(2)}% |`);
  lines.push('');

  if (anomalies.length > 0) {
    lines.push('## 异常提示');
    for (const a of anomalies) {
      const flag = a.excludedFromNormal ? '[排除正常结果]' : '';
      lines.push(`- ${flag} ${a.message}`);
    }
    lines.push('');
  }

  if (revisions.length > 0) {
    lines.push('## 修正痕迹');
    for (const r of revisions) {
      lines.push(`- ${r.timestamp} [${r.source}] ${r.field}: ${r.oldValue} → ${r.newValue} (${r.reason})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
