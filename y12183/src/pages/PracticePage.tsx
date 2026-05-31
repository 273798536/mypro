import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, X, Music2, Clock, Zap, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { v5 as uuidv5 } from 'uuid';
import { useStore } from '@/store';
import { FAILURE_TYPE_LABELS, type FailureMark, type FailureType } from '@/types';
import { generateSpeedTiers } from '@/engine/evaluate';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export default function PracticePage() {
  const navigate = useNavigate();
  const {
    samples,
    selectedSampleId,
    selectedSessionId,
    sessions,
    tierResults,
    failures,
    ladders,
    scores,
    measures,
    getSessionsForSample,
    getTierResultsForSession,
    getFailuresForTierResult,
    selectSession,
    addSession,
    markTierPass,
    markTierFail,
    currentBpmIndex,
    setCurrentBpmIndex,
  } = useStore();

  const [showFailureModal, setShowFailureModal] = useState(false);
  const [selectedMeasures, setSelectedMeasures] = useState<Set<number>>(new Set());
  const [failureType, setFailureType] = useState<FailureType>('rhythm');

  const selectedSample = samples.find((s) => s.id === selectedSampleId);
  const sampleSessions = selectedSampleId ? getSessionsForSample(selectedSampleId) : [];
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const ladder = selectedSample ? ladders.find((l) => l.id === selectedSample.ladderId) : null;
  const score = selectedSample ? scores.find((sc) => sc.id === selectedSample.scoreId) : null;
  const scoreMeasures = score ? measures.filter((m) => m.scoreId === score.id) : [];

  const tiers = useMemo(() => {
    if (!ladder) return [];
    return generateSpeedTiers(ladder);
  }, [ladder]);

  const sessionTierResults = selectedSessionId ? getTierResultsForSession(selectedSessionId) : [];
  const resultsByBpm = useMemo(() => {
    const map = new Map<number, { status: string; failures: FailureMark[] }>();
    sessionTierResults.forEach((tr) => {
      const fs = getFailuresForTierResult(tr.id);
      map.set(tr.bpm, { status: tr.passStatus, failures: fs });
    });
    return map;
  }, [sessionTierResults, getFailuresForTierResult]);

  const currentTier = tiers[currentBpmIndex];
  const currentResult = currentTier ? resultsByBpm.get(currentTier.bpm) : null;

  const handleStartSession = () => {
    if (!selectedSampleId) return;
    const version = sampleSessions.length + 1;
    const sessionId = uuidv5(selectedSampleId + ':' + version + ':' + Date.now(), UUID_NAMESPACE);
    addSession({
      id: sessionId,
      sampleId: selectedSampleId,
      version,
      createdAt: Date.now(),
      snapshotHash: '',
    });
    setCurrentBpmIndex(0);
  };

  const handlePass = () => {
    if (!selectedSessionId || !currentTier) return;
    markTierPass(selectedSessionId, currentTier.bpm);
    if (currentBpmIndex < tiers.length - 1) {
      setCurrentBpmIndex(currentBpmIndex + 1);
    }
  };

  const handleOpenFailureModal = () => {
    setSelectedMeasures(new Set());
    setFailureType('rhythm');
    setShowFailureModal(true);
  };

  const handleConfirmFailure = () => {
    if (!selectedSessionId || !currentTier || selectedMeasures.size === 0) return;
    const newFailures: FailureMark[] = Array.from(selectedMeasures).map((measureNum) => ({
      id: uuidv5('fail:' + selectedSessionId + ':' + currentTier.bpm + ':' + measureNum, UUID_NAMESPACE),
      tierResultId: '',
      measureNumber: measureNum,
      failureType,
      correctedAt: null,
    }));
    markTierFail(selectedSessionId, currentTier.bpm, newFailures);
    setShowFailureModal(false);
  };

  const toggleMeasure = (measureNum: number) => {
    const newSet = new Set(selectedMeasures);
    if (newSet.has(measureNum)) {
      newSet.delete(measureNum);
    } else {
      newSet.add(measureNum);
    }
    setSelectedMeasures(newSet);
  };

  if (!selectedSampleId || !selectedSample) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Music2 className="w-16 h-16 text-accent-secondary mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">请先选择练习样本</h2>
        <p className="text-text-muted mb-6">在配置页面创建或选择一个练习样本后开始练习</p>
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
          <h1 className="text-2xl font-bold text-white">练习记录</h1>
          <p className="text-text-muted mt-1">
            {selectedSample.studentName} • {score?.name}
          </p>
        </div>
        {!selectedSessionId && (
          <button
            onClick={handleStartSession}
            className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all"
          >
            <Play className="w-5 h-5" />
            开始新练习
          </button>
        )}
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
            </button>
          ))}
        </div>
      )}

      {selectedSessionId && ladder && currentTier && (
        <>
          <div className="bg-bg-secondary rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentBpmIndex(Math.max(0, currentBpmIndex - 1))}
                disabled={currentBpmIndex === 0}
                className="p-2 bg-bg-panel rounded-lg text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="text-center">
                <div className="text-6xl font-bold text-accent-primary font-mono">
                  {currentTier.bpm}
                </div>
                <div className="text-text-muted mt-1">BPM</div>
                <div className="text-text-secondary text-sm mt-2">
                  档位 {currentBpmIndex + 1} / {tiers.length}
                </div>
              </div>
              <button
                onClick={() => setCurrentBpmIndex(Math.min(tiers.length - 1, currentBpmIndex + 1))}
                disabled={currentBpmIndex === tiers.length - 1}
                className="p-2 bg-bg-panel rounded-lg text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {currentResult ? (
              <div className="text-center mb-6">
                {currentResult.status === 'pass' ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
                    <Check className="w-5 h-5" />
                    已通过
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg">
                      <X className="w-5 h-5" />
                      未通过
                    </div>
                    <div className="text-text-secondary text-sm">
                      失败小节：
                      {currentResult.failures.map((f) => `#${f.measureNumber}`).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handlePass}
                  className="flex items-center gap-2 px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all text-lg font-medium"
                >
                  <Check className="w-6 h-6" />
                  通过
                </button>
                <button
                  onClick={handleOpenFailureModal}
                  className="flex items-center gap-2 px-8 py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-lg font-medium"
                >
                  <X className="w-6 h-6" />
                  失败
                </button>
              </div>
            )}
          </div>

          <div className="bg-bg-secondary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">速度阶梯进度</h3>
            <div className="flex flex-wrap gap-3">
              {tiers.map((tier, idx) => {
                const result = resultsByBpm.get(tier.bpm);
                const isCurrent = idx === currentBpmIndex;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setCurrentBpmIndex(idx)}
                    className={`px-4 py-2 rounded-lg font-mono transition-all ${
                      isCurrent
                        ? 'bg-accent-primary text-white shadow-glow animate-pulse-glow'
                        : result?.status === 'pass'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : result?.status === 'fail'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-bg-panel text-text-secondary hover:bg-accent-secondary/20'
                    }`}
                  >
                    {tier.bpm}
                  </button>
                );
              })}
            </div>
          </div>

          {score && (
            <div className="bg-bg-secondary rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">小节预览</h3>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {scoreMeasures.map((measure) => {
                  const hasFailure = currentResult?.failures.some(
                    (f) => f.measureNumber === measure.measureNumber,
                  );
                  return (
                    <div
                      key={measure.id}
                      className={`p-3 rounded-lg text-center text-sm font-mono ${
                        hasFailure
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-bg-panel text-text-secondary'
                      }`}
                    >
                      #{measure.measureNumber}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg-secondary rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-accent-primary/20 rounded-lg">
                <Zap className="w-6 h-6 text-accent-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {sessionTierResults.filter((r) => r.passStatus === 'pass').length}
                </div>
                <div className="text-text-muted text-sm">已通过档位</div>
              </div>
            </div>
            <div className="bg-bg-secondary rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {sessionTierResults.filter((r) => r.passStatus === 'fail').length}
                </div>
                <div className="text-text-muted text-sm">未通过档位</div>
              </div>
            </div>
            <div className="bg-bg-secondary rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-accent-secondary/20 rounded-lg">
                <Clock className="w-6 h-6 text-accent-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {sessionTierResults.filter((r) => r.passStatus === 'pending').length +
                    (tiers.length - sessionTierResults.length)}
                </div>
                <div className="text-text-muted text-sm">剩余档位</div>
              </div>
            </div>
          </div>
        </>
      )}

      {showFailureModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-2xl animate-slide-in">
            <h3 className="text-xl font-bold text-white mb-4">标记失败小节</h3>
            <div className="mb-4">
              <label className="block text-text-secondary mb-2 text-sm">失败类型</label>
              <div className="flex gap-2">
                {(['rhythm', 'dynamics', 'miss'] as FailureType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFailureType(type)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      failureType === type
                        ? 'bg-accent-primary text-white'
                        : 'bg-bg-panel text-text-secondary hover:bg-accent-secondary/20'
                    }`}
                  >
                    {FAILURE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-text-secondary mb-2 text-sm">
                点击选择失败的小节
              </label>
              <div className="grid grid-cols-8 gap-2">
                {scoreMeasures.map((measure) => (
                  <button
                    key={measure.id}
                    onClick={() => toggleMeasure(measure.measureNumber)}
                    className={`p-3 rounded-lg text-center text-sm font-mono transition-all ${
                      selectedMeasures.has(measure.measureNumber)
                        ? 'bg-red-500 text-white'
                        : 'bg-bg-panel text-text-secondary hover:bg-accent-secondary/20'
                    }`}
                  >
                    #{measure.measureNumber}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-text-secondary text-sm mb-4">
              已选择 {selectedMeasures.size} 个小节
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFailureModal(false)}
                className="flex-1 px-4 py-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleConfirmFailure}
                disabled={selectedMeasures.size === 0}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认失败
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
