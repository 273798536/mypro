import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useSoundscapeStore } from '@/store/useSoundscapeStore';
import { JudgmentQuestion } from '@/components/JudgmentQuestion';
import { ReportDisplay } from '@/components/ReportDisplay';
import { SettlementPanel } from '@/components/SettlementPanel';
import { LeftPanel } from '@/components/LeftPanel';
import type { ResidentEmotion } from '../../shared/types';

export default function RemixStage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentLevel,
    currentReportIndex,
    judgments,
    loading,
    error,
    fetchLevel,
    fetchJudgments,
    submitJudgment,
    patchEmotion,
    setCurrentReportIndex,
    resetCurrent,
  } = useSoundscapeStore();

  const [answers, setAnswers] = useState({
    dbStackingCorrect: null as boolean | null,
    overlapNotMerged: null as boolean | null,
    nightThresholdOk: null as boolean | null,
  });
  const [delayedCountdown, setDelayedCountdown] = useState<number | null>(null);
  const [delayedEmotions, setDelayedEmotions] = useState<ResidentEmotion[]>([]);
  const [lastJudgmentId, setLastJudgmentId] = useState<string | null>(null);
  const countdownRef = useRef<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchLevel(id);
      fetchJudgments(id);
    }
    return () => {
      resetCurrent();
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [id, fetchLevel, fetchJudgments, resetCurrent]);

  const currentReport = useMemo(
    () => currentLevel?.reports[currentReportIndex],
    [currentLevel, currentReportIndex]
  );
  const reportSources = useMemo(() => {
    if (!currentLevel || !currentReport) return [];
    return currentLevel.sources.filter((s) =>
      currentReport.sourceIds.includes(s.id)
    );
  }, [currentLevel, currentReport]);
  const totalScore = useMemo(
    () => judgments.reduce((sum, j) => sum + j.score, 0),
    [judgments]
  );
  const avgEmotionModifier = useMemo(
    () =>
      judgments.length > 0
        ? judgments.reduce((sum, j) => sum + j.emotionModifier, 0) / judgments.length
        : 1.0,
    [judgments]
  );
  const isNightViolation = currentReport?.violatesNightThreshold;

  const triggerDelayedEmotions = () => {
    if (!currentLevel) return;
    const delayed = currentLevel.emotions.filter((e) => e.delayed);
    if (delayed.length > 0) {
      setDelayedEmotions(delayed);
      setDelayedCountdown(8);
    }
  };

  useEffect(() => {
    if (delayedCountdown === null) return;
    if (delayedCountdown > 0) {
      countdownRef.current = window.setTimeout(
        () => setDelayedCountdown((p) => (p !== null ? p - 1 : null)),
        1000
      );
    } else if (delayedCountdown === 0 && lastJudgmentId) {
      patchEmotion(
        lastJudgmentId,
        delayedEmotions.map((e) => e.id)
      );
      setDelayedCountdown(null);
      setDelayedEmotions([]);
    }
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [delayedCountdown, lastJudgmentId, delayedEmotions, patchEmotion]);

  const handleSubmit = async () => {
    if (!id || !currentReport) return;
    if (
      answers.dbStackingCorrect === null ||
      answers.overlapNotMerged === null ||
      answers.nightThresholdOk === null
    )
      return;

    const result = await submitJudgment({
      levelId: id,
      reportId: currentReport.id,
      dbStackingCorrect: answers.dbStackingCorrect,
      overlapNotMerged: answers.overlapNotMerged,
      nightThresholdOk: answers.nightThresholdOk,
    });

    if (result) {
      setLastJudgmentId(result.id);
      triggerDelayedEmotions();
      setAnswers({
        dbStackingCorrect: null,
        overlapNotMerged: null,
        nightThresholdOk: null,
      });
    }
  };

  const allAnswered =
    answers.dbStackingCorrect !== null &&
    answers.overlapNotMerged !== null &&
    answers.nightThresholdOk !== null;

  if (!currentLevel || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="h-screen flex flex-col">
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              返回大厅
            </Link>
            <h1 className="text-xl font-bold">{currentLevel.name}</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-[var(--text-secondary)]">总分：</span>
              <span className="text-amber-400 font-bold">{totalScore}</span>
            </div>
            <div className="text-sm">
              <span className="text-[var(--text-secondary)]">情绪修正：</span>
              <span
                className={`font-bold ${
                  avgEmotionModifier >= 1.0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                x{avgEmotionModifier.toFixed(2)}
              </span>
            </div>
            <Link
              to={`/report/${id}`}
              className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
            >
              <FileText className="w-4 h-4" />
              查看报告
            </Link>
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <LeftPanel
            sources={currentLevel.sources}
            emotions={currentLevel.emotions}
            currentReport={currentReport}
          />

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            {currentReport && (
              <>
                <ReportDisplay
                  report={currentReport}
                  sources={reportSources}
                  reportIndex={currentReportIndex}
                />

                <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-white/10 flex-1">
                  <h3 className="font-semibold text-lg mb-6">请做出审判</h3>
                  <div className="space-y-6">
                    <JudgmentQuestion
                      question="分贝叠加是否正确？"
                      answer={answers.dbStackingCorrect}
                      onAnswer={(v) =>
                        setAnswers((a) => ({ ...a, dbStackingCorrect: v }))
                      }
                    />
                    <JudgmentQuestion
                      question="声源重叠是否未被错误合并？"
                      answer={answers.overlapNotMerged}
                      onAnswer={(v) =>
                        setAnswers((a) => ({ ...a, overlapNotMerged: v }))
                      }
                    />
                    <JudgmentQuestion
                      question="夜间阈值是否合规？"
                      answer={answers.nightThresholdOk}
                      onAnswer={(v) =>
                        setAnswers((a) => ({ ...a, nightThresholdOk: v }))
                      }
                      trueLabel="合规"
                      falseLabel="违规"
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || loading}
                    className="w-full mt-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    提交审判
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() =>
                      setCurrentReportIndex(Math.max(0, currentReportIndex - 1))
                    }
                    disabled={currentReportIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    上一份
                  </button>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {currentReportIndex + 1} / {currentLevel.reports.length}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentReportIndex(
                        Math.min(
                          currentLevel.reports.length - 1,
                          currentReportIndex + 1
                        )
                      )
                    }
                    disabled={currentReportIndex === currentLevel.reports.length - 1}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    下一份
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          <SettlementPanel
            totalScore={totalScore}
            avgEmotionModifier={avgEmotionModifier}
            isNightViolation={isNightViolation}
            nightThresholdDb={currentLevel.nightThresholdDb}
            delayedCountdown={delayedCountdown}
            delayedEmotions={delayedEmotions}
            judgments={judgments}
          />
        </div>
      </div>
    </div>
  );
}
