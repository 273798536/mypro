import React, { useState } from 'react';
import { Camera, Download, FileJson, FileText, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { exportToJSON, generateReportContent } from '@/utils/export';
import type {
  FittingSession,
  RawDataRecord,
  DataSource,
  FittingParameter,
  Alert,
  CorrectionTrace,
  InitialParams,
  ParameterBounds,
} from '@/store/fittingStore';
import { cn } from '@/lib/utils';

export interface ExportToolbarProps {
  chartRef: React.RefObject<HTMLElement | null>;
  sessionData: {
    session: FittingSession | null;
    rawData: RawDataRecord[];
    dataSources: DataSource[];
    initialParams: InitialParams;
    parameterBounds: ParameterBounds;
    fittedParams: FittingParameter[];
    residuals: number[];
    alerts: Alert[];
    corrections: CorrectionTrace[];
  };
}

export default function ExportToolbar({ chartRef, sessionData }: ExportToolbarProps) {
  const [exporting, setExporting] = useState<'png' | 'json' | 'report' | null>(null);

  const hasData = sessionData.session && sessionData.rawData.length > 0;

  const handleScreenshot = async () => {
    if (!chartRef.current || !hasData) return;
    
    setExporting('png');
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#16162a',
        scale: 2,
        logging: false,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `battery-fitting-chart-${sessionData.session!.id.slice(0, 8)}-${Date.now()}.png`;
          saveAs(blob, fileName);
        }
      });
    } catch (error) {
      console.error('截图失败:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJSON = () => {
    if (!hasData) return;
    
    setExporting('json');
    try {
      exportToJSON(
        sessionData.session!,
        sessionData.rawData,
        sessionData.dataSources,
        sessionData.initialParams as unknown as Record<string, number>,
        sessionData.parameterBounds as unknown as Record<string, { min: number; max: number }>,
        sessionData.fittedParams,
        sessionData.residuals,
        sessionData.alerts,
        sessionData.corrections
      );
    } catch (error) {
      console.error('导出JSON失败:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleGenerateReport = () => {
    if (!hasData) return;
    
    setExporting('report');
    try {
      const content = generateReportContent(
        sessionData.session!,
        sessionData.rawData,
        sessionData.initialParams as unknown as Record<string, number>,
        sessionData.fittedParams,
        sessionData.alerts,
        sessionData.corrections,
        sessionData.dataSources
      );
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const fileName = `battery-fitting-report-${sessionData.session!.id.slice(0, 8)}-${Date.now()}.txt`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('生成报告失败:', error);
    } finally {
      setExporting(null);
    }
  };

  const buttons = [
    {
      id: 'png' as const,
      icon: <Camera size={16} />,
      label: '截图PNG',
      onClick: handleScreenshot,
      color: 'bg-[#2a2a4e] hover:bg-[#3a3a5e]',
    },
    {
      id: 'json' as const,
      icon: <FileJson size={16} />,
      label: '导出JSON',
      onClick: handleExportJSON,
      color: 'bg-[#2a2a4e] hover:bg-[#3a3a5e]',
    },
    {
      id: 'report' as const,
      icon: <FileText size={16} />,
      label: '拟合报告',
      onClick: handleGenerateReport,
      color: 'bg-[#00d4ff] hover:bg-[#00e5ff] text-[#0f0f1e]',
    },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-[#16162a] border border-[#2a2a4e] rounded-lg">
      <div className="flex items-center gap-1 px-2 text-gray-400">
        <Download size={14} />
        <span className="text-xs font-medium">导出</span>
      </div>
      <div className="h-4 w-px bg-[#2a2a4e]" />
      <div className="flex gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            disabled={!hasData || exporting !== null}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              btn.color,
              (!hasData || exporting !== null) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {exporting === btn.id ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              btn.icon
            )}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
