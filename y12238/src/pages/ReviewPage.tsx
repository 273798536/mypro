import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useReviewStore } from '@/store/reviewStore';
import { evidenceEngine } from '@/engine/evidenceEngine';
import TruckCard from '@/components/TruckCard';
import Timeline from '@/components/Timeline';
import EvidencePanel from '@/components/EvidencePanel';
import ExportButton from '@/components/ExportButton';

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const { session } = useGameStore();
  const {
    replayStep,
    isPlaying,
    playSpeed,
    selectedEvidence,
    steps,
    evidences,
    loadSession,
    play,
    pause,
    stepForward,
    stepBackward,
    seekTo,
    setPlaySpeed,
    selectEvidence,
  } = useReviewStore();

  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const currentSession = session;
    if (currentSession) {
      const sessionEvidences = evidenceEngine.getEvidenceChain(currentSession.id);
      loadSession(currentSession, sessionEvidences);
      
      console.log('[复盘加载] 对局摘要:');
      console.log(`  关卡: ${currentSession.levelName}`);
      console.log(`  得分: ${currentSession.score} 分`);
      console.log(`  总步数: ${currentSession.totalSteps}`);
      console.log(`  冲突数: ${currentSession.conflictCount}`);
      console.log(`  证据数: ${sessionEvidences.length} 条`);
    }
  }, [sessionId, session, loadSession]);

  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / playSpeed;
      playIntervalRef.current = setInterval(() => {
        stepForward();
      }, interval);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playSpeed, stepForward]);

  const currentStep = steps[replayStep];
  const currentTrucks = currentStep?.stateSnapshot?.trucks || [];
  const currentYardVersion = currentStep?.stateSnapshot?.yardVersion || 1;

  const handleViewEvidence = () => {
    setShowEvidencePanel(true);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">暂无对局数据</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-port-blue text-white rounded-lg"
          >
            返回选择关卡
          </button>
        </div>
      </div>
    );
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
              <h1 className="text-xl font-bold">复盘 - {session.levelName}</h1>
              <p className="text-sm text-gray-400">
                得分: {session.score} 分 | 步数: {steps.length} | 冲突: {session.conflictCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleViewEvidence}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FileText size={18} />
              证据链
            </button>
            <ExportButton session={session} evidences={evidences} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-700">
                  当前状态 - 第 {replayStep + 1} 步
                </h3>
                <div className="text-sm text-gray-500">
                  堆场版本: v{currentYardVersion}
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {currentTrucks.map((truck, index) => (
                  <motion.div
                    key={truck.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex-shrink-0 w-64"
                  >
                    <TruckCard truck={truck} isActive={index === 0} />
                  </motion.div>
                ))}
                {currentTrucks.length === 0 && (
                  <div className="text-gray-400 text-center py-8 w-full">
                    所有集卡已处理完毕
                  </div>
                )}
              </div>
            </div>

            {currentStep && (
              <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <h3 className="font-bold text-lg text-gray-700 mb-4">操作详情</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">操作类型</div>
                    <div className="font-medium">
                      {currentStep.actionType === 'decision' ? '闸口判定' : '系统事件'}
                    </div>
                  </div>
                  {currentStep.decision && (
                    <div>
                      <div className="text-sm text-gray-500">判定结果</div>
                      <div className={`font-medium ${
                        currentStep.decision === 'release' ? 'text-port-green' :
                        currentStep.decision === 'detain' ? 'text-port-red' :
                        'text-port-yellow'
                      }`}>
                        {currentStep.decision === 'release' ? '放行' :
                         currentStep.decision === 'detain' ? '暂扣' : '转场'}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-500">是否有效</div>
                    <div className={`font-medium ${currentStep.isValid ? 'text-port-green' : 'text-port-red'}`}>
                      {currentStep.isValid ? '有效' : '无效'}
                    </div>
                  </div>
                  {currentStep.conflicts.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-500">冲突数量</div>
                      <div className="font-medium text-port-red">
                        {currentStep.conflicts.length} 个
                      </div>
                    </div>
                  )}
                </div>

                {currentStep.conflicts.length > 0 && (
                  <div className="mt-4 p-4 bg-port-red/10 rounded-lg border border-port-red/20">
                    <div className="font-medium text-port-red mb-2">冲突记录</div>
                    <ul className="space-y-2">
                      {currentStep.conflicts.map((conflict, i) => (
                        <li key={i} className="text-sm text-gray-700">
                          • {conflict.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="font-bold text-lg text-gray-700 mb-4">对局统计</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">最终得分</span>
                  <span className="text-2xl font-bold text-port-yellow">{session.score}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">总步数</span>
                  <span className="font-bold">{steps.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">正确判定</span>
                  <span className="font-bold text-port-green">
                    {steps.filter(s => s.isValid).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">冲突数</span>
                  <span className="font-bold text-port-red">
                    {steps.reduce((acc, s) => acc + s.conflicts.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">证据数</span>
                  <span className="font-bold text-port-blue">{evidences.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">用时</span>
                  <span className="font-mono">
                    {Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)} 秒
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Timeline
            steps={steps}
            currentStep={replayStep}
            isPlaying={isPlaying}
            playSpeed={playSpeed}
            onPlay={play}
            onPause={pause}
            onStepBack={stepBackward}
            onStepForward={stepForward}
            onSeek={seekTo}
            onChangeSpeed={setPlaySpeed}
          />
        </div>
      </div>

      <AnimatePresence>
        {showEvidencePanel && (
          <EvidencePanel
            evidences={evidences}
            selectedEvidence={selectedEvidence}
            onSelectEvidence={selectEvidence}
            onClose={() => setShowEvidencePanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
