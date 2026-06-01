import { useGameStore } from './store/gameStore';
import LevelSelect from './components/LevelSelect';
import GameBoard from './components/GameBoard';
import Settlement from './components/Settlement';

function App() {
  const { phase } = useGameStore();

  return (
    <div className="min-h-screen bg-rail-bg">
      <header className="bg-rail-card border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚂</span>
            <div>
              <h1 className="text-2xl font-bold text-white">债券现金流铁路</h1>
              <p className="text-gray-400 text-sm">投教复盘工具</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {phase === 'setup' && '选择关卡开始游戏'}</p>
          {phase === 'playing' && '游戏进行中'}</p>
          {phase === 'completed' && '游戏完成'}</p>
          {phase === 'failed' && '游戏失败'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {phase === 'setup' && <LevelSelect />}
        {phase === 'playing' && <GameBoard />}
        {(phase === 'completed' || phase === 'failed') && <Settlement />}
      </main>
    </div>
  );
}

export default App;
