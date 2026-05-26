import React from 'react';
import { Play, RotateCcw, Zap, Clock, Droplets, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { CHEMICALS } from '@/data/chemicals';
import { cn } from '@/lib/utils';

export function ControlPanel() {
  const {
    status,
    selectedChemical,
    currentDosage,
    currentMixingTime,
    startSimulation,
    resetSimulation,
    executeOperation,
    setSelectedChemical,
    setCurrentDosage,
    setCurrentMixingTime,
  } = useGameStore();

  const chemical = CHEMICALS.find((c) => c.id === selectedChemical);

  const maxDosage = chemical ? chemical.dosageRange[1] * 2 : 100;
  const step = chemical && chemical.dosageRange[1] > 10 ? 1 : 0.1;

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          控制面板
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {status === 'idle' ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="text-center">
              <Droplets className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">污水厂投药模拟</h3>
              <p className="text-slate-400 text-sm">
                调节投药量和搅拌参数，使出水水质达标
              </p>
            </div>
            <button
              onClick={startSimulation}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <Play className="w-5 h-5" />
              开始模拟
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">选择药剂</label>
              <div className="grid grid-cols-2 gap-2">
                {CHEMICALS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChemical(c.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      selectedChemical === c.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    )}
                  >
                    <div className="font-medium text-sm">{c.name.split(' ')[0]}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {c.type === 'coagulant' && '混凝剂'}
                      {c.type === 'flocculant' && '助凝剂'}
                      {c.type === 'phAdjuster' && 'pH调节剂'}
                    </div>
                  </button>
                ))}
              </div>
              {chemical && (
                <p className="text-xs text-slate-400 p-2 bg-slate-800 rounded">
                  {chemical.description}
                </p>
              )}
            </div>

            {chemical && (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      投药量
                    </label>
                    <span className="text-cyan-400 font-mono text-lg">
                      {currentDosage.toFixed(1)} <span className="text-sm text-slate-400">mg/L</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={maxDosage}
                      step={step}
                      value={currentDosage}
                      onChange={(e) => setCurrentDosage(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>0</span>
                      <span className="text-green-400">推荐: {chemical.dosageRange[0]}-{chemical.dosageRange[1]}</span>
                      <span>{maxDosage}</span>
                    </div>
                    {currentDosage > chemical.dosageRange[1] * 1.5 && (
                      <div className="flex items-center gap-1 mt-2 text-red-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        投药量严重超标！
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-400" />
                      搅拌时间
                    </label>
                    <span className="text-orange-400 font-mono text-lg">
                      {currentMixingTime} <span className="text-sm text-slate-400">分钟</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={currentMixingTime}
                      onChange={(e) => setCurrentMixingTime(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1</span>
                      <span className="text-green-400">建议: ≥5分钟</span>
                      <span>30</span>
                    </div>
                    {currentMixingTime < 5 && (
                      <div className="flex items-center gap-1 mt-2 text-yellow-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        搅拌时间不足
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2 pt-4 border-t border-slate-700">
              <button
                onClick={executeOperation}
                disabled={!selectedChemical || status !== 'running'}
                className={cn(
                  'w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
                  selectedChemical && status === 'running'
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                )}
              >
                <Play className="w-5 h-5" />
                执行投药
              </button>
              <button
                onClick={resetSimulation}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重置模拟
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
