import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { windConditions, TIMESTAMP_LABELS, maintenancePlans, BASE_TIMESTAMP } from '../../data/mockData';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export default function Timeline() {
  const currentTimestampIndex = useStore((s) => s.currentTimestampIndex);
  const isPlaying = useStore((s) => s.isPlaying);
  const setCurrentTimestampIndex = useStore((s) => s.setCurrentTimestampIndex);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const next = useStore.getState().currentTimestampIndex + 1;
        if (next >= windConditions.length) {
          setIsPlaying(false);
          return;
        }
        setCurrentTimestampIndex(next);
      }, 1500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, setCurrentTimestampIndex, setIsPlaying]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentTimestampIndex(Number(e.target.value));
    },
    [setCurrentTimestampIndex]
  );

  const currentWind = windConditions[currentTimestampIndex];

  const maintenanceWindows = maintenancePlans.map((p) => ({
    startIdx: Math.round((p.startTime - BASE_TIMESTAMP) / 3600000),
    endIdx: Math.round((p.endTime - BASE_TIMESTAMP) / 3600000),
    turbineId: p.turbineId,
    type: p.taskType,
  }));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#0A1628]/95 backdrop-blur-xl border-t border-[#1E3A5F]/60">
      <div className="px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentTimestampIndex(0)}
              className="p-1.5 rounded-lg text-[#4A6B8A] hover:text-[#00D4AA] hover:bg-[#1E3A5F]/50 transition-all"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-[#00D4AA]/20 text-[#00D4AA] hover:bg-[#00D4AA]/30 transition-all"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => setCurrentTimestampIndex(windConditions.length - 1)}
              className="p-1.5 rounded-lg text-[#4A6B8A] hover:text-[#00D4AA] hover:bg-[#1E3A5F]/50 transition-all"
            >
              <SkipForward size={14} />
            </button>
          </div>

          <div className="flex-1">
            <div className="relative h-8">
              <input
                type="range"
                min={0}
                max={windConditions.length - 1}
                step={1}
                value={currentTimestampIndex}
                onChange={handleSliderChange}
                className="absolute inset-0 w-full h-8 appearance-none bg-transparent cursor-pointer z-10"
                style={{ accentColor: '#00D4AA' }}
              />

              <div className="absolute inset-x-0 top-3 h-2 bg-[#1E3A5F]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00D4AA] to-[#00A88A] rounded-full transition-all duration-200"
                  style={{ width: `${((currentTimestampIndex + 1) / windConditions.length) * 100}%` }}
                />

                {maintenanceWindows.map((mw, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full rounded-sm opacity-60"
                    style={{
                      left: `${(mw.startIdx / windConditions.length) * 100}%`,
                      width: `${((mw.endIdx - mw.startIdx) / windConditions.length) * 100}%`,
                      background: mw.startIdx <= currentTimestampIndex && mw.endIdx >= currentTimestampIndex
                        ? '#FF6B35'
                        : '#34D399',
                    }}
                    title={`${mw.turbineId} - ${mw.type}`}
                  />
                ))}
              </div>

              <div className="absolute inset-x-0 top-0 flex justify-between px-0.5">
                {TIMESTAMP_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className={`text-[8px] font-mono ${
                      i === currentTimestampIndex ? 'text-[#00D4AA]' : 'text-[#4A6B8A]'
                    }`}
                  >
                    {i % 3 === 0 ? label : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono min-w-[200px] justify-end">
            <div>
              <span className="text-[#4A6B8A]">时间</span>
              <span className="ml-1 text-[#E8ECF1]">{TIMESTAMP_LABELS[currentTimestampIndex]}</span>
            </div>
            <div>
              <span className="text-[#4A6B8A]">风速</span>
              <span className="ml-1 text-[#00D4AA]">{currentWind?.speed ?? '-'} m/s</span>
            </div>
            <div>
              <span className="text-[#4A6B8A]">风向</span>
              <span className="ml-1 text-[#00D4AA]">{currentWind?.direction ?? '-'}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
