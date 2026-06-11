import { Clock, AlertTriangle, RotateCcw, CheckCircle2, GitBranch } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';

export default function Timeline() {
  const versions = useAppStore((s) => s.versions);
  const activeId = useAppStore((s) => s.viewState.activeVersionId);
  const switchVer = useAppStore((s) => s.switchVersion);
  const anomalies = useAppStore((s) => s.anomalies);
  const activeVerAnomCount = anomalies.filter(a => a.versionId === activeId).length;

  return (
    <div className="h-24 border-t border-slate-800/70 bg-[#0A1729]/95 backdrop-blur-sm px-6 py-3 flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch size={13} className="text-brass-400" />
          <span className="text-[11.5px] text-slate-200 font-medium">方案迭代时间轴</span>
          {activeVerAnomCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/60 flex items-center gap-1">
              <AlertTriangle size={10} />
              当前版本含 {activeVerAnomCount} 条异常
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-500" />
            生效中
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={11} className="text-gray-500" />
            已撤回
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={11} className="text-amber-500" />
            存在异常
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center relative">
        <div className="absolute left-0 right-0 h-1 top-1/2 -translate-y-1/2 bg-gradient-to-r from-brass-900/60 via-slate-700/60 to-brass-900/60 rounded-full" />

        <div className="relative flex-1 flex items-center justify-around">
          {versions.map((v, idx) => {
            const isActive = v.id === activeId;
            const verAnoms = anomalies.filter(a => a.versionId === v.id).length;
            const hasAnom = verAnoms > 0;

            return (
              <button
                key={v.id}
                onClick={() => switchVer(v.id)}
                className="relative group flex flex-col items-center"
              >
                <div
                  className={cn(
                    'relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300',
                    isActive
                      ? v.isWithdrawn
                        ? 'bg-gray-600 border-gray-400 shadow-[0_0_20px_rgba(107,114,128,0.4)] scale-110'
                        : 'bg-gradient-to-br from-brass-500 to-brass-700 border-brass-300 shadow-[0_0_25px_rgba(201,169,98,0.45)] scale-110'
                      : v.isWithdrawn
                        ? 'bg-slate-800 border-slate-600 hover:border-slate-500 hover:bg-slate-750 group-hover:scale-105'
                        : 'bg-slate-800 border-slate-600 hover:border-brass-600/70 hover:bg-slate-750 group-hover:scale-105',
                  )}
                >
                  <span className={cn(
                    'font-bold text-[15px]',
                    isActive && !v.isWithdrawn ? 'text-[#0A1628]' : 'text-slate-300',
                    v.isWithdrawn && 'line-through opacity-70',
                  )}>
                    V{v.versionNo}
                  </span>

                  {hasAnom && !v.isWithdrawn && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center border-2 border-[#0A1729] animate-pulse">
                      {verAnoms}
                    </span>
                  )}
                  {v.isWithdrawn && (
                    <RotateCcw
                      size={10}
                      className={cn(
                        'absolute -bottom-1 -right-1 rounded-full p-0.5',
                        isActive ? 'bg-gray-400 text-gray-700' : 'bg-gray-600 text-gray-300',
                      )}
                    />
                  )}
                  {v.isActive && !v.isWithdrawn && (
                    <CheckCircle2
                      size={11}
                      className="absolute -bottom-1.5 -right-1.5 text-emerald-400"
                      strokeWidth={2.5}
                    />
                  )}
                </div>

                <div className={cn(
                  'absolute -bottom-16 w-52 left-1/2 -translate-x-1/2 text-center pointer-events-none transition-all',
                  isActive && 'opacity-100',
                  !isActive && 'opacity-0 group-hover:opacity-100',
                )}>
                  <div className={cn(
                    'rounded-lg px-2.5 py-1.5 border backdrop-blur-sm',
                    isActive
                      ? 'bg-brass-900/40 border-brass-700/50'
                      : 'bg-slate-800/90 border-slate-700/60',
                  )}>
                    <p className={cn(
                      'text-[11px] font-medium whitespace-nowrap',
                      isActive ? 'text-brass-200' : 'text-slate-200',
                      v.isWithdrawn && 'line-through text-gray-400',
                    )}>
                      {v.label}
                    </p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5 flex items-center justify-center gap-1 whitespace-nowrap">
                      <Clock size={9} />
                      {dayjs(v.timestamp).format('YYYY-MM-DD HH:mm')}
                    </p>
                    <p className="text-[9.5px] text-slate-500 mt-0.5 line-clamp-1">
                      {v.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
