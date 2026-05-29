import { useTheaterStore } from '@/store/theaterStore';
import { TheaterScene } from '@/components/three/TheaterScene';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { SeatDetail } from '@/components/ui/SeatDetail';
import { SeatList } from '@/components/ui/SeatList';
import { HistoryPanel } from '@/components/ui/HistoryPanel';
import { PendingIssues } from '@/components/ui/PendingIssues';
import { Sparkles } from 'lucide-react';

function App() {
  const seats = useTheaterStore((state) => state.seats);
  const obstacles = useTheaterStore((state) => state.obstacles);
  const selectedSeat = useTheaterStore((state) => state.selectedSeat);
  const viewMode = useTheaterStore((state) => state.viewMode);
  const showRays = useTheaterStore((state) => state.showRays);
  const detectionRunning = useTheaterStore((state) => state.detectionRunning);

  return (
    <div className="h-screen w-screen bg-theater-darker flex flex-col overflow-hidden">
      <header className="h-14 bg-theater-dark border-b border-gray-700 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles className="text-theater-gold" size={24} />
          <h1 className="text-xl font-display font-bold text-white">
            音乐会座位<span className="text-theater-gold">视线图</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">
            剧院票务管理系统
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-theater-dark border-r border-gray-700 p-4 overflow-y-auto shrink-0">
          <div className="space-y-4">
            <ControlPanel />
            <SeatList />
          </div>
        </aside>

        <main className="flex-1 relative">
          <TheaterScene
            seats={seats}
            obstacles={obstacles}
            selectedSeat={selectedSeat}
            viewMode={viewMode}
            showRays={showRays}
          />
          
          {detectionRunning && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-theater-dark border border-gray-700 rounded-lg p-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-theater-gold border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-white font-medium">正在检测视线...</p>
                <p className="text-gray-500 text-sm mt-1">请稍候</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-theater-success" />
              <span className="text-gray-300">视线正常</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-theater-warning" />
              <span className="text-gray-300">部分受阻</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-theater-red" />
              <span className="text-gray-300">视线受阻</span>
            </div>
          </div>
        </main>

        <aside className="w-80 bg-theater-dark border-l border-gray-700 p-4 overflow-y-auto shrink-0">
          <div className="space-y-4">
            {selectedSeat ? (
              <SeatDetail seat={selectedSeat} />
            ) : (
              <div className="bg-theater-dark border border-gray-700 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">点击座位查看详情</p>
                <p className="text-gray-500 text-xs mt-1">或在左侧列表中选择</p>
              </div>
            )}
            <HistoryPanel />
            <PendingIssues />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
