import { useState, useMemo } from 'react';
import { Calculator, ArrowRight, ChevronDown, ChevronUp, RefreshCw, SplitSquareVertical } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

import { CalculationStep, UnitConversion } from '../types';

interface CalculationCardProps {
  title: string;
  paramSetName: string;
  noteId: string;
}

function CalculationCard({ title, paramSetName, noteId }: CalculationCardProps) {
  const { notes, results, parameterSets, objects, calculateReverb } = useAppStore();
  const [expanded, setExpanded] = useState(true);

  const note = notes.find(n => n.id === noteId);
  const result = results.find(r => r.noteId === noteId && r.paramSetId === parameterSets.find(p => p.name === paramSetName)?.id);
  const object = objects.find(o => o.id === note?.objectId);
  const paramSet = parameterSets.find(p => p.name === paramSetName);

  const handleRecalculate = () => {
    if (!noteId || !paramSet?.id) return;
    calculateReverb(noteId, paramSet.id);
  };

  const renderFormula = (formula: string, input: Record<string, number>) => {
    let rendered = formula;
    Object.entries(input).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      rendered = rendered.replace(regex, typeof value === 'number' ? value.toFixed(4) : String(value));
    });
    return rendered;
  };

  if (!note) return null;

  return (
    <div className="bg-lab-bg border border-lab-border rounded-lg overflow-hidden">
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-lab-border/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Calculator size={16} className="text-lab-accent" />
          <div>
            <div className="text-sm font-medium text-white">{title}</div>
            <div className="text-xs text-gray-400">
              {object?.name} · {paramSetName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <span className="text-lab-accent font-mono text-sm">
              T60 = {result.reverbTime.toFixed(4)} s
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-lab-border/50 p-3 space-y-4">
          {result ? (
            <>
              {result.unitConversions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <ArrowRight size={12} />
                    单位换算
                  </h4>
                  <div className="space-y-1">
                    {result.unitConversions.map((conv: UnitConversion, i: number) => (
                      <div key={i} className="bg-lab-panel p-2 rounded text-xs font-mono">
                        <span className="text-gray-400">步骤 {i + 1}:</span>
                        <span className="text-lab-accent ml-2">{conv.formula}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Calculator size={12} />
                  计算过程
                </h4>
                <div className="space-y-2">
                  {result.intermediateSteps.map((step: CalculationStep, i: number) => (
                    <div key={i} className="bg-lab-panel p-3 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{step.description}</span>
                        {step.output !== 0 && (
                          <span className="text-xs font-mono text-lab-accent">
                            = {step.output.toFixed(6)} {step.unit}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono text-white bg-lab-bg px-2 py-1 rounded">
                        {renderFormula(step.formula, step.input)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-lab-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">最终混响时间 T60</span>
                  <span className="text-2xl font-mono font-bold text-lab-accent">
                    {result.reverbTime.toFixed(4)} <span className="text-sm text-gray-400">s</span>
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  计算时间: {new Date(result.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Calculator size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">尚未执行复算</p>
              <button
                onClick={handleRecalculate}
                disabled={!paramSet}
                className="px-4 py-2 bg-lab-accent hover:bg-lab-accent-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                执行复算
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CalculationResultPanel() {
  const {
    notes,
    results,
    parameterSets,
    selectedObjectId,
    compareMode,
    selectedParamSetIds,
    setSelectedParamSet,
    toggleCompareMode,
    recalculateAll
  } = useAppStore();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedObjectId) {
      result = notes.filter(n => n.objectId === selectedObjectId);
    }
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, selectedObjectId]);

  const displayNoteId = selectedNoteId || filteredNotes[0]?.id;

  return (
    <div className="h-full flex flex-col bg-lab-panel border-l border-lab-border">
      <div className="p-4 border-b border-lab-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">复算结果</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={recalculateAll}
              className="p-2 rounded-lg bg-lab-border hover:bg-gray-600 text-gray-300 transition-colors"
              title="重新计算所有"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={toggleCompareMode}
              className={`p-2 rounded-lg transition-colors ${
                compareMode
                  ? 'bg-lab-accent text-white'
                  : 'bg-lab-border hover:bg-gray-600 text-gray-300'
              }`}
              title="双参数对照模式"
            >
              <SplitSquareVertical size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {filteredNotes.length > 0 && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">选择备注</label>
              <select
                value={displayNoteId || ''}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="w-full px-3 py-2 bg-lab-bg border border-lab-border rounded-lg text-white text-sm focus:outline-none focus:border-lab-accent"
              >
                {filteredNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.content.slice(0, 30)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          {compareMode && (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((index) => (
                <div key={index}>
                  <label className="block text-xs text-gray-400 mb-1">参数组 {index + 1}</label>
                  <select
                    value={selectedParamSetIds[index] || ''}
                    onChange={(e) => setSelectedParamSet(index as 0 | 1, e.target.value || null)}
                    className="w-full px-3 py-2 bg-lab-bg border border-lab-border rounded-lg text-white text-sm focus:outline-none focus:border-lab-accent"
                  >
                    <option value="">选择参数组...</option>
                    {parameterSets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!displayNoteId ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            请选择一个备注查看复算结果
          </div>
        ) : compareMode && selectedParamSetIds[0] && selectedParamSetIds[1] ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedParamSetIds.map((paramSetId, index) => {
              const paramSet = parameterSets.find(p => p.id === paramSetId);
              if (!paramSet) return null;
              
              const result = results.find(
                r => r.noteId === displayNoteId && r.paramSetId === paramSetId
              );
              const otherResult = results.find(
                r => r.noteId === displayNoteId && r.paramSetId === selectedParamSetIds[1 - index]
              );
              
              const diff = result && otherResult
                ? ((result.reverbTime - otherResult.reverbTime) / otherResult.reverbTime * 100)
                : null;

              return (
                <div key={paramSetId} className="relative">
                  <div className={`absolute -top-2 -left-2 z-10 px-2 py-1 rounded text-xs font-bold ${
                    index === 0 ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    参数组 {index + 1}
                  </div>
                  <CalculationCard
                    title={`${paramSet.name}`}
                    paramSetName={paramSet.name}
                    noteId={displayNoteId}
                  />
                  {diff !== null && (
                    <div className={`mt-2 p-2 rounded text-xs text-center font-mono ${
                      diff > 0 ? 'bg-lab-error/20 text-lab-error' : 'bg-lab-success/20 text-lab-success'
                    }`}>
                      差异: {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <CalculationCard
              title="复算结果"
              paramSetName={parameterSets[0]?.name || '默认参数组'}
              noteId={displayNoteId}
            />

            {parameterSets.length > 1 && !compareMode && (
              <div className="mt-4 p-3 bg-lab-bg/50 rounded-lg border border-lab-border/50">
                <p className="text-xs text-gray-400 text-center">
                  点击右上角 <SplitSquareVertical size={12} className="inline" /> 按钮开启双参数对照模式
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="p-4 border-t border-lab-border bg-lab-bg/50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-mono font-bold text-lab-accent">{results.length}</div>
              <div className="text-xs text-gray-500">计算次数</div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {results.length > 0 ? results.filter(r => r.status === 'completed').length : 0}
              </div>
              <div className="text-xs text-gray-500">已完成</div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-lab-warning">
                {results.length > 0 
                  ? (Math.min(...results.filter(r => r.status === 'completed').map(r => r.reverbTime))).toFixed(2)
                  : '-'}
              </div>
              <div className="text-xs text-gray-500">最小 T60 (s)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
