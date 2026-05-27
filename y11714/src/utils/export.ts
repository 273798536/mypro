import { ExperimentResult, GROUND_MATERIALS } from '../types';

export function generateCSV(results: ExperimentResult[]): string {
  const headers = [
    '实验ID',
    '时间',
    '小球质量(kg)',
    '下落高度(m)',
    '地面材质',
    '预设恢复系数',
    '反弹高度(m)',
    '计算恢复系数',
    '是否异常',
    '异常信息',
  ];

  const rows = results.map((r) => {
    const material = GROUND_MATERIALS.find((m) => m.id === r.params.groundMaterial);
    return [
      r.id,
      new Date(r.timestamp).toLocaleString('zh-CN'),
      r.params.ballMass.toFixed(4),
      r.params.dropHeight.toFixed(4),
      material?.name || r.params.groundMaterial,
      r.params.restitution.toFixed(4),
      r.bounceHeight.toFixed(4),
      r.calculatedRestitution.toFixed(4),
      r.isAnomaly ? '是' : '否',
      r.anomalies.join('; '),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(results: ExperimentResult[], filename: string = 'experiment_results.csv'): void {
  const csv = generateCSV(results);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadScreenshot(canvas: HTMLCanvasElement, filename: string = 'screenshot.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function generateReportMarkdown(result: ExperimentResult): string {
  const material = GROUND_MATERIALS.find((m) => m.id === result.params.groundMaterial);
  const date = new Date(result.timestamp).toLocaleString('zh-CN');

  return `# 碰撞恢复系数实验报告

## 实验基本信息

- **实验ID**: ${result.id}
- **实验时间**: ${date}

## 实验参数

| 参数 | 值 |
|------|-----|
| 小球质量 | ${result.params.ballMass.toFixed(4)} kg |
| 下落高度 | ${result.params.dropHeight.toFixed(4)} m |
| 地面材质 | ${material?.name || result.params.groundMaterial} |
| 预设恢复系数 | ${result.params.restitution.toFixed(4)} |

## 实验结果

| 指标 | 值 |
|------|-----|
| 反弹高度 | ${result.bounceHeight.toFixed(4)} m |
| 计算恢复系数 | ${result.calculatedRestitution.toFixed(4)} |
| 实验状态 | ${result.isAnomaly ? '⚠️ 存在异常' : '✓ 正常'} |

## 物理原理

恢复系数（Coefficient of Restitution）是描述碰撞弹性的物理量，计算公式为：

\`\`\`
e = √(h2 / h1)
\`\`\`

其中:
- h1 = 下落高度 = ${result.params.dropHeight.toFixed(4)} m
- h2 = 反弹高度 = ${result.bounceHeight.toFixed(4)} m
- e = √(${result.bounceHeight.toFixed(4)} / ${result.params.dropHeight.toFixed(4)}) = ${result.calculatedRestitution.toFixed(4)}

## 异常检测

${result.isAnomaly
    ? `⚠️ **检测到以下异常:**\n\n${result.anomalies.map((a) => `- ${a}`).join('\n')}`
    : '✓ 未检测到异常，实验数据正常。'
}

## 结论

${result.isAnomaly
    ? '本次实验存在异常，建议检查参数设置或重新实验。'
    : `本次实验测得恢复系数为 ${result.calculatedRestitution.toFixed(4)}，符合预期范围 [0, 1]。`
}
`;
}

export function downloadReport(result: ExperimentResult, filename: string = 'experiment_report.md'): void {
  const markdown = generateReportMarkdown(result);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportCanvasWithData(
  canvas: HTMLCanvasElement,
  result: ExperimentResult,
  filename: string = 'experiment_with_data.png'
): void {
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d')!;
  const padding = 20;
  const infoHeight = 120;

  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height + infoHeight;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  ctx.drawImage(canvas, 0, 0);

  const infoY = canvas.height + padding;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`下落高度: ${result.params.dropHeight.toFixed(2)}m`, padding, infoY);
  ctx.fillText(`反弹高度: ${result.bounceHeight.toFixed(2)}m`, padding, infoY + 22);
  ctx.fillText(`恢复系数: ${result.calculatedRestitution.toFixed(4)}`, padding, infoY + 44);
  ctx.fillText(`质量: ${result.params.ballMass.toFixed(2)}kg`, padding, infoY + 66);
  ctx.fillStyle = result.isAnomaly ? '#ef4444' : '#22c55e';
  ctx.fillText(`状态: ${result.isAnomaly ? '异常' : '正常'}`, padding, infoY + 88);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    `时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}`,
    canvas.width - 200,
    infoY
  );

  const link = document.createElement('a');
  link.download = filename;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}
