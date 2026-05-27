import { MineScene } from '@/components/Scene3D/MineScene';
import { RecordList } from '@/components/Sidebar/RecordList';
import { FilterPanel } from '@/components/Sidebar/FilterPanel';
import { SourceInfo } from '@/components/Sidebar/SourceInfo';
import { AlertList } from '@/components/AlertPanel/AlertList';
import { ObjectTooltip } from '@/components/InfoTooltip/ObjectTooltip';
import { ControlBar } from '@/components/BottomBar/ControlBar';
import { useMineStore } from '@/store/useMineStore';
import { Mountain, AlertTriangle } from 'lucide-react';

export default function Home() {
  const selectedRecord = useMineStore((state) => state.getSelectedRecord());

  const statusColors = {
    normal: 'bg-green-500',
    warning: 'bg-orange-500',
    error: 'bg-red-500',
  };

  const statusLabels = {
    normal: '正常',
    warning: '警告',
    error: '错误',
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 overflow-hidden">
      <header className="h-14 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Mountain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">矿井通风逃生图</h1>
            <p className="text-xs text-gray-400">Mine Ventilation Escape System</p>
          </div>
        </div>

        {selectedRecord && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white font-medium">{selectedRecord.name}</p>
              <p className="text-xs text-gray-400">{selectedRecord.date}</p>
            </div>
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-medium text-white flex items-center gap-1.5 ${statusColors[selectedRecord.status]}`}
            >
              {selectedRecord.status !== 'normal' && (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {statusLabels[selectedRecord.status]}
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-gray-900/50 border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <FilterPanel />
            <div className="h-px bg-gray-800" />
            <RecordList />
            <div className="h-px bg-gray-800" />
            <SourceInfo />
          </div>
        </aside>

        <main className="flex-1 relative">
          <div id="scene-container" className="w-full h-full">
            <MineScene />
          </div>

          <ObjectTooltip />

          <ControlBar />
        </main>

        <aside className="w-80 bg-gray-900/50 border-l border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 overflow-y-auto flex-1">
            <AlertList />
          </div>
        </aside>
      </div>
    </div>
  );
}
