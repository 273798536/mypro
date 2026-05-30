export const exportScreenshot = (canvas: HTMLCanvasElement, filename: string = 'stage-sandbox') => {
  const link = document.createElement('a');
  link.download = `${filename}-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const captureCanvas = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png');
};
