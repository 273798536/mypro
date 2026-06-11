import {
  PlayCircle,
  RotateCcw,
  HelpCircle,
  Download,
  Camera,
  ChevronDown,
  Beaker,
} from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ViewSnapshotMenu from '@/components/ViewSnapshotMenu';
import { MOCK_POINTS } from '@/data/mockPoints';
import { pointsToCsv, downloadCsv } from '@/utils/csv';
import type { MonitoringPoint } from '@/types';

export default function TopBar() {
  const resetAll = useAppStore((s) => s.resetAll);
  const setShowHelp = useAppStore((s) => s.setShowHelp);
  const notes = useAppStore((s) => s.notes);
  const filterState = useAppStore((s) => s.filterState);
  const [snapOpen, setSnapOpen] = useState(false);

  function handleLoadSample() {
    resetAll();
  }

  function handleRerun() {
    resetAll();
  }

  function handleExportCsv() {
    const filtered = MOCK_POINTS.filter((p: MonitoringPoint) => {
      if (filterState.codes.length > 0 && !filterState.codes.includes(p.code)) return false;
      if (p.depth < filterState.minDepth || p.depth > filterState.maxDepth) return false;
      if (filterState.flags.length > 0) {
        const hit = filterState.flags.some((f) => p.flags.includes(f));
        if (!hit) return false;
      }
      return true;
    });
    const csv = pointsToCsv(filtered, notes);
    downloadCsv(`地下水监测井剖面_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <header className="h-14 shrink-0 bg-white border-b border-brand-100 flex items-center px-4 gap-3 shadow-sm z-20">
      <div className="flex items-center gap-2 mr-4">
        <Beaker className="w-5 h-5 text-brand-600" />
        <h1 className="font-serif text-lg font-semibold text-brand-800 tracking-wide">
          地下水监测井剖面讲解
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={handleLoadSample}>
          <PlayCircle className="w-4 h-4" />
          放样例
        </button>
        <button className="btn-secondary" onClick={handleRerun}>
          <RotateCcw className="w-4 h-4" />
          重跑
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 relative">
        <button
          className="btn-secondary"
          onClick={() => setSnapOpen((v) => !v)}
          aria-haspopup="menu"
        >
          <Camera className="w-4 h-4" />
          视图快照
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {snapOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setSnapOpen(false)}
            />
            <ViewSnapshotMenu onClose={() => setSnapOpen(false)} />
          </>
        )}
        <button className="btn-secondary" onClick={handleExportCsv}>
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
        <button className="btn-ghost" onClick={() => setShowHelp(true)}>
          <HelpCircle className="w-4 h-4" />
          说明
        </button>
      </div>
    </header>
  );
}
