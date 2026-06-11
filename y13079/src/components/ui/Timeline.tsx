import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';

export function Timeline() {
  const { phases, currentPhaseId, setCurrentPhaseId } = useStore();
  const curIdx = phases.findIndex((p) => p.id === currentPhaseId);

  return (
    <div className="dc-panel border-b border-dc-border px-4 py-2.5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Calendar size={14} className="text-dc-cold" />
          <span className="font-display text-sm font-semibold text-dc-text tracking-wide">方案时间轴</span>
        </div>

        <div className="flex-1 relative flex items-center justify-center gap-1">
          <button
            onClick={() => curIdx > 0 && setCurrentPhaseId(phases[curIdx - 1].id)}
            disabled={curIdx === 0}
            className="dc-btn disabled:opacity-30 disabled:cursor-not-allowed !px-2 !py-1"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex-1 flex items-center gap-0.5 px-2">
            {phases.map((phase, idx) => {
              const isActive = phase.id === currentPhaseId;
              const isPast = idx < curIdx;
              return (
                <div key={phase.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => setCurrentPhaseId(phase.id)}
                    className={clsx(
                      'group flex items-center gap-2 transition-all',
                      isActive ? '' : 'opacity-70 hover:opacity-100'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                        isActive
                          ? 'border-dc-cold bg-dc-cold/20 animate-pulse-slow'
                          : isPast
                          ? 'border-dc-ok bg-dc-ok/20'
                          : 'border-dc-text-mute bg-dc-bg'
                      )}
                    >
                      {isPast && <div className="w-1.5 h-1.5 rounded-full bg-dc-ok" />}
                      {isActive && <div className="w-2 h-2 rounded-full bg-dc-cold" />}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div
                        className={clsx(
                          'text-[11px] font-display font-semibold tracking-wide',
                          isActive ? 'text-dc-cold' : 'text-dc-text-dim'
                        )}
                      >
                        {phase.name}
                      </div>
                      <div className="text-[9px] font-mono text-dc-text-mute">{phase.date}</div>
                    </div>
                  </button>
                  {idx < phases.length - 1 && (
                    <div
                      className={clsx(
                        'flex-1 h-px mx-1',
                        idx < curIdx ? 'bg-dc-ok/50' : 'bg-dc-border'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => curIdx < phases.length - 1 && setCurrentPhaseId(phases[curIdx + 1].id)}
            disabled={curIdx === phases.length - 1}
            className="dc-btn disabled:opacity-30 disabled:cursor-not-allowed !px-2 !py-1"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="hidden md:flex flex-shrink-0 items-center gap-2 max-w-xs">
          <div className="text-[10px] font-mono text-dc-text-mute max-w-[180px] truncate">
            {phases[curIdx]?.description}
          </div>
        </div>
      </div>
    </div>
  );
}
