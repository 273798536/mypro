import { DetailPanel } from '../panels/DetailPanel';
import { CorrectionTimeline } from '../panels/CorrectionTimeline';

export function AppDetail() {
  return (
    <aside className="w-80 flex-shrink-0 border-l border-white/10 bg-[#0c1826] overflow-y-auto">
      <div className="p-4 space-y-3">
        <DetailPanel />
        <CorrectionTimeline />
      </div>
    </aside>
  );
}