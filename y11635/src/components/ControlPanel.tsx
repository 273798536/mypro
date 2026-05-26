import React from 'react';
import { Waves, Bell, BellOff, AlertTriangle, Droplets } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';

export function ControlPanel() {
  const { gateOpening, setGateOpening, warningIssued, toggleWarning, reservoirLevel, status } = useGameStore();
  
  const isGameOver = status !== 'playing';

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-4">
      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
        <Waves className="w-5 h-5 text-blue-400" />
        闸门控制
      </h3>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-300">闸门开度</span>
            <span className="text-lg font-mono font-bold text-blue-400">{gateOpening}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={gateOpening}
            onChange={(e) => setGateOpening(Number(e.target.value))}
            disabled={isGameOver}
            className="w-full h-3 rounded-full appearance-none cursor-pointer
              bg-gradient-to-r from-green-500 via-yellow-500 to-red-500
              disabled:opacity-50 disabled:cursor-not-allowed
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0 关闸</span>
            <span>50%</span>
            <span>100 全开</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[0, 30, 60].map((val) => (
            <button
              key={val}
              onClick={() => setGateOpening(val)}
              disabled={isGameOver}
              className="py-2 px-3 rounded-lg text-sm font-medium
                bg-slate-700 hover:bg-slate-600 text-slate-200
                border border-slate-600 hover:border-slate-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200"
            >
              {val === 0 ? '关闸' : val === 30 ? '低开度' : '中开度'}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              {warningIssued ? (
                <>
                  <Bell className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400 font-medium">预警已发布</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">预警未发布</span>
                </>
              )}
            </span>
          </div>
          <button
            onClick={toggleWarning}
            disabled={isGameOver}
            className={`w-full py-3 rounded-lg font-medium transition-all duration-200
              ${warningIssued
                ? 'bg-orange-500 hover:bg-orange-400 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {warningIssued ? '🔔 撤回预警' : '🔕 发布预警'}
          </button>
        </div>

        {gateOpening > 70 && reservoirLevel < 70 && (
          <div className="flex items-start gap-2 p-3 bg-red-900/30 rounded-lg border border-red-700/50">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-300">
              <p className="font-medium">开闸过猛警告</p>
              <p className="text-red-400/80">当前开闸 {gateOpening}% 过大，水位可能骤降，影响下游生态</p>
            </div>
          </div>
        )}

        {reservoirLevel < 30 && (
          <div className="flex items-start gap-2 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
            <Droplets className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <p className="font-medium">蓄水不足提示</p>
              <p className="text-blue-400/80">水位过低，建议关闸蓄水以保障水资源供应</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
