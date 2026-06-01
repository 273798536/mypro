import { useState } from 'react';
import { Box } from 'lucide-react';
import { Scene3D } from '@/components/Scene3D';
import { FunctionEditor } from '@/components/FunctionEditor';
import { ControlPanel } from '@/components/ControlPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { DetailPanel } from '@/components/DetailPanel';

export default function Home() {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  return (
    <div className="w-full h-screen flex flex-col bg-dark-900">
      <header className="h-14 px-6 flex items-center justify-between border-b border-gray-700/50 bg-dark-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <Box className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white glow-text">数学旋转体展台</h1>
            <p className="text-xs text-gray-400">Solid of Revolution Visualizer</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              showHistory
                ? 'bg-primary-500 text-dark-900'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            {showHistory ? '隐藏历史' : '显示历史'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 p-4 space-y-4 overflow-y-auto border-r border-gray-700/50 flex-shrink-0">
          <FunctionEditor />
          <ControlPanel />
        </div>

        <div className="flex-1 relative">
          <Scene3D onReady={(glCanvas) => setCanvas(glCanvas)} />
        </div>

        <div className={`flex-shrink-0 border-l border-gray-700/50 transition-all duration-300 ${showHistory ? 'w-96' : 'w-72'}`}>
          <div className={`h-full flex ${showHistory ? 'flex-col' : ''}`}>
            <div className={`p-4 ${showHistory ? 'h-1/2 border-b border-gray-700/50' : 'h-full'}`}>
              <DetailPanel canvas={canvas} />
            </div>
            {showHistory && (
              <div className="h-1/2 p-4">
                <HistoryPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
