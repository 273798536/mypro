import { useCallback } from 'react';

export function useExportImage() {
  const exportImage = useCallback((canvas: HTMLCanvasElement, filename?: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const name = filename || `cashflow-terrain-${timestamp}.png`;

    const link = document.createElement('a');
    link.download = name;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return { exportImage };
}