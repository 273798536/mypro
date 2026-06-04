import { useState, useRef } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { ExportService } from '@/services/exportService';
import type { Selection } from '@/types';
import { useReportStore } from '@/store/useReportStore';

interface ExportButtonProps {
  selections: Selection[];
  sampleName: string;
  reportRef: React.RefObject<HTMLDivElement>;
}

export function ExportButton({ selections, sampleName, reportRef }: ExportButtonProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const { generateReport } = useReportStore();

  const handleExportPDF = async () => {
    if (!reportRef.current || selections.length === 0) return;
    
    setExporting('pdf');
    try {
      const mandarinExplanation = '';
      generateReport('', selections, mandarinExplanation);
      await ExportService.exportToPDF(reportRef.current, `病斑检测报告-${sampleName}`);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportCSV = () => {
    if (selections.length === 0) return;
    
    setExporting('csv');
    try {
      const report = {
        id: `report-${Date.now()}`,
        sampleId: '',
        selections,
        summary: {
          total: selections.length,
          passed: selections.filter(s => s.detectionResult === 'pass').length,
          warnings: selections.filter(s => s.detectionResult === 'warning').length,
          failed: selections.filter(s => s.detectionResult === 'fail').length
        },
        mandarinExplanation: '',
        generatedAt: new Date()
      };
      ExportService.exportToCSV(report, `病斑检测数据-${sampleName}`);
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJSON = () => {
    if (selections.length === 0) return;
    
    setExporting('json');
    try {
      ExportService.exportSelectionsToJSON(selections, `病斑圈选数据-${sampleName}`);
    } catch (error) {
      console.error('JSON export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const isDisabled = selections.length === 0 || exporting !== null;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#2D5A27]/10 rounded-lg">
          <Download className="w-6 h-6 text-[#2D5A27]" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">导出报告</h3>
          <p className="text-sm text-gray-500">支持多种格式导出，数据来源一致</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleExportPDF}
          disabled={isDisabled}
          className="flex flex-col items-center gap-2 p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'pdf' ? (
            <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
          ) : (
            <FileText className="w-6 h-6 text-red-600" />
          )}
          <span className="text-sm font-medium text-red-700">PDF报告</span>
        </button>

        <button
          onClick={handleExportCSV}
          disabled={isDisabled}
          className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'csv' ? (
            <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
          )}
          <span className="text-sm font-medium text-green-700">CSV数据</span>
        </button>

        <button
          onClick={handleExportJSON}
          disabled={isDisabled}
          className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'json' ? (
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          ) : (
            <FileJson className="w-6 h-6 text-blue-600" />
          )}
          <span className="text-sm font-medium text-blue-700">JSON数据</span>
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          <strong>注意：</strong>所有导出格式使用同一批检测数据，确保图表、明细和下载结果的数据一致性。
        </p>
      </div>
    </div>
  );
}
