import { Camera, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { exportScreenshot } from '@/utils/screenshot';

export default function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportScreenshot('funnel-root-container', `loan-funnel-3d-${Date.now()}.png`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F0B429] to-[#FF8F00] text-[#0A1628] font-semibold text-sm shadow-lg shadow-[#F0B429]/20 hover:shadow-[#F0B429]/30 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Camera size={16} />
      )}
      {loading ? '导出中...' : '导出截图'}
    </button>
  );
}
