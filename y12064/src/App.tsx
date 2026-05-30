import React from 'react';
import StatusBar from './components/StatusBar';
import ControlPanel from './components/ControlPanel';
import GameCanvas from './components/GameCanvas';
import ResultModal from './components/ResultModal';
import ReplayPanel from './components/ReplayPanel';
import { useGameStore } from './store/gameStore';
import { BookOpen } from 'lucide-react';

function App() {
  const { result, isReplayMode } = useGameStore();
  const showResult = result && !isReplayMode;

  return (
    <div className="min-h-screen bg-deep-blue flex flex-col">
      <StatusBar />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto h-full">
          <div className="flex gap-6 h-full">
            <ControlPanel />
            
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="font-orbitron text-2xl text-white">
                  轨迹模拟靶场
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <BookOpen size={16} />
                  <span>调节参数后点击发射，观察洛伦兹力对弹丸轨迹的影响</span>
                </div>
              </div>
              
              <div className="flex gap-4 flex-1">
                <GameCanvas className="flex-1" />
                <ReplayPanel />
              </div>

              <div className="grid grid-cols-4 gap-4 mt-2">
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">样例1: 命中靶心</div>
                  <div className="text-xs text-electro-blue/70">
                    B=5T向上, I=30A正向, m=10kg
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">样例2: 向上偏转</div>
                  <div className="text-xs text-warning-orange/70">
                    B=8T向上, I=50A正向, m=5kg
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">样例3: 方向反向</div>
                  <div className="text-xs text-error-red/70">
                    B=5T向下, I=30A反向, m=10kg
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">样例4: 能量测试</div>
                  <div className="text-xs text-success-green/70">
                    B=3T向上, I=80A正向, m=2kg
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResult && <ResultModal />}
    </div>
  );
}

export default App;
