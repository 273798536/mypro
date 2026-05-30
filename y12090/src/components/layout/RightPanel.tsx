import React from 'react';
import { RecordTable } from '../detail/RecordTable';
import { BadRowsList } from '../detail/BadRowsList';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';

interface RightPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ isCollapsed, onToggle }) => {
  const seats = useDataStore((state) => state.seats);
  const badRows = useDataStore((state) => state.badRows);
  const occlusionResults = useDataStore((state) => state.occlusionResults);
  const showBadRows = useFilterStore((state) => state.showBadRows);

  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        className="h-full w-8 bg-slate-800 border-l border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
      >
        <span className="text-slate-400 text-xs writing-mode-vertical">
          明细
        </span>
      </button>
    );
  }

  return (
    <div className="w-80 bg-slate-800/95 border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">明细面板</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showBadRows}
              onChange={(e) =>
                useFilterStore.getState().setShowBadRows(e.target.checked)
              }
              className="rounded border-slate-600 bg-slate-700 focus:ring-cyan-500"
            />
            <span className="text-xs text-slate-400">显示坏行</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <RecordTable results={occlusionResults} seats={seats} />
        {showBadRows && <BadRowsList badRows={badRows} />}
      </div>

      <button
        onClick={onToggle}
        className="absolute right-80 top-1/2 -translate-y-1/2 z-10 bg-slate-700 hover:bg-slate-600 text-slate-300 p-1 rounded-l transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};
