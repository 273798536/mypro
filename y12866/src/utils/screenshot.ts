import html2canvas from 'html2canvas';

export async function captureScreenshot(elementId: string, filename: string = '码头压载水申报截图'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const flashOverlay = document.createElement('div');
  flashOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:99999;pointer-events:none;opacity:0;transition:opacity 0.15s;';
  document.body.appendChild(flashOverlay);
  flashOverlay.style.opacity = '1';

  await new Promise(r => setTimeout(r, 150));

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#F8FAFC',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    flashOverlay.style.opacity = '0';
    setTimeout(() => flashOverlay.remove(), 200);

    const link = document.createElement('a');
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    flashOverlay.style.opacity = '0';
    setTimeout(() => flashOverlay.remove(), 200);
  }
}
