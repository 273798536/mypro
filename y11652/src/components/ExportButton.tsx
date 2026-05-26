import React, { useState } from 'react';
import { Download, FileJson, FileText, Check } from 'lucide-react';
import type { GameReport } from '@/types';
import { exportToJSON, exportToMarkdown, downloadFile } from '@/utils/reportGenerator';

interface ExportButtonProps {
  report: GameReport;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ report, className = '' }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'markdown') => {
    setIsExporting(true);
    setExportSuccess(null);

    try {
      const filename = `archive-audit-report-${new Date(report.startTime).toISOString().split('T')[0]}`;
      
      if (format === 'json') {
        const content = exportToJSON(report);
        downloadFile(content, `${filename}.json`, 'application/json');
      } else {
        const content = exportToMarkdown(report);
        downloadFile(content, `${filename}.md`, 'text/markdown');
      }

      setExportSuccess(format);
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('json')}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {exportSuccess === 'json' ? <Check size={16} /> : <FileJson size={16} />}
          导出JSON
        </button>
        <button
          onClick={() => handleExport('markdown')}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {exportSuccess === 'markdown' ? <Check size={16} /> : <FileText size={16} />}
          导出Markdown
        </button>
      </div>
    </div>
  );
};
