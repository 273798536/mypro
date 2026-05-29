import { Download } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';

export default function ExportButton() {
  const { exportData, analysisResult } = useNetworkStore();

  return (
    <button
      onClick={exportData}
      disabled={!analysisResult}
      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      导出CSV
    </button>
  );
}
