import { useStore } from '@/store';
import Toolbar from '@/components/Toolbar';
import MatrixInput from '@/components/MatrixInput';
import FormulaCard from '@/components/FormulaCard';
import RankResultPanel from '@/components/RankResultPanel';
import AnomalyBar from '@/components/AnomalyBar';
import SourceTrace from '@/components/SourceTrace';
import StudentSummary from '@/components/StudentSummary';

export default function Home() {
  const viewMode = useStore(s => s.viewMode);

  if (viewMode === 'student') {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <StudentSummary />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-ink-50/70 border-b border-ink-100">
        <div className="max-w-[1400px] mx-auto px-6 py-3.5">
          <Toolbar />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 space-y-5">
            <MatrixInput />
            <AnomalyBar />
            <SourceTrace />
          </div>

          <div className="xl:col-span-5 space-y-5">
            <div className="sticky top-24 space-y-5">
              <FormulaCard />
              <RankResultPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
