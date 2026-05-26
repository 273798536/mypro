import { useEffect } from 'react';
import { Camera, Info } from 'lucide-react';
import RoomScene from './components/three/RoomScene';
import LeftPanel from './components/panels/LeftPanel';
import RightPanel from './components/panels/RightPanel';
import { useStore } from './store/useStore';

function App() {
  const validateState = useStore((state) => state.validateState);
  const room = useStore((state) => state.room);
  const soundSource = useStore((state) => state.soundSource);

  useEffect(() => {
    validateState();
  }, [validateState]);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `acoustic-studio-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-dark-950">
      <header className="h-14 bg-dark-900 border-b border-dark-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="font-display text-sm font-bold">AS</span>
          </div>
          <div>
            <h1 className="font-display text-lg text-primary-400">声学驻波房间模型</h1>
            <p className="text-xs text-gray-500">Acoustic Studio Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
            <span>
              房间: <span className="text-primary-400 font-mono">{room.width}×{room.height}×{room.depth}m</span>
            </span>
            <span>
              频率: <span className="text-primary-400 font-mono">{soundSource.frequency}Hz</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScreenshot}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 
                rounded text-sm transition-colors"
              title="导出截图"
            >
              <Camera size={16} />
              <span className="hidden sm:inline">截图</span>
            </button>
            <button
              className="p-1.5 bg-dark-800 hover:bg-dark-700 rounded transition-colors"
              title="关于"
            >
              <Info size={18} className="text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        
        <main className="flex-1 relative">
          <RoomScene />
          
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="bg-dark-900/90 backdrop-blur rounded-lg p-3 text-xs">
              <div className="text-gray-400 mb-1">操作提示</div>
              <div className="text-gray-300 space-y-0.5">
                <div>🖱️ 左键拖动: 旋转视角</div>
                <div>🖱️ 右键拖动: 平移</div>
                <div>🔄 滚轮: 缩放</div>
              </div>
            </div>

            <div className="bg-dark-900/90 backdrop-blur rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-2">声压热力图</div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(0, 0, 255)' }} />
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(0, 200, 255)' }} />
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(0, 255, 200)' }} />
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(200, 255, 0)' }} />
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(255, 200, 0)' }} />
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(255, 100, 0)' }} />
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(255, 0, 0)' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>低</span>
                <span>高</span>
              </div>
            </div>
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  );
}

export default App;
