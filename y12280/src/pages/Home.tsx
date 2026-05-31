import { useState, useCallback } from 'react';
import { MagneticScene } from '@/scenes/MagneticScene';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { MagnetList } from '@/components/Sidebar/MagnetList';
import { SettingsPanel } from '@/components/Sidebar/SettingsPanel';
import { MagnetDetails } from '@/components/InfoPanel/MagnetDetails';
import { WarningList } from '@/components/InfoPanel/WarningList';
import { HelpModal } from '@/components/Modal/HelpModal';

export default function Home() {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleCanvasReady = useCallback((canvasEl: HTMLCanvasElement) => {
    setCanvas(canvasEl);
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden">
      <Toolbar canvas={canvas} onShowHelp={() => setShowHelp(true)} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-gray-900/50 border-r border-gray-700/50 p-4 overflow-y-auto">
          <div className="space-y-6">
            <MagnetList />
            <div className="border-t border-gray-700/50 pt-4">
              <SettingsPanel />
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <MagneticScene onCanvasReady={handleCanvasReady} />
          
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
            <p className="text-xs text-gray-400">
              <span className="text-cyan-400">提示:</span> 拖拽磁体移动位置 | 滚轮缩放 | 右键平移
            </p>
          </div>
        </div>

        <div className="w-72 bg-gray-900/50 border-l border-gray-700/50 p-4 overflow-y-auto">
          <div className="space-y-4">
            <MagnetDetails />
            <WarningList />
          </div>
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
