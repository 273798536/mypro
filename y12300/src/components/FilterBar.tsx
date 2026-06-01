import { Flame, ChevronLeft, ChevronRight, Camera, FileText } from 'lucide-react';
import { floors } from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function FilterBar() {
  const selectedFloor = useMuseumStore((s) => s.selectedFloor);
  const setSelectedFloor = useMuseumStore((s) => s.setSelectedFloor);
  const selectedTimeRange = useMuseumStore((s) => s.selectedTimeRange);
  const setSelectedTimeRange = useMuseumStore((s) => s.setSelectedTimeRange);
  const setShowReportModal = useMuseumStore((s) => s.setShowReportModal);

  const shiftTime = (delta: number) => {
    const [start, end] = selectedTimeRange;
    const newStart = Math.max(9 * 3600, Math.min(17 * 3600 - (end - start), start + delta));
    const newEnd = newStart + (end - start);
    if (newEnd <= 17 * 3600) {
      setSelectedTimeRange([newStart, newEnd]);
    }
  };

  const handleScreenshot = () => {
    const canvas = document.getElementById('scene3d-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `museum-heatmap-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex items-center justify-between px-4 h-12 bg-[#0F1923]/80 backdrop-blur-xl border-b border-white/5 select-none">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-[#FF5722]" />
        <span className="text-white font-bold text-sm tracking-wide">博物馆客流热区模型</span>
      </div>

      <div className="flex items-center gap-1">
        {floors.map((floor) => (
          <button
            key={floor.id}
            onClick={() => setSelectedFloor(floor.id)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedFloor === floor.id
                ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30'
                : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
            }`}
          >
            {floor.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-white/70 text-xs">
          <button onClick={() => shiftTime(-3600)} className="p-1 hover:bg-white/10 rounded">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[90px] text-center font-mono">
            {formatTime(selectedTimeRange[0])} - {formatTime(selectedTimeRange[1])}
          </span>
          <button onClick={() => shiftTime(3600)} className="p-1 hover:bg-white/10 rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button onClick={handleScreenshot} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors">
          <Camera className="w-4 h-4" />
        </button>
        <button onClick={() => setShowReportModal(true)} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors">
          <FileText className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
