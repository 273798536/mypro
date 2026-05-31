import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, TrendingUp, BarChart3, Download } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { CorrectionPanel } from '@/components/review/CorrectionPanel';
import { CompareView } from '@/components/review/CompareView';
import { ReviewDetails } from '@/components/review/ReviewDetails';
import { ExportPanel } from '@/components/export/ExportPanel';
import { ScoreReport } from '@/types';
import { cn } from '@/lib/utils';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSessionById, loadSession, currentSession, resetCurrentGame } = useGameStore();
  const [activeTab, setActiveTab] = useState<'correct' | 'compare'>('correct');
  const [originalReport, setOriginalReport] = useState<ScoreReport | undefined>(undefined);
  const [correctionApplied, setCorrectionApplied] = useState(false);

  useEffect(() => {
    if (sessionId) {
      const session = getSessionById(sessionId);
      if (session) {
        loadSession(sessionId);
        if (session.scoreReport && !originalReport) {
          setOriginalReport(JSON.parse(JSON.stringify(session.scoreReport)));
        }
      } else {
        navigate('/');
      }
    }
  }, [sessionId, getSessionById, loadSession, navigate, originalReport]);

  const handleBackHome = () => {
    resetCurrentGame();
    navigate('/');
  };

  const handleCorrectionApplied = () => {
    setCorrectionApplied(true);
    setTimeout(() => setActiveTab('compare'), 500);
  };

  const handleViewReport = () => {
    if (sessionId) {
      navigate(`/report/${sessionId}`);
    }
  };

  if (!currentSession || !currentSession.scoreReport) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0F3460]/20 border-t-[#0F3460] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#2C3E50]/60">加载中...</p>
        </div>
      </div>
    );
  }

  const hasCorrections = currentSession.corrections.length > 0;

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
                <Edit3 size={18} className="text-[#b8860b]" />
              </div>
              <div>
                <h1 className="font-bold text-[#0F3460]">教师评阅</h1>
                <p className="text-xs text-[#2C3E50]/50">
                  {currentSession.playerName} · {new Date(currentSession.startTime).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasCorrections && (
              <span className="px-3 py-1 bg-[#FFD93D]/20 text-[#b8860b] rounded-full text-sm font-medium">
                已修正 {currentSession.corrections.length} 处
              </span>
            )}
            <button
              onClick={handleViewReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0F3460]/10 text-[#0F3460] rounded-xl font-bold hover:bg-[#0F3460]/20 transition-all"
            >
              <BarChart3 size={18} />
              查看报告
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-[#0F3460]/10 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('correct')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200',
              activeTab === 'correct'
                ? 'bg-[#FFD93D] text-[#0F3460] shadow-md'
                : 'text-[#2C3E50]/60 hover:text-[#0F3460] hover:bg-[#0F3460]/5'
            )}
          >
            <Edit3 size={18} />
            手动修正
            {hasCorrections && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center bg-[#0F3460]/20 text-[#0F3460] text-xs font-bold rounded-full">
                {currentSession.corrections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200',
              activeTab === 'compare'
                ? 'bg-[#16C79A] text-white shadow-md'
                : 'text-[#2C3E50]/60 hover:text-[#0F3460] hover:bg-[#0F3460]/5'
            )}
          >
            <TrendingUp size={18} />
            新旧对比
            {correctionApplied && (
              <span className="ml-1 w-2 h-2 bg-[#16C79A] rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {activeTab === 'correct' && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-6">
              <CorrectionPanel
                session={currentSession}
                onCorrectionApplied={handleCorrectionApplied}
              />
              <ReviewDetails session={currentSession} />
            </div>
            <div>
              <ExportPanel session={currentSession} />
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-6">
              <CompareView
                session={currentSession}
                originalReport={originalReport}
              />
              <ReviewDetails session={currentSession} />
            </div>
            <div>
              <ExportPanel session={currentSession} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
