import { User, Wrench } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ViewMode } from '@/types';

interface ViewSwitcherProps {
  mode: ViewMode;
}

export default function ViewSwitcher({ mode }: ViewSwitcherProps) {
  const setViewMode = useAppStore((s) => s.setViewMode);

  return (
    <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
      <button
        onClick={() => setViewMode('manager')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
          mode === 'manager'
            ? 'bg-cyan-500 text-white shadow'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <User size={14} />
        <span>项目经理</span>
      </button>
      <button
        onClick={() => setViewMode('engineer')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
          mode === 'engineer'
            ? 'bg-emerald-500 text-white shadow'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Wrench size={14} />
        <span>设备工程师</span>
      </button>
    </div>
  );
}
