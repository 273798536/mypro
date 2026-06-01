import { useState } from 'react';
import { Play, ChevronDown, Users, Briefcase, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AlgorithmMode } from '@/types';

const ALGORITHM_OPTIONS: { value: AlgorithmMode; label: string }[] = [
  { value: 'max_flow', label: '最大流' },
  { value: 'min_cost_max_flow', label: '最小费用最大流' },
];

export function AssignConsole() {
  const algorithmMode = useStore((s) => s.algorithmMode);
  const setAlgorithmMode = useStore((s) => s.setAlgorithmMode);
  const runAssignmentAlgorithm = useStore((s) => s.runAssignmentAlgorithm);
  const currentResult = useStore((s) => s.currentResult);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentLabel = ALGORITHM_OPTIONS.find((o) => o.value === algorithmMode)?.label ?? '';

  return (
    <div className="flex items-center justify-between bg-surface-800 px-6 py-3 border-b border-surface-700">
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg bg-surface-700 px-4 py-2 text-sm text-gray-200 hover:bg-surface-600 transition-colors"
          >
            <span>{currentLabel}</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg bg-surface-700 border border-surface-600 shadow-lg overflow-hidden">
              {ALGORITHM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setAlgorithmMode(opt.value);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    algorithmMode === opt.value
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-gray-300 hover:bg-surface-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={runAssignmentAlgorithm}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Play className="h-4 w-4" />
          运行分配
        </button>
      </div>

      <div className="flex items-center gap-6">
        {currentResult ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-brand-400" />
              <span className="text-gray-400">已分配志愿者</span>
              <span className="font-mono text-gray-100">{currentResult.stats.assignedVolunteers}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-brand-400" />
              <span className="text-gray-400">已填充班次</span>
              <span className="font-mono text-gray-100">{currentResult.stats.filledShifts}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warn" />
              <span className="text-gray-400">异常数</span>
              <span className="font-mono text-warn">{currentResult.stats.anomalyCount}</span>
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-500">请选择算法并运行分配</span>
        )}
      </div>
    </div>
  );
}
