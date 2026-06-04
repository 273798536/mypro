import React, { useState, useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { FilterPanel } from '@/components/FilterPanel';
import { Canvas } from '@/components/Canvas';
import { SidePanel } from '@/components/SidePanel';
import { ReportModal } from '@/components/ReportModal';
import { AddRecordModal } from '@/components/AddRecordModal';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ExportReport } from '@/types';

function App() {
  const [showFilter, setShowFilter] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [report, setReport] = useState<ExportReport | null>(null);
  
  const { generateReport, undo, redo } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleExport = () => {
    const generatedReport = generateReport();
    setReport(generatedReport);
    setShowReport(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <header className="h-12 bg-gradient-to-r from-fire-dark to-slate-800 border-b border-slate-700 flex items-center px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-fire-red/20 flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm">消防疏散箭头校验</h1>
            <p className="text-xs text-slate-400">Fire Evacuation Arrow Validator</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-slate-500">V1.0 · 第一版试用</span>
        </div>
      </header>

      <Toolbar
        onToggleFilter={() => setShowFilter(!showFilter)}
        onExport={handleExport}
        onAddRecord={() => setShowAddRecord(true)}
        showFilter={showFilter}
      />

      <div className="flex-1 flex overflow-hidden">
        {showFilter && (
          <FilterPanel onClose={() => setShowFilter(false)} />
        )}
        <Canvas />
        <SidePanel />
      </div>

      {showReport && report && (
        <ReportModal report={report} onClose={() => setShowReport(false)} />
      )}

      {showAddRecord && (
        <AddRecordModal onClose={() => setShowAddRecord(false)} />
      )}
    </div>
  );
}

export default App;
