import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { TimelineEntry } from '@/types/quantum';

const typeIcons: Record<TimelineEntry['type'], string> = {
  IMPORT_STATE: '🃏',
  IMPORT_BASIS: '📐',
  IMPORT_PROBABILITY: '📊',
  SELECT_BASIS: '👆',
  MEASURE: '⚡',
  CONFIRM_WARNING: '✅',
};

export default function ReviewPanel() {
  const navigate = useNavigate();
  const states = useGameStore((s) => s.states);
  const bases = useGameStore((s) => s.bases);
  const results = useGameStore((s) => s.results);
  const timeline = useGameStore((s) => s.timeline);
  const traceIndex = useGameStore((s) => s.traceIndex);
  const [traceDirection, setTraceDirection] = useState<'forward' | 'backward'>('forward');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [highlightedResultIds, setHighlightedResultIds] = useState<string[]>([]);

  const handleForwardTrace = (stateId: string) => {
    const resultIds = traceIndex.forward[stateId] ?? [];
    setHighlightedResultIds(resultIds);
    setSelectedEntityId(stateId);
  };

  const handleBackwardTrace = (resultId: string) => {
    const info = traceIndex.backward[resultId];
    if (info) {
      setSelectedEntityId(resultId);
      setHighlightedResultIds([info.stateId]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(192,132,252,0.08)_0%,_transparent_60%)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400
                bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回对局
            </button>
            <h1 className="text-xl font-bold font-orbitron tracking-wider bg-gradient-to-r from-purple-300 to-cyan-400 bg-clip-text text-transparent">
              结算回溯面板
            </h1>
          </div>
          <div className="text-xs text-slate-500">
            共 {results.length} 次测量 · {timeline.length} 条时间线记录
          </div>
        </header>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              概率结算步骤链
            </h2>
            <div className="relative space-y-0 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
              {timeline.map((entry, i) => {
                const isMeasure = entry.type === 'MEASURE';
                const isHighlighted = isMeasure && highlightedResultIds.includes(entry.entityId);
                return (
                  <div
                    key={`tl-${entry.stepIndex}-${entry.type}-${i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isMeasure) {
                        if (traceDirection === 'backward') {
                          handleBackwardTrace(entry.entityId);
                        }
                      } else if (entry.type === 'IMPORT_STATE') {
                        if (traceDirection === 'forward') {
                          handleForwardTrace(entry.entityId);
                        }
                      }
                    }}
                    className={`
                      flex items-start gap-3 py-2 px-3 rounded-lg cursor-pointer
                      transition-colors duration-200
                      ${isHighlighted ? 'bg-cyan-500/15 border border-cyan-500/30' : 'hover:bg-white/5'}
                      ${isMeasure ? 'border-l-2 border-cyan-500/50' : 'border-l-2 border-transparent'}
                    `}
                  >
                    <div className="shrink-0 w-6 flex flex-col items-center">
                      <span className="text-sm">{typeIcons[entry.type]}</span>
                      {i < timeline.length - 1 && (
                        <div className="w-px h-4 bg-white/10 mt-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">步骤 #{entry.stepIndex}</span>
                        <span className="text-xs text-slate-300">{entry.description}</span>
                      </div>
                      {isMeasure && entry.randomSeed !== undefined && (
                        <div className="mt-1 space-y-0.5">
                          <div className="text-[10px] text-cyan-400/80">
                            随机种子: {entry.randomSeed}
                          </div>
                          {entry.seedInfluence && (
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                              {entry.seedInfluence}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              双向追溯视图
            </h2>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setTraceDirection('forward')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors
                  ${traceDirection === 'forward'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                正向: 态→结果
              </button>
              <button
                onClick={() => setTraceDirection('backward')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors
                  ${traceDirection === 'backward'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                反向: 结果→基
              </button>
            </div>

            {traceDirection === 'forward' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 mb-3">点击量子态卡查看其所有测量结果</p>
                {states.map((state) => {
                  const resultIds = traceIndex.forward[state.id] ?? [];
                  const isSelected = selectedEntityId === state.id;
                  return (
                    <div
                      key={state.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleForwardTrace(state.id)}
                      className={`
                        rounded-lg border p-3 cursor-pointer transition-all
                        ${isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/8'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-orbitron text-white">
                          {state.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          → {resultIds.length} 条结果
                        </span>
                        <ArrowLeftRight className="w-3 h-3 text-slate-600 ml-auto" />
                      </div>
                      {isSelected && resultIds.length > 0 && (
                        <div className="mt-2 space-y-1 pl-3 border-l border-cyan-500/20">
                          {resultIds.map((rid) => {
                            const result = results.find((r) => r.id === rid);
                            if (!result) return null;
                            const basis = bases.find((b) => b.id === result.basisId);
                            return (
                              <div key={rid} className="flex items-center gap-2 text-xs">
                                <span className="text-cyan-400">{basis?.label}</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-white font-bold">{result.outcomeLabel}</span>
                                <span className="text-slate-600 ml-auto">
                                  seed:{result.randomSeed}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {traceDirection === 'backward' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 mb-3">点击测量结果反查量子态和测量基</p>
                {results.map((result) => {
                  const state = states.find((s) => s.id === result.stateId);
                  const basis = bases.find((b) => b.id === result.basisId);
                  const isSelected = selectedEntityId === result.id;
                  return (
                    <div
                      key={result.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleBackwardTrace(result.id)}
                      className={`
                        rounded-lg border p-3 cursor-pointer transition-all
                        ${isSelected
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/8'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-orbitron text-white">
                          {result.outcomeLabel}
                        </span>
                        <span className="text-xs text-slate-500">
                          步骤 #{result.stepIndex}
                        </span>
                        <ArrowLeftRight className="w-3 h-3 text-slate-600 ml-auto" />
                      </div>
                      {isSelected && (
                        <div className="mt-2 space-y-1 pl-3 border-l border-purple-500/20">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">量子态:</span>
                            <span className="text-cyan-300 font-bold">{state?.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">测量基:</span>
                            <span className="text-green-300 font-bold">{basis?.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">种子:</span>
                            <span className="text-slate-300">{result.randomSeed}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 leading-relaxed mt-1">
                            {result.seedInfluence}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {results.length === 0 && (
                  <p className="text-xs text-slate-600">尚无测量结果，请先返回对局执行测量。</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
