import { useState, useEffect, useRef } from 'react';
import { useWaterStore } from '@/store/useWaterStore';
import { Play, Pause, SkipBack, SkipForward, Clock, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Scene from '@/components/sandbox/Scene';
import PipeDetails from '@/components/sandbox/PipeDetails';
import PressureGauge from '@/components/sandbox/PressureGauge';

export default function Playback() {
  const navigate = useNavigate();
  const { dispatchRecords, playbackTime, setPlaybackTime, isPlaying, setIsPlaying } = useWaterStore();
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<number | null>(null);

  const sortedRecords = [...dispatchRecords].sort((a, b) => a.timestamp - b.timestamp);
  const minTime = sortedRecords.length > 0 ? sortedRecords[0].timestamp : Date.now();
  const maxTime = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].timestamp : Date.now();

  useEffect(() => {
    if (isPlaying && sortedRecords.length > 0) {
      intervalRef.current = window.setInterval(() => {
        const current = useWaterStore.getState().playbackTime;
        const next = current + 60000 * playbackSpeed;
        if (next >= maxTime) {
          setPlaybackTime(maxTime);
          setIsPlaying(false);
        } else {
          setPlaybackTime(next);
        }
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, maxTime, setPlaybackTime, setIsPlaying, sortedRecords.length]);

  useEffect(() => {
    const idx = sortedRecords.findIndex(r => r.timestamp >= playbackTime);
    setCurrentRecordIndex(idx >= 0 ? idx : sortedRecords.length - 1);
  }, [playbackTime, sortedRecords]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="h-screen flex bg-slate-950">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/50 rounded-lg px-3 py-2 hover:border-cyan-500/50 transition-colors"
          >
            <ArrowLeft size={14} className="text-cyan-400" />
            <span className="text-slate-300 text-xs">返回沙盘</span>
          </button>
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-lg px-4 py-2 backdrop-blur">
            <span className="text-cyan-400 font-semibold text-sm">历史回放</span>
          </div>
        </div>

        <div className="h-full">
          <Scene />
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-lg px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-cyan-400" />
                <span className="text-slate-300 text-xs font-mono">{formatTime(playbackTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaybackTime(minTime)}
                  className="p-2 rounded hover:bg-slate-800 transition-colors"
                >
                  <SkipBack size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 rounded-full bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 transition-colors"
                >
                  {isPlaying ? <Pause size={16} className="text-cyan-400" /> : <Play size={16} className="text-cyan-400" />}
                </button>
                <button
                  onClick={() => setPlaybackTime(maxTime)}
                  className="p-2 rounded hover:bg-slate-800 transition-colors"
                >
                  <SkipForward size={14} className="text-slate-400" />
                </button>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="ml-2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={5}>5x</option>
                </select>
              </div>
            </div>

            <input
              type="range"
              min={minTime}
              max={maxTime}
              value={playbackTime}
              onChange={(e) => setPlaybackTime(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />

            <div className="relative mt-2 h-6">
              {sortedRecords.map((record, i) => {
                const pos = ((record.timestamp - minTime) / (maxTime - minTime)) * 100;
                const isActive = i === currentRecordIndex;
                return (
                  <div
                    key={record.id}
                    className={`absolute -top-1 w-2 h-2 rounded-full cursor-pointer transition-transform ${
                      isActive ? 'scale-150 bg-cyan-400' : 'bg-slate-500 hover:bg-slate-400'
                    }`}
                    style={{ left: `${pos}%` }}
                    onClick={() => setPlaybackTime(record.timestamp)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="w-96 bg-slate-900/80 border-l border-slate-700/50 flex flex-col">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            <span className="text-sm text-slate-300">调度记录</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedRecords.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-8">暂无调度记录</div>
          )}
          {sortedRecords.map((record, i) => (
            <div
              key={record.id}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                i === currentRecordIndex
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
              }`}
              onClick={() => setPlaybackTime(record.timestamp)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${record.action === 'open' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {record.action === 'open' ? '开启阀门' : '关闭阀门'}
                </span>
                <span className="text-xs text-slate-500">{formatTime(record.timestamp)}</span>
              </div>
              <div className="text-xs text-white mb-1">{record.valveName}</div>
              <div className="text-xs text-slate-400 mb-2">{record.notes}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">操作人: {record.operator}</span>
                <span className="font-mono text-slate-400">
                  {record.beforePressure.toFixed(2)} → {record.afterPressure.toFixed(2)} MPa
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700/50 space-y-4">
          <PipeDetails />
          <PressureGauge />
        </div>
      </div>
    </div>
  );
}
