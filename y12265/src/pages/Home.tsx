import React, { useState } from 'react';
import { Play, Settings, History, Bot, Zap, AlertTriangle, Clock, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Scene } from '../types/game';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { selectScene, getAvailableScenes, setPlayerName, playerName } = useGameStore();
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [nameInput, setNameInput] = useState(playerName);

  const scenes = getAvailableScenes();

  const handleStartGame = () => {
    if (selectedScene) {
      setPlayerName(nameInput);
      selectScene(selectedScene);
      navigate('/game');
    }
  };

  const getSceneIcon = (type: string) => {
    switch (type) {
      case 'low-battery': return <Zap className="w-6 h-6 text-yellow-500" />;
      case 'collision': return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'timeout': return <Clock className="w-6 h-6 text-red-500" />;
      default: return <Bot className="w-6 h-6 text-blue-500" />;
    }
  };

  const getSceneColor = (type: string) => {
    switch (type) {
      case 'low-battery': return 'border-yellow-500/50 hover:border-yellow-500 bg-yellow-950/20';
      case 'collision': return 'border-orange-500/50 hover:border-orange-500 bg-orange-950/20';
      case 'timeout': return 'border-red-500/50 hover:border-red-500 bg-red-950/20';
      default: return 'border-blue-500/50 hover:border-blue-500 bg-blue-950/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM0ZjQ2ZTYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptLTYgMGg0djFoLTR2LTF6bTEyLTZoLTR2MWg0di0xem0tNiAwaC00djFoNHYtMXptLTYgMGgtNHYxaDR2LTF6bTEyLTZoLTR2MWg0di0xem0tNiAwaC00djFoNHYtMXptLTYgMGgtNHYxaDR2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
      
      <header className="relative z-10 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">机器人分拣拥堵赛</h1>
              <p className="text-xs text-slate-400">仓储调度培训系统</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/config')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">场景配置</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="text-sm">历史记录</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            欢迎来到<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">仓储调度挑战</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            在这个模拟系统中，你将扮演仓储经理，指挥机器人完成订单分拣。
            每一个决策都会影响最终结果，考验你的资源调度能力！
          </p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              玩家名称
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="输入你的名字"
            />
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4">选择训练场景</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                onClick={() => setSelectedScene(scene)}
                className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all ${
                  selectedScene?.id === scene.id
                    ? 'border-orange-500 bg-orange-950/30 scale-105'
                    : getSceneColor(scene.presetType)
                }`}
              >
                {selectedScene?.id === scene.id && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
                <div className="mb-4">{getSceneIcon(scene.presetType)}</div>
                <h4 className="text-lg font-bold text-white mb-2">{scene.name}</h4>
                <p className="text-slate-400 text-sm mb-4">{scene.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{scene.robots.length} 机器人</span>
                  <span>{scene.orders.length} 订单</span>
                  <span>{scene.gridWidth}x{scene.gridHeight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStartGame}
            disabled={!selectedScene}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-orange-500/25"
          >
            <Play className="w-6 h-6" />
            开始游戏
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-blue-500" />
            </div>
            <h4 className="text-white font-bold mb-2">路径规划</h4>
            <p className="text-slate-400 text-sm">学习A*网格寻路算法，理解机器人如何在复杂环境中找到最优路径。</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            <h4 className="text-white font-bold mb-2">冲突避免</h4>
            <p className="text-slate-400 text-sm">掌握多机器人协同调度，避免路径冲突和资源竞争。</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
              <History className="w-6 h-6 text-green-500" />
            </div>
            <h4 className="text-white font-bold mb-2">决策复盘</h4>
            <p className="text-slate-400 text-sm">每局结束后回看完整过程，分析关键决策对结果的影响。</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
