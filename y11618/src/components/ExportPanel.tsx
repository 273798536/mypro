import { useState } from 'react';
import type { InvoiceAnalysis } from '../types';
import { exportToCSV } from '../engine/processor';

interface Props {
  analysis: InvoiceAnalysis[];
}

export function ExportPanel({ analysis }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    try {
      const csv = exportToCSV(analysis);
      const blob = new Blob(['\ufeff' + csv], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `账期改判分析_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-panel">
      <button
        className="btn btn-export"
        onClick={handleExport}
        disabled={exporting || analysis.length === 0}
      >
        {exporting ? '导出中...' : `导出清单 (${analysis.length}条)`}
      </button>
      <span className="export-hint">CSV格式，含来源行号与改判痕迹</span>
    </div>
  );
}
