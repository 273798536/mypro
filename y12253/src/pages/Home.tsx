import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, Radio, FileText, PlayCircle, Target } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { initializeGame, decisionLog } = useGameStore();

  const handleStartGame = () => {
    initializeGame();
    navigate('/game');
  };

  const hasReport = decisionLog.length > 0;

  return (
    <div className="min-h-screen deep-grid flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-tech-cyan-500/10 mb-6">
            <Waves size={40} className="text-tech-cyan-400" />
          </div>
          <h1 className="font-display text-4xl text-tech-cyan-400 mb-4">
            声波潜艇寻路
          </h1>
          <p className="text-gray-400 text-lg">
            音乐科技社 · 声呐导航培训关卡
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="glow-border rounded-lg p-4 text-center bg-deep-ocean-950/50">
            <Radio size={24} className="mx-auto text-sonar-green-400 mb-2" />
            <div className="text-sm text-white">声呐脉冲</div>
            <div className="text-xs text-gray-500 mt-1">发射声波探测暗礁</div>
          </div>
          <div className="glow-border rounded-lg p-4 text-center bg-deep-ocean-950/50">
            <Target size={24} className="mx-auto text-warning-orange-400 mb-2" />
            <div className="text-sm text-white">节奏决策</div>
            <div className="text-xs text-gray-500 mt-1">在节拍窗口内行动</div>
          </div>
          <div className="glow-border rounded-lg p-4 text-center bg-deep-ocean-950/50">
            <FileText size={24} className="mx-auto text-tech-cyan-400 mb-2" />
            <div className="text-sm text-white">航行报告</div>
            <div className="text-xs text-gray-500 mt-1">分析误判原因</div>
          </div>
        </div>

        <div className="glow-border rounded-lg p-6 bg-deep-ocean-950/50 mb-8">
          <h2 className="font-display text-lg text-tech-cyan-400 mb-4">关卡介绍</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              <span className="text-sonar-green-400">🎯 目标：</span>
              驾驶潜艇穿越危险海域，安全抵达目标点
            </p>
            <p>
              <span className="text-warning-orange-400">⚠️ 挑战：</span>
              海域中隐藏着暗礁，你需要依靠声呐判断位置
            </p>
            <p>
              <span className="text-danger-red-400">💡 提示：</span>
              注意波形畸变，这可能是回声误判的信号
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleStartGame}
            className="w-full py-4 bg-tech-cyan-500 hover:bg-tech-cyan-400 text-deep-ocean-950 font-display text-lg rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-glow-cyan"
          >
            <PlayCircle size={24} />
            开始航行
          </button>

          {hasReport && (
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/report')}
                className="flex-1 py-3 bg-deep-ocean-800 hover:bg-deep-ocean-700 text-tech-cyan-400 font-display rounded-lg transition-all border border-tech-cyan-500/30"
              >
                查看航行报告
              </button>
              <button
                onClick={() => navigate('/replay')}
                className="flex-1 py-3 bg-deep-ocean-800 hover:bg-deep-ocean-700 text-sonar-green-400 font-display rounded-lg transition-all border border-sonar-green-500/30"
              >
                航行回放
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-gray-600">
          <p>点击声呐节拍区域启用音频 · 建议使用耳机获得最佳体验</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
