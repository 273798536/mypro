import { Users, Dumbbell, Coffee, CheckCircle, XCircle } from 'lucide-react';
import { Playground } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { formatDuration, getSunlightPercentage } from '../../utils/sunlightStats';

const typeIcons = {
  children: Users,
  fitness: Dumbbell,
  rest: Coffee
};

const typeLabels = {
  children: '儿童活动',
  fitness: '健身区',
  rest: '休憩区'
};

export function PlaygroundList() {
  const {
    playgrounds,
    selectedPlaygroundId,
    setSelectedPlayground,
    sunlightStats
  } = useAppStore();

  return (
    <div className="space-y-2">
      {playgrounds.map((playground) => {
        const stats = sunlightStats.find(s => s.playgroundId === playground.id);
        const Icon = typeIcons[playground.type];
        const isSelected = selectedPlaygroundId === playground.id;
        const percentage = stats ? getSunlightPercentage(stats.totalMinutes, playground.requiredSunlight) : 0;

        return (
          <div
            key={playground.id}
            onClick={() => setSelectedPlayground(isSelected ? null : playground.id)}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              isSelected
                ? 'bg-blue-600/30 border border-blue-500'
                : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: playground.color + '30' }}
              >
                <Icon size={18} style={{ color: playground.color }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">
                    {playground.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {typeLabels[playground.type]}
                  </span>
                </div>
                
                {stats ? (
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {formatDuration(stats.totalMinutes)} / {formatDuration(playground.requiredSunlight)}
                      </span>
                      <div className="flex items-center gap-1">
                        {stats.is达标 ? (
                          <CheckCircle size={14} className="text-green-400" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                        <span className={stats.is达标 ? 'text-green-400' : 'text-red-400'}>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, percentage)}%`,
                          backgroundColor: stats.is达标 ? '#22c55e' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-1">
                    计算中...
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
