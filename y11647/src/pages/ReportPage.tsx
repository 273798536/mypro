import { ArrowLeft, Download, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScoreCard } from '../components/report/ScoreCard';
import { EventTimeline } from '../components/report/EventTimeline';
import { useSimulationStore } from '../store/useSimulationStore';
import { useTacticsStore } from '../store/useTacticsStore';
import { exportResultAsJSON, exportResultAsText } from '../utils/export';

export function ReportPage() {
  const navigate = useNavigate();
  const { result, clearResult, startSimulation } = useSimulationStore();
  const { scheme } = useTacticsStore();

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">没有可用的报告数据</p>
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

  const handleRerun = () => {
    clearResult();
    startSimulation(scheme);
    navigate('/simulation');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
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
              比赛报告
            </h1>
            <span className="text-sm text-slate-400">{scheme.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportResultAsText(result, scheme.name)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 TXT
            </button>
            <button
              onClick={() => exportResultAsJSON(result, scheme.name)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              onClick={handleRerun}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重新模拟
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ScoreCard result={result} />
          </div>
          <div className="lg:col-span-2">
            <EventTimeline events={result.events} />
          </div>
        </div>

        <div className="mt-6 bg-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-slate-300 mb-4">失败原因分析</h3>
          {result.events.filter((e) => e.type === 'collision' || e.type === 'energy_empty' || e.type === 'out_of_bounds' || e.type === 'pass_fail').length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-emerald-400 font-medium">完美执行！没有发生任何失败事件</p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.events
                .filter((e) => e.type === 'collision' || e.type === 'energy_empty' || e.type === 'out_of_bounds' || e.type === 'pass_fail')
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg"
                  >
                    <span className="text-xs font-mono text-slate-400 w-20">
                      [{event.time.toFixed(2)}s]
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        event.type === 'collision'
                          ? 'bg-red-500/20 text-red-400'
                          : event.type === 'energy_empty'
                          ? 'bg-amber-500/20 text-amber-400'
                          : event.type === 'out_of_bounds'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {event.type === 'collision'
                        ? '碰撞'
                        : event.type === 'energy_empty'
                        ? '能量耗尽'
                        : event.type === 'out_of_bounds'
                        ? '越界'
                        : '传球失败'}
                    </span>
                    <span className="text-sm text-slate-200 flex-1">{event.message}</span>
                    <span className="text-xs text-slate-500">
                      ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
