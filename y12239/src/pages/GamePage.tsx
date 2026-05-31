import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Home, Compass } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { TerrainCanvas } from '@/components/game/TerrainCanvas';
import { Toolbar } from '@/components/game/Toolbar';
import { CalculationPanel } from '@/components/game/CalculationPanel';
import { TaskBanner } from '@/components/game/TaskBanner';
import { cn } from '@/lib/utils';

export default function GamePage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSessionById, loadSession, currentSession, submitGame, resetCurrentGame } = useGameStore();
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    if (sessionId) {
      const session = getSessionById(sessionId);
      if (session) {
        loadSession(sessionId);
      } else {
        navigate('/');
      }
    }
  }, [sessionId, getSessionById, loadSession, navigate]);

  const handleSubmit = () => {
    const report = submitGame();
    if (report) {
      navigate(`/report/${sessionId}`);
    }
  };

  const handleBackHome = () => {
    resetCurrentGame();
    navigate('/');
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0F3460]/20 border-t-[#0F3460] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#2C3E50]/60">加载中...</p>
        </div>
      </div>
    );
  }

  const canSubmit = currentSession.surveyPoints.filter((p) => p.isTarget).every((p) => p.measured);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-white border-b border-[#0F3460]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackHome}
              className="flex items-center gap-2 px-3 py-2 text-[#2C3E50]/60 hover:text-[#0F3460] hover:bg-[#0F3460]/5 rounded-lg transition-all"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">返回首页</span>
            </button>
            <div className="h-6 w-px bg-[#0F3460]/10" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#FFD93D]/20 rounded-lg">
                <Compass size={18} className="text-[#FFD93D]" />
              </div>
              <div>
                <h1 className="font-bold text-[#0F3460]">几何测绘探险</h1>
                <p className="text-xs text-[#2C3E50]/50">
                  玩家: {currentSession.playerName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canSubmit && (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#16C79A] to-[#12a884] text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Send size={18} />
                提交测绘结果
              </button>
            )}
            {!canSubmit && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#0F3460]/10 text-[#0F3460]/50 rounded-xl">
                <Home size={16} />
                <span className="text-sm font-medium">完成所有目标点后可提交</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <TaskBanner />

        <div className="grid lg:grid-cols-[240px_1fr_320px] gap-6 mt-6">
          <div>
            <Toolbar onSubmit={handleSubmit} canSubmit={canSubmit} />
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-[#0F3460]/10 p-4 flex items-center justify-center overflow-hidden">
            <TerrainCanvas />
          </div>

          <div>
            <CalculationPanel />
          </div>
        </div>
      </main>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in">
            <h3 className="text-xl font-bold text-[#0F3460] mb-2">确认提交？</h3>
            <p className="text-[#2C3E50]/60 mb-6">
              提交后将生成详细的成绩报告，包含每项操作的评分和错误分析。
              提交后不可继续修改。
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-3 border border-[#0F3460]/20 text-[#2C3E50] rounded-xl font-medium hover:bg-[#0F3460]/5 transition-all"
              >
                继续测绘
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#16C79A] to-[#12a884] text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
