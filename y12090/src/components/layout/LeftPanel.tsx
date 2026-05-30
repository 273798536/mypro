import React from 'react';
import { OcclusionFilter } from '../filter/OcclusionFilter';
import { SeatFilter } from '../filter/SeatFilter';
import { useFilterStore } from '../../store/useFilterStore';
import { RotateCcw } from 'lucide-react';

interface LeftPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ isCollapsed, onToggle }) => {
  const resetFilters = useFilterStore((state) => state.resetFilters);

  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        className="h-full w-8 bg-slate-800 border-r border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
      >
        <span className="text-slate-400 text-xs rotate-180 writing-mode-vertical">
          筛选
        </span>
      </button>
    );
  }

  return (
    <div className="w-72 bg-slate-800/95 border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">筛选面板</h2>
        <button
          onClick={resetFilters}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="重置筛选"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <OcclusionFilter />
        <SeatFilter />
      </div>

      <button
        onClick={onToggle}
        className="absolute left-72 top-1/2 -translate-y-1/2 z-10 bg-slate-700 hover:bg-slate-600 text-slate-300 p-1 rounded-r transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
};
