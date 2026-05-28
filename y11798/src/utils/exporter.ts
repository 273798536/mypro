import html2canvas from 'html2canvas';
import { CalculationInput, CalculationResult, ValidationError } from '../types';
import { formatNumber } from './calculator';

export async function captureScreenshot(elementId: string, filename: string = 'hydraulic-jack-calculation.png'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    background: '#ffffff',
    useCORS: true,
    logging: false,
  } as any);

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function generateReport(
  input: CalculationInput,
  result: CalculationResult,
  errors: ValidationError[]
): string {
  const timestamp = new Date().toLocaleString('zh-CN');
  const source = input.source || '课堂练习';

  const reportLines: string[] = [
    '═'.repeat(60),
    '          液压千斤顶计算报告',
    '═'.repeat(60),
    '',
    `生成时间: ${timestamp}`,
    `材料来源: ${source}`,
    '',
    '─'.repeat(60),
    '【输入参数】',
    '─'.repeat(60),
    `小活塞面积: ${formatNumber(input.smallPistonArea)} ${input.smallPistonAreaUnit}`,
    `大活塞面积: ${formatNumber(input.largePistonArea)} ${input.largePistonAreaUnit}`,
    `输入力: ${formatNumber(input.inputForce)} ${input.inputForceUnit}`,
    `输入行程: ${formatNumber(input.inputStroke)} ${input.inputStrokeUnit}`,
    `效率: ${formatNumber(input.efficiency * 100, 2)}%`,
    '',
    '─'.repeat(60),
    '【计算结果】',
    '─'.repeat(60),
    `液体压强: ${formatNumber(result.pressure)} ${result.pressureUnit}`,
    `输出力: ${formatNumber(result.outputForce)} ${result.outputForceUnit}`,
    `力放大倍数: ${formatNumber(result.amplificationRatio, 2)} 倍`,
    `输出行程: ${formatNumber(result.outputStroke)} ${result.outputStrokeUnit}`,
    `行程比: ${formatNumber(result.strokeRatio * 100, 2)}%`,
    '',
    '─'.repeat(60),
    '【能量分析】',
    '─'.repeat(60),
    `输入功: ${formatNumber(result.inputWork)} ${result.inputWorkUnit}`,
    `输出功: ${formatNumber(result.outputWork)} ${result.outputWorkUnit}`,
    `能量损失: ${formatNumber(result.energyLoss)} ${result.energyLossUnit}`,
    '',
    '─'.repeat(60),
    '【物理原理说明】',
    '─'.repeat(60),
    '1. 帕斯卡定律：密闭液体中的压强等值传递',
    `   P = F₁/A₁ = F₂/A₂`,
    `   F₂ = F₁ × (A₂/A₁) × η`,
    '',
    '2. 体积守恒（理想状态）：',
    `   A₁ × S₁ = A₂ × S₂`,
    `   S₂ = S₁ × (A₁/A₂)`,
    '',
    '3. 能量守恒：',
    `   W₁ = W₂ + W_loss`,
    `   η = W₂ / W₁`,
    '',
    '4. 核心结论：',
    `   力放大 ${formatNumber(result.amplificationRatio, 2)} 倍的代价是`,
    `   行程缩小为原来的 ${formatNumber(result.strokeRatio * 100, 2)}%`,
  ];

  if (errors.length > 0) {
    reportLines.push(
      '',
      '─'.repeat(60),
      '【校验提示】',
      '─'.repeat(60),
    );
    errors.forEach((err, i) => {
      reportLines.push(`${i + 1}. [${err.severity === 'error' ? '错误' : '警告'}] ${err.message}`);
      reportLines.push(`   建议: ${err.suggestion}`);
    });
  }

  reportLines.push(
    '',
    '═'.repeat(60),
    '      液压千斤顶课堂器 - 机械基础教学工具',
    '═'.repeat(60),
  );

  return reportLines.join('\n');
}

export function downloadReport(report: string, filename: string = 'hydraulic-jack-report.txt'): void {
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}
