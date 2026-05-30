import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, RotateCcw, PlusCircle, Hexagon } from 'lucide-react';
import { useScoreStore } from '@/store/scoreStore';
import { useReportStore } from '@/store/reportStore';
import { useGameStore } from '@/store/gameStore';
import { getLevelById } from '@/data/levels';
import { generatePracticeReport } from '@/engine/reportGenerator';
import ScoreSummary from '@/components/score/ScoreSummary';
import StepScoreItem from '@/components/score/StepScoreItem';
import CounterexampleAlert from '@/components/score/CounterexampleAlert';
import OwnerGuide from '@/components/score/OwnerGuide';
import type { ErrorType } from '@/types/score';
import type { Counterexample } from '@/types/game';

export default function ScoreBoard() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { scoreResult, isScoring } = useScoreStore();
  const { setReport, addCounterexampleEdit } = useReportStore();
  const { connections, counterexamples, resetGame, currentLevelId } = useGameStore();
  const [showAddCounterexample, setShowAddCounterexample] = useState(false);
  const [newCounterexample, setNewCounterexample] = useState('');

  const level = useMemo(() => {
    if (!levelId) return undefined;
    return getLevelById(levelId);
  }, [levelId]);

  const unexcludedCounterexamples = useMemo(() => {
    if (!scoreResult || !level) return [];
    return level.counterexamples.filter((ce) =>
      scoreResult.unexcludedCounterexamples.includes(ce.id)
    );
  }, [scoreResult, level]);

  const errorTypes = useMemo(() => {
    if (!scoreResult) return [];
    const types = new Set<ErrorType>();
    scoreResult.stepScores.forEach((step) => {
      if (step.errorType) {
        types.add(step.errorType);
      }
    });
    return Array.from(types);
  }, [scoreResult]);

  const handleBack = () => {
    navigate('/');
  };

  const handleRetry = () => {
    if (levelId) {
      resetGame();
      navigate(`/game/${levelId}`);
    }
  };

  const handleViewReport = () => {
    if (!scoreResult || !level || currentLevelId !== level.id) return;
    const report = generatePracticeReport(scoreResult, level, connections);
    setReport(report);
    navigate(`/report/${scoreResult.attemptId}`);
  };

  const handleExcludeCounterexample = (counterexampleId: string) => {
    console.log('排除反例:', counterexampleId);
  };

  const handleAddCounterexample = (counterexample: Counterexample) => {
    console.log('补录反例:', counterexample);
    addCounterexampleEdit(
      counterexample.id,
      '补录前结论',
      '补录后修正结论'
    );
    setShowAddCounterexample(false);
    setNewCounterexample('');
  };

  const handleSubmitNewCounterexample = () => {
    if (!newCounterexample.trim() || !level) return;
    const counterexample: Counterexample = {
      id: `counter-new-${Date.now()}`,
      content: newCounterexample,
      affectedStepIds: level.conclusionSlots.map((s) => s.id),
      isExcluded: false,
    };
    handleAddCounterexample(counterexample);
  };

  if (!scoreResult || !level) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-slate">评分数据不存在</p>
      </div>
    );
  }

  if (isScoring) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-ivory via-white to-primary/5 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-neutral-ivory hover:border-primary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回关卡
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold font-serif text-neutral-ink">
                {level.title} - 评分结果
              </h1>
              <p className="text-sm text-neutral-slate">
                完成时间：{new Date(scoreResult.completedAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重新练习
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleViewReport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <FileText className="w-4 h-4" />
              查看报告
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-6">
            <ScoreSummary scoreResult={scoreResult} />

            {unexcludedCounterexamples.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-neutral-ink">反例警告</h3>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddCounterexample(!showAddCounterexample)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/20 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    补录反例
                  </motion.button>
                </div>

                {showAddCounterexample && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 rounded-xl bg-white border-2 border-accent-rose/20"
                  >
                    <textarea
                      value={newCounterexample}
                      onChange={(e) => setNewCounterexample(e.target.value)}
                      placeholder="请输入反例内容..."
                      className="w-full p-3 rounded-lg border-2 border-neutral-ivory focus:border-accent-rose focus:outline-none resize-none text-sm"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => setShowAddCounterexample(false)}
                        className="px-4 py-2 rounded-lg text-sm text-neutral-slate hover:bg-neutral-ivory transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSubmitNewCounterexample}
                        className="px-4 py-2 rounded-lg text-sm bg-accent-rose text-white hover:bg-accent-rose/90 transition-colors"
                      >
                        确认补录
                      </button>
                    </div>
                  </motion.div>
                )}

                {unexcludedCounterexamples.map((ce) => (
                  <CounterexampleAlert
                    key={ce.id}
                    counterexample={ce}
                    affectedSteps={ce.affectedStepIds.map((id) => {
                      const slot = level.conclusionSlots.find((s) => s.id === id);
                      return slot ? slot.stepNumber.toString() : id;
                    })}
                    onExclude={() => handleExcludeCounterexample(ce.id)}
                    onAddCounterexample={() => setShowAddCounterexample(true)}
                  />
                ))}
              </div>
            )}

            {errorTypes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-neutral-ink">责任人指引</h3>
                {errorTypes.map((errorType, idx) => (
                  <OwnerGuide
                    key={errorType}
                    errorType={errorType}
                    onAction={() => console.log('执行指引动作:', errorType)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-card p-6 border-2 border-neutral-ivory"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-neutral-ink">步骤评分详情</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-slate">
                  <Hexagon className="w-4 h-4 text-accent-violet" />
                  <span>点击步骤可展开详情</span>
                </div>
              </div>

              <div className="space-y-4">
                {scoreResult.stepScores.map((stepScore, idx) => (
                  <StepScoreItem
                    key={stepScore.stepId}
                    stepScore={stepScore}
                    showDetails={idx === 0}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
