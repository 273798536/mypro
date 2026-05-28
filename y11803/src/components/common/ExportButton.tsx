import { Download } from 'lucide-react';
import { exportToCSV } from '@/utils/exportUtils';

interface ExportButtonProps {
  data: any[];
  filename: string;
  fieldMapping: Record<string, string>;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename,
  fieldMapping,
  label = '导出 CSV',
  disabled = false,
}: ExportButtonProps) {
  const handleExport = () => {
    if (disabled || data.length === 0) return;
    exportToCSV(data, filename, fieldMapping);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border-2 border-amber-200 rounded hover:bg-amber-100 hover:border-amber-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download size={16} />
      <span className="font-mono">{label}</span>
      <span className="text-xs text-amber-500">({data.length})</span>
    </button>
  );
}
