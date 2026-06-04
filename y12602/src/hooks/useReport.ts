import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useAppStore } from '@/store/useAppStore';
import { AnomalyType, ANOMALY_EXPLANATIONS } from '@/types';
import { downloadReport, copyToClipboard } from '@/utils/report';

export function useReport() {
  const { currentReport, showReportModal, setShowReportModal, clearReport } = useAppStore();

  const getAnomalyExplanation = useCallback((type: AnomalyType): string => {
    return ANOMALY_EXPLANATIONS[type];
  }, []);

  const exportAsJson = useCallback(() => {
    if (!currentReport) return;
    downloadReport(currentReport, 'json');
  }, [currentReport]);

  const exportAsTxt = useCallback(() => {
    if (!currentReport) return;
    downloadReport(currentReport, 'txt');
  }, [currentReport]);

  const exportAsImage = useCallback(async (element: HTMLElement): Promise<string | null> => {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to export as image:', error);
      return null;
    }
  }, []);

  const copySummary = useCallback(async (): Promise<boolean> => {
    if (!currentReport) return false;
    return copyToClipboard(currentReport.plainTextSummary);
  }, [currentReport]);

  return {
    report: currentReport,
    showReportModal,
    setShowReportModal,
    clearReport,
    getAnomalyExplanation,
    exportAsJson,
    exportAsTxt,
    exportAsImage,
    copySummary,
  };
}
