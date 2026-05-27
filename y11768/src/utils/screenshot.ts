import html2canvas from 'html2canvas';

export async function exportScreenshot(elementId: string, filename: string = 'loan-funnel-3d.png'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Export target element not found:', elementId);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0A1628',
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
