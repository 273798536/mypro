import React from 'react';
import PipeNetwork from './components/PipeNetwork/PipeNetwork';
import StatusPanel from './components/StatusPanel/StatusPanel';
import ControlBar from './components/ControlBar/ControlBar';
import AlertModal from './components/AlertModal/AlertModal';
import Timeline from './components/Timeline/Timeline';
import Report from './components/Report/Report';
import { useGameStore } from './store/gameStore';
import { Droplets } from 'lucide-react';

const App: React.FC = () => {
  const { currentScene, gameState } = useGameStore();

  return (
    <div className="min-h-screen bg-industrial-bg p-4">
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-industrial-blue rounded-lg">
              <Droplets size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-industrial-text">流体管路抢修局</h1>
              <p className="text-sm text-industrial-muted">水务管网抢修模拟训练系统</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-medium text-industrial-text">{currentScene.name}</div>
            <div className="text-sm text-industrial-muted">
              难度: {currentScene.difficulty === 'easy' ? '简单' : currentScene.difficulty === 'medium' ? '中等' : '困难'}
            </div>
          </div>
        </div>
        <div className="mt-3 industrial-panel p-3">
          <p className="text-sm text-industrial-text">{currentScene.description}</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-3">
          <StatusPanel />
        </div>
        <div className="col-span-9">
          <PipeNetwork />
        </div>
      </div>

      <div className="space-y-4">
        <ControlBar />
        <Timeline />
      </div>

      <AlertModal />
      <Report />
    </div>
  );
};

export default App;
