import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, RotateCcw, Trophy } from 'lucide-react';
import { getLevelById } from '@/data/levels';
import { useGameStore } from '@/store/gameStore';
import { ruleEngine } from '@/engine/ruleEngine';
import { evidenceEngine } from '@/engine/evidenceEngine';
import { DecisionType, RuleViolation, Conflict } from '@/types';
import TruckCard from '@/components/TruckCard';
import GateArea from '@/components/GateArea';
import RuleFeedback from '@/components/RuleFeedback';
import ConflictAlert from '@/components/ConflictAlert';
import FailureModal from '@/components/FailureModal';
import EvidencePanel from '@/components/EvidencePanel';

export default function GameBoard() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  
  const {
    session,
    currentLevel,
    currentTruckIndex,
    trucks,
    yardVersion,
    decisions,
    steps,
    feedback,
    isFailureModalOpen,
    failureReason,
    score,
    isGameOver,
    initGame,
    processDecision,
    updateTruckRemark,
    updateYardVersion,
    setShiftOvertime,
    setFeedback,
    openFailureModal,
    closeFailureModal,
    endGame,
    resetGame,
  } = useGameStore();

  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [currentConflict, setCurrentConflict] = useState<Conflict | null>(null);
  const [eventMessage, setEventMessage] = useState<string | null>(null);

  const currentTruck = trucks[currentTruckIndex] || null;
  const remainingTrucks = trucks.slice(currentTruckIndex);
  const processedTrucks = trucks.slice(0, currentTruckIndex);

  useEffect(() => {
    if (levelId) {
      const level = getLevelById(levelId);
      if (level) {
        initGame(level);
      }
    }
  }, [levelId, initGame]);

  useEffect(() => {
    if (!currentLevel || !session) return;

    const eventsToTrigger = currentLevel.events.filter(
      e => e.triggerStep === steps.length + 1
    );

    eventsToTrigger.forEach(event => {
      setTimeout(() => {
        setEventMessage(event.message);
        
        switch (event.type) {
          case 'remark_change':
            if (event.truckId) {
              const truck = trucks.find(t => t.id === event.truckId);
              if (truck) {
                const oldRemark = truck.currentRemark;
                const newRemark = event.data.newRemark as string;
                updateTruckRemark(event.truckId, newRemark);
                const updatedTruck = { ...truck, currentRemark: newRemark, currentVersion: truck.currentVersion + 1 };
                evidenceEngine.recordVersionChange(session.id, updatedTruck, oldRemark, newRemark);
              }
            }
            break;
          case 'yard_update':
            const newVersion = event.data.newVersion as number;
            evidenceEngine.recordYardUpdate(session.id, yardVersion, newVersion, event.message);
            updateYardVersion(newVersion);
            break;
          case 'shift_overtime':
            if (event.truckId) {
              const overtimeMinutes = event.data.overtimeMinutes as number;
              const truck = trucks.find(t => t.id === event.truckId);
              setShiftOvertime(event.truckId, overtimeMinutes);
              if (truck) {
                evidenceEngine.recordShiftOvertime(session.id, truck, overtimeMinutes);
              }
            }
            break;
          case 'appointment_overdue':
            if (event.truckId) {
              const overdueMinutes = event.data.overdueMinutes as number;
              const truck = trucks.find(t => t.id === event.truckId);
              if (truck) {
                evidenceEngine.recordAppointmentOverdue(session.id, truck, overdueMinutes);
              }
            }
            break;
        }
      }, 500);
    });
  }, [steps.length, currentLevel, session, trucks, yardVersion, updateTruckRemark, updateYardVersion, setShiftOvertime]);

  useEffect(() => {
    if (eventMessage) {
      const timer = setTimeout(() => setEventMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [eventMessage]);

  const handleDecision = useCallback((decision: DecisionType) => {
    if (!currentTruck || !session) return;

    const result = ruleEngine.validateDecision(currentTruck, decision, yardVersion);
    
    evidenceEngine.recordGateDecision(session.id, {
      id: `decision-${Date.now()}`,
      truckId: currentTruck.id,
      decisionType: decision,
      gateNo: 'G1',
      timestamp: new Date(),
      operator: '学员',
      conclusion: ruleEngine.getDecisionLabel(decision),
    }, currentTruck);

    if (!result.isValid) {
      setViolations(result.violations);
      setConflicts(result.conflicts);
      openFailureModal(result.violations[0]?.description || '判定错误');
      
      result.conflicts.forEach(c => {
        setCurrentConflict(c);
        evidenceEngine.recordGateConflict(
          session.id,
          currentTruck,
          {
            id: `decision-${Date.now()}`,
            truckId: currentTruck.id,
            decisionType: decision,
            gateNo: 'G1',
            timestamp: new Date(),
            operator: '学员',
            conclusion: ruleEngine.getDecisionLabel(decision),
          },
          ruleEngine.getDecisionLabel(currentTruck.expectedDecision),
          `司机班次：${currentTruck.shiftRecord.shiftType}，${currentTruck.shiftRecord.isOvertime ? '已超时' : '正常'}`
        );
      });

      setFeedback({
        type: 'error',
        message: '判定错误！',
        details: result.violations[0]?.description,
      });
    } else {
      setFeedback({
        type: 'success',
        message: '判定正确！',
      });
      processDecision(currentTruck.id, decision);
    }

    setTimeout(() => setFeedback(null), 2000);
  }, [currentTruck, session, yardVersion, openFailureModal, setFeedback, processDecision]);

  useEffect(() => {
    if (currentTruckIndex >= trucks.length && trucks.length > 0 && !isGameOver) {
      endGame();
    }
  }, [currentTruckIndex, trucks.length, isGameOver, endGame]);

  const handleGoToReview = () => {
    if (session) {
      navigate(`/review/${session.id}`);
    }
  };

  const handleViewEvidence = () => {
    setShowEvidencePanel(true);
    closeFailureModal();
  };

  if (!currentLevel) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-port-dark text-white py-4 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">{currentLevel.name}</h1>
              <p className="text-sm text-gray-400">{currentLevel.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-gray-400">得分</div>
              <div className="text-2xl font-bold text-port-yellow">{score}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">进度</div>
              <div className="text-lg font-bold">{currentTruckIndex} / {trucks.length}</div>
            </div>
            <button
              onClick={() => setShowEvidencePanel(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="查看证据链"
            >
              <FileText size={20} />
            </button>
            <button
              onClick={resetGame}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="重新开始"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {eventMessage && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-port-blue text-white px-6 py-3 rounded-lg shadow-lg font-medium"
          >
            {eventMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6">
        <AnimatePresence>
          {isGameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-port-green to-port-blue text-white rounded-xl p-8 mb-6 text-center"
            >
              <Trophy size={64} className="mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">关卡完成！</h2>
              <p className="text-xl mb-4">最终得分: {score} 分</p>
              <p className="text-white/80 mb-6">
                处理 {decisions.length} 辆集卡，{conflicts.length} 个冲突
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={resetGame}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                >
                  重新挑战
                </button>
                <button
                  onClick={handleGoToReview}
                  className="px-6 py-3 bg-white text-port-blue rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                  查看复盘
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
              <h3 className="font-bold text-lg mb-4 text-gray-700">
                待处理队列 ({remainingTrucks.length} 辆)
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {remainingTrucks.map((truck, index) => (
                  <div key={truck.id} className="flex-shrink-0 w-64">
                    <TruckCard
                      truck={truck}
                      isActive={index === 0}
                      showDecision={
                        processedTrucks.includes(truck)
                          ? decisions.find(d => d.truckId === truck.id)?.decisionType
                          : undefined
                      }
                    />
                  </div>
                ))}
                {remainingTrucks.length === 0 && (
                  <div className="text-gray-400 text-center py-8 w-full">
                    所有集卡已处理完毕
                  </div>
                )}
              </div>
            </div>

            {processedTrucks.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="font-bold text-lg mb-4 text-gray-500">
                  已处理 ({processedTrucks.length} 辆)
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 opacity-70">
                  {processedTrucks.map(truck => (
                    <div key={truck.id} className="flex-shrink-0 w-56">
                      <TruckCard
                        truck={truck}
                        showDecision={decisions.find(d => d.truckId === truck.id)?.decisionType}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <GateArea
              currentTruck={!isGameOver ? currentTruck : null}
              yardVersion={yardVersion}
              onDecision={handleDecision}
              disabled={isGameOver}
            />
          </div>
        </div>
      </div>

      <RuleFeedback feedback={feedback} />

      <AnimatePresence>
        {currentConflict && (
          <ConflictAlert
            conflict={currentConflict}
            onClose={() => setCurrentConflict(null)}
            onViewEvidence={() => setShowEvidencePanel(true)}
          />
        )}
      </AnimatePresence>

      <FailureModal
        isOpen={isFailureModalOpen}
        onClose={closeFailureModal}
        reason={failureReason || ''}
        violations={violations}
        conflicts={conflicts}
        onViewEvidence={handleViewEvidence}
      />

      <AnimatePresence>
        {showEvidencePanel && session && (
          <EvidencePanel
            evidences={evidenceEngine.getEvidenceChain(session.id)}
            selectedEvidence={null}
            onSelectEvidence={() => {}}
            onClose={() => setShowEvidencePanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
