import { useAppStore } from '../store/useAppStore';
import { ReviewTimeline } from '../components/ReviewTimeline';

export default function ReviewCenter() {
  const { currentBatch, reviewRounds } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">统一复核中心</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {currentBatch.name} · 潮汐表、气象预报、禁航区越界整合复核
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <ReviewTimeline rounds={reviewRounds} />
      </main>
    </div>
  );
}
