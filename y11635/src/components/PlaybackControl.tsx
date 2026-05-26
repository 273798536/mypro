import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { RoundLog } from '../types/game';

interface PlaybackControlProps {
  logs: RoundLog[];
}

export function PlaybackControl({ logs }: PlaybackControlProps) {
  const { replayRound, setReplayRound } = useGameStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);

  useEffect(() => {
    setCurrentRound(replayRound);
  }, [replayRound]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentRound((prev) => {
        if (prev >= logs.length) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        setReplayRound(next);
        return next;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isPlaying, logs.length, setReplayRound]);

  const handlePlay = () => {
    if (currentRound >= logs.length) {
      setCurrentRound(0);
      setReplayRound(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handlePrev = () => {
    const prev = Math.max(0, currentRound - 1);
    setCurrentRound(prev);
    setReplayRound(prev);
    setIsPlaying(false);
  };

  const handleNext = () => {
    const next = Math.min(logs.length, currentRound + 1);
    setCurrentRound(next);
    setReplayRound(next);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentRound(0);
    setReplayRound(0);
    setIsPlaying(false);
  };

  const currentLog = logs[currentRound];

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-slate-100 mb-4">回合回放</h3>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">当前回合</span>
          <span className="text-lg font-mono font-bold text-blue-400">
            {currentRound} / {logs.length}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={logs.length}
          value={currentRound}
          onChange={(e) => {
            const val = Number(e.target.value);
            setCurrentRound(val);
            setReplayRound(val);
            setIsPlaying(false);
          }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            bg-slate-600
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-500
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={handlePrev}
          disabled={currentRound <= 0}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        {isPlaying ? (
          <button
            onClick={handlePause}
            className="p-3 rounded-full bg-orange-500 hover:bg-orange-400 text-white transition-colors"
          >
            <Pause className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="p-3 rounded-full bg-green-500 hover:bg-green-400 text-white transition-colors"
          >
            <Play className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={currentRound >= logs.length}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {currentLog && (
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">
              回合 {currentLog.round} - {currentLog.weather.name}
            </span>
            <span className={`text-sm font-mono ${
              currentLog.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {currentLog.scoreChange >= 0 ? '+' : ''}{currentLog.scoreChange}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>来水: <span className="text-cyan-400 font-mono">{currentLog.upstreamInflow}</span></div>
            <div>开闸: <span className="text-blue-400 font-mono">{currentLog.gateOpening}%</span></div>
            <div>水位: <span className="text-slate-300 font-mono">{currentLog.reservoirLevel.toFixed(1)}</span></div>
            <div>预警: <span className={currentLog.warningIssued ? 'text-orange-400' : 'text-slate-500'}>
              {currentLog.warningIssued ? '已发布' : '未发布'}
            </span></div>
          </div>
          {currentLog.events.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-600">
              <ul className="space-y-1">
                {currentLog.events.map((event, i) => (
                  <li key={i} className="text-xs text-slate-400">• {event}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
