import React, { useState } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, FileJson } from 'lucide-react';

interface ExportButtonProps {
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExport, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    { format: 'csv' as const, label: '导出 CSV', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { format: 'excel' as const, label: '导出文本报告', icon: <FileText className="w-4 h-4" /> },
  ];

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">导出报告</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          {exportOptions.map((option) => (
            <button
              key={option.format}
              onClick={() => handleExport(option.format)}
              className="w-full px-4 py-2 flex items-center gap-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ExportButton;
