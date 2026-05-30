import React from 'react';
import { Info, Zap, Target, AlertCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

const StatusBar: React.FC = () => {
  const { gameState, result } = useGameStore();

  const getStateText = () => {
    switch (gameState) {
      case 'idle': return '准备就绪';
      case 'ready': return '参数已更新';
      case 'firing': return '发射中...';
      case 'simulating': return '轨迹计算中...';
      case 'finished': return '射击完成';
      default: return '未知状态';
    }
  };

  const getStateColor = () => {
    switch (gameState) {
      case 'idle': return 'text-gray-400';
      case 'ready': return 'text-electro-blue';
      case 'firing':
      case 'simulating': return 'text-warning-orange animate-pulse';
      case 'finished': return result?.hit ? 'text-success-green' : 'text-error-red';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-deep-blue/80 backdrop-blur-sm border-b border-electro-blue/20 px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="text-electro-blue" size={20} />
            <span className="font-orbitron text-lg text-electro-blue text-shadow-glow">
              电磁炮靶场
            </span>
          </div>
          
          <div className="h-5 w-px bg-gray-700" />
          
          <div className="flex items-center gap-2">
            <Info size={14} className="text-gray-500" />
            <span className="text-sm text-gray-400">
              洛伦兹力模拟实验平台
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              gameState === 'simulating' ? 'bg-warning-orange animate-pulse' : 
              gameState === 'finished' ? (result?.hit ? 'bg-success-green' : 'bg-error-red') :
              'bg-electro-blue'
            }`} />
            <span className={`text-sm font-roboto-mono ${getStateColor()}`}>
              {getStateText()}
            </span>
          </div>

          {result && (
            <>
              <div className="h-5 w-px bg-gray-700" />
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Target size={14} className="text-electro-blue" />
                  <span className="text-gray-300">得分:</span>
                  <span className="font-roboto-mono text-electro-blue">{result.score}</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-warning-orange" />
                    <span className="text-warning-orange">{result.errors.length}个问题</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
