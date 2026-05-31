import { useViewStore } from '@/stores/useViewStore';
import { useCorrectionStore } from '@/stores/useCorrectionStore';
import Toolbar from '@/components/Toolbar';
import AnomalyPanel from '@/components/AnomalyPanel';
import SeatMap2D from '@/components/SeatMap2D';
import SoundField3D from '@/components/SoundField3D';
import CorrectionPanel from '@/components/CorrectionPanel';

export default function Home() {
  const viewMode = useViewStore((s) => s.viewMode);
  const anomalyPanelOpen = useViewStore((s) => s.anomalyPanelOpen);
  const correctionPanelOpen = useViewStore((s) => s.correctionPanelOpen);
  const isComparing = useCorrectionStore((s) => s.isComparing);

  if (isComparing) {
    return (
      <div className="h-screen w-screen bg-[#0A1628] flex flex-col overflow-hidden">
        <Toolbar />
        <div className="flex-1 min-h-0">
          <CorrectionPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0A1628] flex flex-col overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        {anomalyPanelOpen && <AnomalyPanel />}

        <div className="flex-1 min-w-0 p-2">
          {viewMode === '2d' ? <SeatMap2D /> : <SoundField3D />}
        </div>

        {correctionPanelOpen && <CorrectionPanel />}
      </div>
    </div>
  );
}
