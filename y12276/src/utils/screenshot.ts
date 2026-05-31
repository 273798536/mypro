import html2canvas from 'html2canvas';
import type { Screenshot } from '@/types';

export async function captureScreenshot(
  elementId: string,
  description: string,
  cameraPosition: [number, number, number],
  cameraTarget: [number, number, number],
  objectIds: string[] = [],
  conflictId?: string
): Promise<Screenshot | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for screenshot:', elementId);
    return null;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');

    const screenshot: Screenshot = {
      id: `screenshot_${Date.now()}`,
      timestamp: Date.now(),
      dataUrl,
      conflictId,
      description,
      cameraPosition,
      cameraTarget,
      objectIds,
    };

    return screenshot;
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
}

export function downloadScreenshot(screenshot: Screenshot): void {
  const link = document.createElement('a');
  link.download = `${screenshot.description.replace(/\s+/g, '_')}_${screenshot.id}.png`;
  link.href = screenshot.dataUrl;
  link.click();
}

export function downloadAllScreenshots(screenshots: Screenshot[]): void {
  screenshots.forEach((screenshot, index) => {
    setTimeout(() => {
      downloadScreenshot(screenshot);
    }, index * 500);
  });
}

export function copyScreenshotToClipboard(screenshot: Screenshot): Promise<boolean> {
  return fetch(screenshot.dataUrl)
    .then((res) => res.blob())
    .then((blob) => {
      return navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]).then(() => true).catch(() => false);
    })
    .catch(() => false);
}
