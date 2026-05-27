import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MigrationMatrix3D from '../components/ThreeD/MigrationMatrix3D';
import TopToolbar from '../components/Toolbar/TopToolbar';
import TimelinePlayer from '../components/ControlPanel/TimelinePlayer';
import FilterPanel from '../components/FilterPanel/FilterPanel';
import BottomInfoBar from '../components/InfoBar/BottomInfoBar';
import FloatingDetail from '../components/DetailPanel/FloatingDetail';
import { useAppStore, useFilteredRecords } from '../store/useAppStore';

export default function Home() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const filteredRecords = useFilteredRecords();
  const { selectedCube } = useAppStore();

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <TopToolbar />

      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`${
            leftPanelOpen ? 'w-64' : 'w-0'
          } transition-all duration-300 overflow-hidden flex-shrink-0`}
        >
          <div className="w-64 h-full p-4 pr-0">
            <TimelinePlayer />
          </div>
        </div>

        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 p-1.5 rounded-r-lg border border-l-0 border-slate-700 transition-colors"
          style={{ left: leftPanelOpen ? '256px' : '0' }}
        >
          {leftPanelOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="flex-1 relative">
          <MigrationMatrix3D />
          <FloatingDetail />

          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-slate-400">向上迁徙</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-slate-400">维持不变</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-slate-400">向下迁徙</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-yellow-500 animate-pulse"></div>
                <span className="text-slate-400">异常数据</span>
              </div>
            </div>
          </div>

          {filteredRecords.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700 text-center">
              <p className="text-xl text-slate-400 mb-2">无数据显示</p>
              <p className="text-sm text-slate-500">请调整筛选条件以查看数据</p>
            </div>
          )}
        </div>

        <div
          className={`${
            rightPanelOpen ? 'w-72' : 'w-0'
          } transition-all duration-300 overflow-hidden flex-shrink-0`}
        >
          <div className="w-72 h-full p-4 pl-0">
            <FilterPanel />
          </div>
        </div>

        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 p-1.5 rounded-l-lg border border-r-0 border-slate-700 transition-colors"
          style={{ right: rightPanelOpen ? '288px' : '0' }}
        >
          {rightPanelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <BottomInfoBar />
    </div>
  );
}
