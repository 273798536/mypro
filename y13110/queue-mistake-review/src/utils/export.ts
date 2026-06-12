import html2canvas from 'html2canvas';

export interface ExportOptions {
  filename?: string;
  includeTimestamp?: boolean;
  scale?: number;
}

export async function exportElementAsImage(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = '错题复盘',
    includeTimestamp = true,
    scale = 2
  } = options;
  
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });
  
  const link = document.createElement('a');
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  link.download = `${filename}${timestamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportElementAsCanvas(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<HTMLCanvasElement> {
  const { scale = 2 } = options;
  
  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });
}

export function generateExportFilename(baseName: string, includeTimestamp: boolean = true): string {
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  return `${baseName}${timestamp}.png`;
}

export function getStatusLabelForExport(status: string, statusMap: Record<string, string>): string {
  return statusMap[status] || status;
}
