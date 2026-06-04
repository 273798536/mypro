import { User, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ScoreHistory } from '../../shared/types';
import { formatDate } from '../utils/format';

interface ScoreTimelineProps {
  history: ScoreHistory[];
}

export function ScoreTimeline({ history }: ScoreTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
        <p>暂无评分历史</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      <div className="timeline-line" />

      <div className="space-y-6">
        {history.map((item, index) => {
          const trend = item.previousScore !== undefined
            ? item.score > item.previousScore ? 'up'
            : item.score < item.previousScore ? 'down' : 'same'
            : null;

          return (
            <div key={item.id} className="relative animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`timeline-dot ${index === 0 ? 'timeline-dot-active' : ''}`} />

              <div className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-lg font-bold ${
                      item.score >= 80 ? 'text-emerald-600' :
                      item.score >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {item.score}分
                    </span>
                    {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                    {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    {trend === 'same' && <Minus className="w-4 h-4 text-slate-400" />}
                    {item.previousScore !== undefined && (
                      <span className="text-xs text-slate-400">
                        {item.previousScore} → {item.score}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.scoreTime)}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{item.scorer}</span>
                </div>

                {item.scoreNote && (
                  <p className="text-sm text-slate-600 mb-2">
                    <span className="font-medium">评分说明：</span>{item.scoreNote}
                  </p>
                )}

                <div className="p-3 bg-industrial-50 rounded border-l-2 border-industrial-400">
                  <p className="text-sm">
                    <span className="font-medium text-industrial-700">修正原因：</span>
                    <span className="text-slate-700">{item.reason}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
