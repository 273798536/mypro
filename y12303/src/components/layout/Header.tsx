import { Bell, RefreshCw, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function Header() {
  const totalCracks = useAppStore((state) => state.cracks.length);
  const duplicateCount = useAppStore((state) => state.cracks.filter((c) => c.isDuplicate).length);
  const runDuplicateDetection = useAppStore((state) => state.runDuplicateDetection);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            监测点: <span className="text-white font-medium">{totalCracks}</span> 个
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-sm text-slate-400">
            重复记录:{' '}
            <span className={`font-medium ${duplicateCount > 0 ? 'text-status-duplicate' : 'text-status-normal'}`}>
              {duplicateCount}
            </span>{' '}
            条
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={runDuplicateDetection}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-md border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          重复检测
        </button>

        <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors">
          <Bell className="w-5 h-5" />
          {duplicateCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-status-duplicate rounded-full" />
          )}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-slate-300">地质工程师</span>
        </div>
      </div>
    </header>
  );
}
