import { Scene3D } from './components/Scene3D';
import { BallParamsList } from './components/ControlPanel/BallParams';
import { PlaybackControls } from './components/ControlPanel/Playback';
import { EnvironmentSettings } from './components/ControlPanel/EnvironmentSettings';
import { MomentumTable } from './components/DataPanel/MomentumTable';
import { ErrorList } from './components/DataPanel/ErrorList';
import { ExperimentLog } from './components/ExperimentLog';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-space-950 overflow-hidden">
      <header className="h-14 border-b border-space-800 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyber-500 flex items-center justify-center">
            <span className="text-space-950 font-bold">⚛</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">弹性碰撞台球实验</h1>
            <p className="text-xs text-white/50">动量守恒可视化模拟</p>
          </div>
        </div>
        <div className="text-xs text-white/40">
          物理课堂演示平台 v1.0
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div id="experiment-canvas" className="flex-1 relative">
            <Scene3D />
          </div>
          <div className="h-80 border-t border-space-800 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 h-full">
              <MomentumTable />
              <ErrorList />
            </div>
          </div>
        </div>

        <div className="w-80 border-l border-space-800 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <PlaybackControls />
            <EnvironmentSettings />
            <BallParamsList />
            <ExperimentLog />
          </div>

          <div className="p-4 border-t border-space-800 text-xs text-white/40 text-center">
            <p>提示：调整参数后点击播放开始模拟</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
