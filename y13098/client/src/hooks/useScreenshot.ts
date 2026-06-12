import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { exportApi } from '../api';
import type { FilterCriteria } from '@shared/types';

export function useScreenshot() {
  const targetRef = useRef<HTMLDivElement>(null);

  const takeScreenshot = useCallback(async (
    filterCriteria: FilterCriteria,
    recordId?: string,
    annotation?: string,
    remark?: string
  ): Promise<string | null> => {
    if (!targetRef.current) {
      console.error('Target element not found');
      return null;
    }

    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imageUrl = canvas.toDataURL('image/png');
      
      await exportApi.saveScreenshot({
        recordId,
        filterCriteria,
        imageUrl,
        annotation,
        remark
      });

      return imageUrl;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return null;
    }
  }, []);

  const downloadScreenshot = useCallback((imageUrl: string, fileName: string = 'screenshot.png') => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = imageUrl;
    link.click();
  }, []);

  return {
    targetRef,
    takeScreenshot,
    downloadScreenshot
  };
}
