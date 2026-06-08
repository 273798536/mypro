import { Navigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import ResultHeader from '@/components/result/ResultHeader';
import CompareView from '@/components/result/CompareView';
import AuditTimeline from '@/components/result/AuditTimeline';
import ReplayPlayer from '@/components/result/ReplayPlayer';

export default function ResultPage() {
  const status = useGameStore((s) => s.status);

  if (status !== 'finished') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-cyber bg-space-deep p-4">
      <div className="max-w-[1400px] mx-auto">
        <ResultHeader />

        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="col-span-3">
            <ReplayPlayer />
          </div>
          <div className="col-span-2 flex flex-col gap-4">
            <CompareView />
          </div>
        </div>

        <AuditTimeline />

        <div className="text-center text-[10px] font-mono text-cyan-300/30 py-4">
          立体几何截面课堂 · 运维训练台 · 所有操作记录均已保存至本地审计日志
        </div>
      </div>
    </div>
  );
}
