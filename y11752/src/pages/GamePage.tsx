import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Timer } from '@/components/ui/Timer';
import { CaseInfo } from '@/components/game/CaseInfo';
import { MaterialCard } from '@/components/game/MaterialCard';
import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';
import { getCaseById } from '@/data/cases';

export const GamePage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const {
    currentCase,
    selectedMaterials,
    markedRisks,
    timeRemaining,
    isPlaying,
    isPaused,
    startGame,
    selectMaterial,
    markRisk,
    unmarkRisk,
    setTimeRemaining,
    submitGame,
    resetGame
  } = useGameStore();

  const caseData = caseId ? getCaseById(caseId) : undefined;

  const handleTimeUp = useCallback(() => {
    if (currentCase && isPlaying) {
      const record = submitGame();
      navigate(`/report/${record.id}`);
    }
  }, [currentCase, isPlaying, submitGame, navigate]);

  const { start: startTimer, pause: pauseTimer, resume: resumeTimer } = useTimer({
    initialTime: currentCase?.timeLimit || 0,
    onTick: (time) => setTimeRemaining(time),
    onComplete: handleTimeUp,
    autoStart: false
  });

  useEffect(() => {
    if (caseId && caseData) {
      startGame(caseId);
    }
    return () => {
      resetGame();
    };
  }, [caseId, caseData, startGame, resetGame]);

  useEffect(() => {
    if (currentCase && isPlaying && !isPaused) {
      startTimer();
    }
    return () => pauseTimer();
  }, [currentCase, isPlaying, isPaused, startTimer, pauseTimer]);

  useEffect(() => {
    if (isPaused) {
      pauseTimer();
    } else if (isPlaying) {
      resumeTimer();
    }
  }, [isPaused, isPlaying, pauseTimer, resumeTimer]);

  const handleSubmit = () => {
    if (currentCase) {
      const record = submitGame();
      navigate(`/report/${record.id}`);
    }
  };

  const markedCount = Object.keys(markedRisks).length;

  if (!currentCase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回大厅</span>
            </button>

            <Timer
              timeRemaining={timeRemaining}
              totalTime={currentCase.timeLimit}
            />

            <Button onClick={handleSubmit} className="min-w-[140px]">
              <Send className="w-4 h-4 mr-2" />
              提交审核
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <CaseInfo caseData={currentCase} />

        <div className="mt-6 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">📋</span>
              理赔材料审核
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                共 <span className="text-white font-bold">{currentCase.materials.length}</span> 份材料
              </span>
              <span className={markedCount > 0 ? 'text-amber-400' : 'text-slate-400'}>
                已标记 <span className="font-bold">{markedCount}</span> 个风险点
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {currentCase.materials.map((material, index) => (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MaterialCard
                  material={material}
                  isSelected={selectedMaterials.includes(material.id)}
                  markedRisk={markedRisks[material.id] || null}
                  onSelect={() => selectMaterial(material.id)}
                  onMarkRisk={(riskType) => markRisk(material.id, riskType)}
                  onUnmarkRisk={() => unmarkRisk(material.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-medium mb-1">审核提示</p>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• 点击材料卡片查看详细内容</li>
                <li>• 在材料详情中标记风险类型</li>
                <li>• 特别注意：<span className="text-red-400">票据重复</span>、<span className="text-orange-400">保单免责</span>、<span className="text-amber-400">补料超时</span></li>
                <li>• 时间耗尽将自动提交审核结果</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={handleSubmit} className="min-w-[200px]">
            <Send className="w-5 h-5 mr-2" />
            完成审核并提交
          </Button>
        </div>
      </div>
    </div>
  );
};
