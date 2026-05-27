import html2canvas from 'html2canvas';

export async function exportScreenshot(elementId: string, filename: string = 'seismic-sandbox-report.png'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Export target element not found:', elementId);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0e1a',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Screenshot export failed:', err);
  }
}

export function generateReportText(
  epicenterInfo: string,
  layerInfo: string[],
  stationInfo: string[],
  validationInfo: string[]
): string {
  const lines: string[] = [
    '=== 地震波传播沙盒 - 课堂报告 ===',
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '【震源信息】',
    epicenterInfo,
    '',
    '【地层参数】',
    ...layerInfo,
    '',
    '【测站记录】',
    ...stationInfo,
    '',
    '【校验结果】',
    ...validationInfo,
    '',
    '=== 报告结束 ===',
  ];
  return lines.join('\n');
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}
