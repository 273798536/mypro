import { useState, useRef, useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet, ChevronUp } from 'lucide-react';
import type { GradingResult, MirrorSegment, IncidentRay } from '@/utils/types';
import { exportAsJSON, exportAsCSV } from '@/utils/exporter';

interface Props {
  results: GradingResult[];
  mirrors: MirrorSegment[];
  rays: IncidentRay[];
}

export default function ExportButton({ results, mirrors, rays }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#f0c040] text-[#1a1a2e] hover:bg-[#f0c040]/90 transition-colors"
      >
        <Download className="w-4 h-4" />
        导出报告
        <ChevronUp className={`w-3 h-3 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[#2d2d44] bg-[#13132a] shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => { exportAsJSON(results, mirrors, rays); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-[#2d2d44] transition-colors"
          >
            <FileJson className="w-4 h-4 text-[#f0c040]" />
            导出 JSON
          </button>
          <button
            onClick={() => { exportAsCSV(results); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-[#2d2d44] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            导出 CSV
          </button>
        </div>
      )}
    </div>
  );
}
