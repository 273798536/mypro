import html2canvas from 'html2canvas';

export async function captureElement(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0a0e17',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
