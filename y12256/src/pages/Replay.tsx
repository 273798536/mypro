import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, AlertTriangle, Zap, Gauge, Timer, FileText, ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { EventType, TimedEvent } from '@/types';

const EVENT_META: Record<EventType, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  conflict: { label: '冲突', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40', icon: AlertTriangle },
  switch_delay: { label: '切换延迟', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40', icon: GitBranch },
  syncopation_miss: { label: '切分丢失', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40', icon: Zap },
  speed_change: { label: '变速', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40', icon: Gauge },
  combo_misjudge: { label: '连击误判', color: 'text-pink-400', bg: 'bg-pink-500/20 border-pink-500/40', icon: Timer },
};

function MiniTrackViz({ playheadTime, duration }: { playheadTime: number; duration: number }) {
  const { judgments } = useGameStore();
  if (duration <= 0) return <div className="h-10 bg-[#252840] rounded" />;
  return (
    <div className="relative h-10 bg-[#252840] rounded overflow-hidden">
      {judgments.map((j) => {
        const left = (j.judgmentTime / duration) * 100;
        const colors: Record<string, string> = { perfect: '#f0a830', great: '#2ed573', good: '#3dc1d3', miss: '#e74c3c' };
        return (
          <div
            key={j.id}
            className="absolute top-1 w-1 h-8 rounded-sm"
            style={{ left: `${left}%`, backgroundColor: colors[j.result] }}
          />
        );
      })}
      <div
        className="absolute top-0 h-full w-0.5 bg-white/70"
        style={{ left: `${(playheadTime / duration) * 100}%` }}
      />
    </div>
  );
}

function EventBubble({ event, onJumpJudgment }: { event: TimedEvent; onJumpJudgment: (id: string) => void }) {
  const meta = EVENT_META[event.type] || EVENT_META.conflict;
  const Icon = meta.icon;
  return (
    <div className={`relative flex gap-3 mb-4`}>
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${meta.bg}`}>
          <Icon size={14} className={meta.color} />
        </div>
        <div className="w-px flex-1 bg-gray-600" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
          <span className="text-gray-500 text-xs">{(event.timestamp / 1000).toFixed(2)}s</span>
        </div>
        <div className="text-gray-300 text-sm">{event.description}</div>
        {event.relatedJudgmentId && (
          <button
            onClick={() => onJumpJudgment(event.relatedJudgmentId!)}
            className="text-cyan-400 text-xs mt-1 hover:underline"
          >
            判定 #{event.relatedJudgmentId.slice(0, 8)}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Replay() {
  const navigate = useNavigate();
  const { events, judgments } = useGameStore();
  const [playheadTime, setPlayheadTime] = useState(0);

  const duration = useMemo(() => {
    if (judgments.length === 0) return 0;
    return Math.max(...judgments.map((j) => j.judgmentTime), 1);
  }, [judgments]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.timestamp - b.timestamp || a.order - b.order),
    [events]
  );

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const handleJumpJudgment = (id: string) => {
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1a1d2e] text-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl text-center mb-8 text-cyan-400 tracking-wider">复盘</h1>

      <section className="mb-10">
        <h2 className="font-display text-lg text-white/80 mb-4">时间轴</h2>
        <MiniTrackViz playheadTime={playheadTime} duration={duration} />
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={1}
          value={playheadTime}
          onChange={(e) => setPlayheadTime(Number(e.target.value))}
          className="w-full mt-2 accent-cyan-400 h-2 bg-gray-700 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.00s</span>
          <span className="font-display text-cyan-400">{(playheadTime / 1000).toFixed(2)}s</span>
          <span>{(duration / 1000).toFixed(2)}s</span>
        </div>

        <div className="mt-4 bg-[#252840] rounded-lg p-3 max-h-40 overflow-y-auto">
          <div className="text-gray-400 text-xs mb-2">此时段判定</div>
          {judgments
            .filter((j) => Math.abs(j.judgmentTime - playheadTime) < 500)
            .map((j) => (
              <div
                key={j.id}
                className={`text-sm py-1 px-2 rounded mb-1 transition-colors ${highlightedId === j.id ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-300'}`}
              >
                <span className="font-display text-xs text-gray-500">#{j.id.slice(0, 8)}</span>{' '}
                <span className={
                  j.result === 'perfect' ? 'text-amber-400' :
                  j.result === 'great' ? 'text-green-400' :
                  j.result === 'good' ? 'text-cyan-400' : 'text-red-400'
                }>{j.result.toUpperCase()}</span>
              </div>
            ))}
          {judgments.filter((j) => Math.abs(j.judgmentTime - playheadTime) < 500).length === 0 && (
            <div className="text-gray-600 text-xs">无判定记录</div>
          )}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-lg text-white/80 mb-4">事件序列</h2>
        {sortedEvents.length === 0 ? (
          <div className="text-gray-500 text-sm">无事件记录</div>
        ) : (
          sortedEvents.map((e) => (
            <EventBubble key={e.id} event={e} onJumpJudgment={handleJumpJudgment} />
          ))
        )}
      </section>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => navigate('/report')}
          className="flex items-center gap-2 px-6 py-3 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors font-display text-sm"
        >
          <FileText size={16} /> 练习报告
        </button>
        <button
          onClick={() => navigate('/settlement')}
          className="flex items-center gap-2 px-6 py-3 bg-gray-500/20 border border-gray-500/40 rounded-lg text-gray-300 hover:bg-gray-500/30 transition-colors font-display text-sm"
        >
          <ArrowLeft size={16} /> 返回结算
        </button>
      </div>
    </div>
  );
}
