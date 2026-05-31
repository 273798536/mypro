import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, AlertTriangle, ArrowRight, Clock, Music2, Plus, Trash2 } from 'lucide-react';
import { v5 as uuidv5 } from 'uuid';
import { useStore } from '@/store';
import type { MissCorrection } from '@/types';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export default function CorrectionPage() {
  const navigate = useNavigate();
  const {
    samples,
    selectedSampleId,
    sessions,
    tierResults,
    failures,
    corrections,
    impacts,
    measures,
    scores,
    selectedSessionId,
    selectSession,
    getSessionsForSample,
    getTierResultsForSession,
    getFailuresForTierResult,
    getCorrectionsForSession,
    getImpactsForCorrection,
    addCorrection,
  } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCorrection, setNewCorrection] = useState({
    measureNumber: 0,
    offsetBeats: 0,
    correctionType: '错拍位置修正',
  });

  const selectedSample = samples.find((s) => s.id === selectedSampleId);
  const sampleSessions = selectedSampleId ? getSessionsForSample(selectedSampleId) : [];
  const sessionCorrections = selectedSessionId ? getCorrectionsForSession(selectedSessionId) : [];
  const score = selectedSample ? scores.find((sc) => sc.id === selectedSample.scoreId) : null;
  const scoreMeasures = score ? measures.filter((m) => m.scoreId === score.id) : [];

  const sessionTierResults = selectedSessionId ? getTierResultsForSession(selectedSessionId) : [];
  const sessionFailures = useMemo(() => {
    return sessionTierResults.flatMap((tr) => getFailuresForTierResult(tr.id));
  }, [sessionTierResults, getFailuresForTierResult]);

  const handleAddCorrection = () => {
    if (!selectedSessionId || newCorrection.measureNumber === 0) return;
    const correction: MissCorrection = {
      id: uuidv5('correction:' + selectedSessionId + ':' + newCorrection.measureNumber + ':' + Date.now(), UUID_NAMESPACE),
      sessionId: selectedSessionId,
      measureNumber: newCorrection.measureNumber,
      offsetBeats: newCorrection.offsetBeats,
      correctionType: newCorrection.correctionType,
      createdAt: Date.now(),
    };
    addCorrection(correction);
    setShowAddModal(false);
    setNewCorrection({ measureNumber: 0, offsetBeats: 0, correctionType: '错拍位置修正' });
  };

  if (!selectedSampleId || !selectedSample) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Music2 className="w-16 h-16 text-accent-secondary mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">请先选择练习样本</h2>
        <p className="text-text-muted mb-6">在配置页面创建或选择一个练习样本后进行错拍补录</p>
        <button
          onClick={() => navigate('/setup')}
          className="px-6 py-3 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all"
        >
          前往配置
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">错拍补录</h1>
          <p className="text-text-muted mt-1">
            {selectedSample.studentName} • {score?.name}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedSessionId}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          补录错拍
        </button>
      </div>

      {sampleSessions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sampleSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                selectedSessionId === session.id
                  ? 'bg-accent-primary text-white shadow-glow-sm'
                  : 'bg-bg-secondary text-text-secondary hover:bg-accent-secondary/20'
              }`}
            >
              版本 {session.version}
              {getCorrectionsForSession(session.id).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                  有修正
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedSessionId && (
        <>
          {sessionCorrections.length === 0 ? (
            <div className="bg-bg-secondary rounded-xl p-12 text-center">
              <Edit3 className="w-12 h-12 text-accent-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">暂无错拍补录</h3>
              <p className="text-text-muted">点击右上角按钮补录错拍位置，系统将自动计算影响范围</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionCorrections.map((correction) => {
                const correctionImpacts = getImpactsForCorrection(correction.id);
                const affectedTierResults = correctionImpacts.filter((i) => i.targetType === 'tier_result');
                const affectedSuggestions = correctionImpacts.filter((i) => i.targetType === 'practice_suggestion');

                return (
                  <div
                    key={correction.id}
                    className="bg-bg-secondary rounded-xl overflow-hidden animate-slide-in"
                  >
                    <div className="p-4 border-b border-accent-secondary/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              第 {correction.measureNumber} 小节错拍修正
                            </div>
                            <div className="text-text-secondary text-sm">
                              {correction.correctionType} • 偏移 {correction.offsetBeats > 0 ? '+' : ''}
                              {correction.offsetBeats} 拍
                            </div>
                          </div>
                        </div>
                        <div className="text-text-muted text-sm">
                          {new Date(correction.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {(affectedTierResults.length > 0 || affectedSuggestions.length > 0) && (
                      <div className="p-4 bg-red-500/5">
                        <div className="text-red-400 text-sm font-medium mb-3 flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          影响范围（共 {correctionImpacts.length} 项变更）
                        </div>
                        <div className="space-y-2">
                          {affectedTierResults.map((impact) => {
                            const tierResult = tierResults.find((r) => r.id === impact.targetId);
                            return (
                              <div
                                key={impact.id}
                                className="flex items-center gap-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30"
                              >
                                <div className="text-text-secondary">档位结果</div>
                                <div className="font-mono text-white">
                                  {tierResult?.bpm} BPM
                                </div>
                                <ArrowRight className="w-4 h-4 text-text-muted" />
                                <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded text-sm">
                                  {impact.beforeValue}
                                </span>
                                <ArrowRight className="w-4 h-4 text-accent-primary" />
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">
                                  {impact.afterValue}
                                </span>
                              </div>
                            );
                          })}
                          {affectedSuggestions.map((impact) => (
                            <div
                              key={impact.id}
                              className="flex items-center gap-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30"
                            >
                              <div className="text-text-secondary">练习建议</div>
                              <div className="text-white">推荐速度</div>
                              <ArrowRight className="w-4 h-4 text-text-muted" />
                              <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded text-sm font-mono">
                                {impact.beforeValue} BPM
                              </span>
                              <ArrowRight className="w-4 h-4 text-accent-primary" />
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm font-mono">
                                {impact.afterValue} BPM
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {sessionFailures.length > 0 && (
            <div className="bg-bg-secondary rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">现有失败标记</h3>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {scoreMeasures.map((measure) => {
                  const hasFailure = sessionFailures.some(
                    (f) => f.measureNumber === measure.measureNumber,
                  );
                  const hasCorrection = sessionCorrections.some(
                    (c) => c.measureNumber === measure.measureNumber,
                  );
                  return (
                    <div
                      key={measure.id}
                      className={`p-3 rounded-lg text-center text-sm font-mono ${
                        hasCorrection
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : hasFailure
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-bg-panel text-text-secondary'
                      }`}
                    >
                      #{measure.measureNumber}
                      {hasCorrection && <span className="ml-1">✓</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded" />
                  <span className="text-text-secondary">有失败</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500/30 rounded" />
                  <span className="text-text-secondary">已修正</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg-secondary rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{sessionFailures.length}</div>
                <div className="text-text-muted text-sm">失败标记</div>
              </div>
            </div>
            <div className="bg-bg-secondary rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Edit3 className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{sessionCorrections.length}</div>
                <div className="text-text-muted text-sm">错拍修正</div>
              </div>
            </div>
            <div className="bg-bg-secondary rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-accent-primary/20 rounded-lg">
                <ArrowRight className="w-6 h-6 text-accent-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{impacts.length}</div>
                <div className="text-text-muted text-sm">影响条目</div>
              </div>
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-md animate-slide-in">
            <h3 className="text-xl font-bold text-white mb-4">补录错拍</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-2 text-sm">选择小节</label>
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                  {scoreMeasures.map((measure) => {
                    const hasFailure = sessionFailures.some(
                      (f) => f.measureNumber === measure.measureNumber,
                    );
                    return (
                      <button
                        key={measure.id}
                        onClick={() => setNewCorrection({ ...newCorrection, measureNumber: measure.measureNumber })}
                        className={`p-2 rounded text-sm font-mono transition-all ${
                          newCorrection.measureNumber === measure.measureNumber
                            ? 'bg-accent-primary text-white'
                            : hasFailure
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-bg-panel text-text-secondary hover:bg-accent-secondary/20'
                        }`}
                      >
                        #{measure.measureNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-text-secondary mb-2 text-sm">
                  偏移量（拍）：{newCorrection.offsetBeats > 0 ? '+' : ''}{newCorrection.offsetBeats}
                </label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.5"
                  value={newCorrection.offsetBeats}
                  onChange={(e) =>
                    setNewCorrection({ ...newCorrection, offsetBeats: parseFloat(e.target.value) })
                  }
                  className="w-full accent-accent-primary"
                />
                <div className="flex justify-between text-text-muted text-xs mt-1">
                  <span>提前 2 拍</span>
                  <span>准时</span>
                  <span>延后 2 拍</span>
                </div>
              </div>
              <div>
                <label className="block text-text-secondary mb-2 text-sm">修正类型</label>
                <input
                  type="text"
                  value={newCorrection.correctionType}
                  onChange={(e) => setNewCorrection({ ...newCorrection, correctionType: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleAddCorrection}
                disabled={newCorrection.measureNumber === 0}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认补录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
