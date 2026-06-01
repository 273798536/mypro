import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Camera, FileDown } from 'lucide-react';
import { useStore, useActiveMaterial, useActiveResult } from '@/store/useStore';
import { generateReportText } from '@/utils/integration';

interface ExportBarProps {
  exportAreaRef: React.RefObject<HTMLDivElement | null>;
}

export default function ExportBar({ exportAreaRef }: ExportBarProps) {
  const activeMaterial = useActiveMaterial();
  const activeResult = useActiveResult();
  const selectedMethod = useStore((s) => s.selectedMethod);

  const handleScreenshot = useCallback(async () => {
    if (!exportAreaRef.current) return;

    try {
      const canvas = await html2canvas(exportAreaRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      const expr = activeMaterial?.expression ?? 'result';
      link.download = `integral_${expr}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  }, [exportAreaRef, activeMaterial]);

  const handleReport = useCallback(() => {
    if (!activeMaterial || !activeResult) return;

    const text = generateReportText(
      activeMaterial.expression,
      activeMaterial.intervalA,
      activeMaterial.intervalB,
      activeMaterial.stepSize,
      selectedMethod,
      activeResult.result,
      activeResult.errorEstimate,
      activeResult.warnings,
      activeMaterial.notes
    );

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `report_${activeMaterial.expression}_${Date.now()}.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [activeMaterial, activeResult, selectedMethod]);

  const disabled = !activeMaterial || !activeResult;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleScreenshot}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
      >
        <Camera size={16} />
        截图导出
      </button>
      <button
        onClick={handleReport}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
      >
        <FileDown size={16} />
        报告导出
      </button>
    </div>
  );
}
