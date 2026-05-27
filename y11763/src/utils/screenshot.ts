export function captureScreenshot(
  canvas: HTMLCanvasElement,
  filename: string = `cloud-chamber-${Date.now()}.png`
): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function getCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
}

export function copyScreenshotToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  return getCanvasBlob(canvas).then((blob) => {
    const item = new ClipboardItem({ 'image/png': blob });
    return navigator.clipboard.write([item]);
  });
}
