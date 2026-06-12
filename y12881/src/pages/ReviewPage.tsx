import ReviewList from '@/components/ReviewCenter/ReviewList';
import SampleDetail from '@/components/DetailPanel/SampleDetail';
import { useSampleStore } from '@/store/useSampleStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/store/useUISTore';

export default function ReviewPage() {
  const { selectedSampleId } = useSampleStore();
  const { showDetailPanel, toggleDetailPanel } = useUIStore();

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <div className="absolute inset-0 ocean-noise z-0" />
      <div className="flex-1 relative z-10">
        <ReviewList />
      </div>

      {showDetailPanel && selectedSampleId && (
        <div className="relative z-10 h-full p-3 border-l border-ocean-700/50 w-[360px] flex-shrink-0">
          <button
            onClick={toggleDetailPanel}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-20 glass-panel rounded-l-lg px-1 py-3 text-ocean-400 hover:text-cyan-glow"
          >
            <ChevronRight size={18} />
          </button>
          <div className="h-full">
            <SampleDetail />
          </div>
        </div>
      )}

      {(!showDetailPanel || !selectedSampleId) && (
        <button
          onClick={toggleDetailPanel}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 glass-panel rounded-l-lg px-1.5 py-3 text-ocean-300 hover:text-cyan-glow"
        >
          <ChevronLeft size={18} />
        </button>
      )}
    </div>
  );
}
