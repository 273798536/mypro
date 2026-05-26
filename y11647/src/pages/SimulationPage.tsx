import { useMemo } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FieldCanvas } from '../components/canvas/FieldCanvas';
import { SimulationPlayer } from '../components/simulation/SimulationPlayer';
import { EventToast } from '../components/simulation/EventToast';
import { useSimulationStore } from '../store/useSimulationStore';
import { useTacticsStore } from '../store/useTacticsStore';
import type { Point } from '../engine/types';

export function SimulationPage() {
  const navigate = useNavigate();
  const { result, currentFrameIndex, isRunning } = useSimulationStore();
  const { scheme } = useTacticsStore();

  const overlayPositions = useMemo(() => {
    const positions = new Map<string, Point>();
    if (result && result.frames[currentFrameIndex]) {
      for (const state of result.frames[currentFrameIndex].elementStates) {
        positions.set(state.elementId, state.position);
      }
    }
    return positions;
  }, [result, currentFrameIndex]);

  const overlayEnergies = useMemo(() => {
    const energies = new Map<string, number>();
    if (result && result.frames[currentFrameIndex]) {
      for (const state of result.frames[currentFrameIndex].elementStates) {
        if (state.energy !== undefined) {
          energies.set(state.elementId, state.energy);
        }
      }
    }
    return energies;
  }, [result, currentFrameIndex]);

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">没有正在运行的模拟</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg"
          >
            返回编辑页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <EventToast />

      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回编辑
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              模拟运行
            </h1>
            <span className="text-sm text-slate-400">{scheme.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-400">
              当前得分: <span className="text-emerald-400 font-bold">{result.score.total}</span>
            </div>
            {!isRunning && (
              <button
                onClick={() => navigate('/report')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                查看报告
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center mb-4">
            <FieldCanvas readOnly overlayPositions={overlayPositions} overlayEnergies={overlayEnergies} />
          </div>

          <SimulationPlayer />

          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-sky-400">{result.score.obstacle}</div>
              <div className="text-xs text-slate-400">避障得分 /30</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{result.score.pass}</div>
              <div className="text-xs text-slate-400">传球精度 /30</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{result.score.energy}</div>
              <div className="text-xs text-slate-400">能量效率 /20</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{result.score.completion}</div>
              <div className="text-xs text-slate-400">完成度 /20</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
