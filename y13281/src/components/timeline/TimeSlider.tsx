import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function TimeSlider() {
  const { timePeriod, setTimePeriod } = useAppStore();

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-xl border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-300 text-sm font-medium">时段切换</span>
        <span
          className={`
            px-3 py-1 rounded-full text-xs font-bold
            ${timePeriod === 'morning' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}
          `}
        >
          {timePeriod === 'morning' ? '早高峰 (7:00-9:00)' : '晚高峰 (18:00-20:00)'}
        </span>
      </div>

      <div className="relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTimePeriod('morning')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
              ${timePeriod === 'morning'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }
            `}
          >
            <Sun className="w-4 h-4" />
            <span className="text-sm font-medium">早高峰</span>
          </button>

          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden relative">
            <div
              className={`
                absolute top-0 left-0 h-full transition-all duration-500 ease-out
                ${timePeriod === 'morning'
                  ? 'w-1/2 bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'w-1/2 ml-auto bg-gradient-to-r from-indigo-500 to-purple-500'
                }
              `}
            />
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-lg transition-all duration-500 ease-out border-2 border-white
                ${timePeriod === 'morning'
                  ? 'left-[calc(50%-10px)] bg-amber-500'
                  : 'left-[calc(100%-10px)] bg-indigo-500'
                }
              `}
            />
          </div>

          <button
            onClick={() => setTimePeriod('evening')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
              ${timePeriod === 'evening'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 scale-105'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }
            `}
          >
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">晚高峰</span>
          </button>
        </div>
      </div>
    </div>
  );
}
