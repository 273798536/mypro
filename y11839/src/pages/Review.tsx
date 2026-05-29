import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import ScoreCard from '@/components/ScoreCard';
import Timeline from '@/components/Timeline';
import EventSummary from '@/components/EventSummary';
import ReportView from '@/components/ReportView';

export default function Review() {
  const navigate = useNavigate();
  const testResult = useGameStore((s) => s.testResult);
  const initGame = useGameStore((s) => s.initGame);

  const handleRestart = () => {
    initGame();
    navigate('/build');
  };

  if (!testResult) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0A1628] text-white">
        <div className="text-center">
          <p className="text-[#7EB8DA] mb-4">尚未完成载荷测试</p>
          <button
            onClick={() => navigate('/build')}
            className="px-4 py-2 rounded-lg bg-[#1B3A5C] text-[#7EB8DA] hover:bg-[#2A5A8C] transition-all"
          >
            返回搭建
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A1628] text-white overflow-hidden">
      <div className="h-12 bg-[#0D1F3C] border-b border-[#1F4A6E] flex items-center px-4 gap-4 shrink-0">
        <button
          onClick={() => navigate('/build')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#4A7A9A] hover:text-[#7EB8DA] hover:bg-[#1B3A5C]/50 transition-all"
        >
          <ArrowLeft size={14} />
          返回
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm text-[#7EB8DA] font-semibold">回看与报告</span>
        </div>
        <button
          onClick={handleRestart}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1B3A5C] text-[#7EB8DA] text-xs hover:bg-[#2A5A8C] transition-all"
        >
          <RotateCcw size={14} />
          重新开始
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-[#0D1F3C] border-r border-[#1F4A6E] overflow-y-auto p-4">
          <EventSummary />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <ScoreCard testResult={testResult} />

            <div className="bg-[#0D1F3C] border border-[#1F4A6E] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#7EB8DA] mb-3">操作时间线</h3>
              <Timeline />
            </div>

            <ReportView />
          </div>
        </div>
      </div>
    </div>
  );
}
