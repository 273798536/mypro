import { AppConfig } from '@/types';

export function takeScreenshot(
  canvas: HTMLCanvasElement,
  filename: string = 'magnetic-field-screenshot.png'
): void {
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
}

export function exportConfig(config: AppConfig): void {
  const configWithTimestamp = {
    ...config,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob(
    [JSON.stringify(configWithTimestamp, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `magnetic-config-${Date.now()}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function importConfig(file: File): Promise<AppConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string) as AppConfig;
        resolve(config);
      } catch (error) {
        reject(new Error('Invalid config file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
