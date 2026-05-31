import React from 'react';
import { Play, ChevronRight, Calendar } from 'lucide-react';
import { useGameStore, useCurrentLevel } from '../store/gameStore';

const Timeline: React.FC = () => {
  const level = useCurrentLevel();
  const currentDateIndex = useGameStore(state => state.currentDateIndex);
  const advanceTimeline = useGameStore(state => state.advanceTimeline);
  const activeEvent = useGameStore(state => state.activeEvent);
  const isGameOver = useGameStore(state => state.isGameOver);

  if (!level) return null;

  const handleAdvance = () => {
    if (!activeEvent && !isGameOver) {
      advanceTimeline();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-800">时间轴</h3>
        </div>
        <div className="text-sm text-gray-500">
          进度：{currentDateIndex + 1} / {level.timelineDates.length}
        </div>
      </div>

      <div className="relative mb-6">
        <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded-full" />
        <div
          className="absolute top-4 left-0 h-1 bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentDateIndex + 1) / level.timelineDates.length) * 100}%` }}
        />

        <div className="relative flex justify-between">
          {level.timelineDates.map((date, index) => {
            const isActive = index === currentDateIndex;
            const isPast = index < currentDateIndex;
            const hasEvent = level.events.some(e => e.date === date);

            return (
              <div key={date} className="flex flex-col items-center">
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-amber-500 ring-4 ring-amber-200 scale-110'
                      : isPast
                      ? 'bg-amber-300'
                      : 'bg-gray-200'
                  }`}
                >
                  {hasEvent && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                  {isPast && !isActive && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-amber-600 font-bold' : isPast ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          当前日期：
          <span className="font-semibold text-amber-700 ml-1">
            {level.timelineDates[currentDateIndex]}
          </span>
        </div>
        <button
          onClick={handleAdvance}
          disabled={!!activeEvent || isGameOver}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeEvent || isGameOver
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg active:scale-95'
          }`}
        >
          {activeEvent ? (
            '请先处理事件'
          ) : isGameOver ? (
            '游戏结束'
          ) : (
            <>
              <Play className="w-4 h-4" />
              推进时间
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Timeline;
