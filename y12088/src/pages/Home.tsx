import { Scene3D } from '../components/Scene3D';
import { ControlPanel } from '../components/ControlPanel';
import { DetectionPanel } from '../components/DetectionPanel';
import { Timeline } from '../components/Timeline';
import { ReportModal } from '../components/Report';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 overflow-hidden">
      <header className="h-14 bg-gray-900 border-b border-gray-700 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white">港口堆场吊装沙盘</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="hidden sm:inline">拖拽3D场景可旋转视角</span>
          <span className="hidden sm:inline">|</span>
          <span>滚轮可缩放</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />

        <main className="flex-1 relative">
          <Scene3D />
        </main>

        <DetectionPanel />
      </div>

      <Timeline />

      <ReportModal />
    </div>
  );
}
