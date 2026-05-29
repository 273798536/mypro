import html2canvas from 'html2canvas';

export async function captureScreenshot(
  elementId: string,
  options: {
    filename?: string;
    scale?: number;
    backgroundColor?: string;
  } = {}
): Promise<string | null> {
  const { filename = 'fund-flow-screenshot', scale = 2, backgroundColor = '#0a1628' } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return null;
  }

  try {
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `${filename}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    return dataUrl;
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
