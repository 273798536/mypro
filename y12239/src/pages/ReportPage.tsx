import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Compass, Edit3, Download, BarChart3 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { ScoreCards } from '@/components/report/ScoreCards';
import { ErrorClassification } from '@/components/report/ErrorClassification';
import { OperationTimeline } from '@/components/report/OperationTimeline';
import { ReviewDetails } from '@/components/review/ReviewDetails';
import { ExportPanel } from '@/components/export/ExportPanel';
import { cn } from '@/lib/utils';

export default function ReportPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSessionById, loadSession, currentSession, highlightOperationId, setHighlightOperation, resetCurrentGame } = useGameStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');

  useEffect(() => {
    if (sessionId) {
      const session = getSessionById(sessionId);
      if (session) {
        loadSession(sessionId);
      } else {
        navigate('/');
      }
    }

    return () => {
      setHighlightOperation(null);
    };
  }, [sessionId, getSessionById, loadSession, navigate, setHighlightOperation]);

  const handleBackHome = () => {
    resetCurrentGame();
    navigate('/');
  };

  const handleReview = () => {
    if (sessionId) {
      navigate(`/review/${sessionId}`);
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

  const report = currentSession.scoreReport;
  const hasErrors = report.scoreItems.some((item) => item.errors.length > 0);

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
              <div className="p-1.5 bg-[#16C79A]/20 rounded-lg">
                <BarChart3 size={18} className="text-[#16C79A]" />
              </div>
              <div>
                <h1 className="font-bold text-[#0F3460]">成绩报告</h1>
                <p className="text-xs text-[#2C3E50]/50">
                  {currentSession.playerName} · {new Date(currentSession.startTime).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReview}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFD93D] to-[#e6c236] text-[#0F3460] rounded-xl font-bold hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Edit3 size={18} />
              教师评阅
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-[#0F3460]/10 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200',
              activeTab === 'overview'
                ? 'bg-[#0F3460] text-white shadow-md'
                : 'text-[#2C3E50]/60 hover:text-[#0F3460] hover:bg-[#0F3460]/5'
            )}
          >
            <BarChart3 size={18} />
            总览
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200',
              activeTab === 'details'
                ? 'bg-[#0F3460] text-white shadow-md'
                : 'text-[#2C3E50]/60 hover:text-[#0F3460] hover:bg-[#0F3460]/5'
            )}
          >
            <Download size={18} />
            复核详情与导出
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ScoreCards report={report} />

            {hasErrors && (
              <ErrorClassification
                report={report}
                onOperationClick={(opId) => setHighlightOperation(opId)}
              />
            )}

            <OperationTimeline
              session={currentSession}
              highlightOperationId={highlightOperationId}
              onOperationClick={(opId) => setHighlightOperation(opId)}
            />
          </div>
        )}

        {activeTab === 'details' && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-6">
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
