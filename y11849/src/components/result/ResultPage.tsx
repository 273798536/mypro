import { useGameStore } from '../../store/gameStore';
import { ResultCard } from './ResultCard';
import { ReplayPanel } from './ReplayPanel';
import { Trophy, RotateCcw, BarChart3, X } from 'lucide-react';

export const ResultPage = () => {
  const { gameResult, showResult, showReplay, hideResultPage, restartGame, showReplayPanel, hideReplayPanel } = useGameStore();

  if (!showResult || !gameResult) return null;

  const getCategoryLabel = () => {
    switch (gameResult.category) {
      case 'usable':
        return { text: '可直接用', color: 'text-space-green', bg: 'bg-space-green/20' };
      case 'needs_confirm':
        return { text: '需要独立开发者确认', color: 'text-space-orange', bg: 'bg-space-orange/20' };
      case 'rhythm_mismatch':
        return { text: '因为节奏错位暂时不能算', color: 'text-space-red', bg: 'bg-space-red/20' };
      default:
        return { text: '未知', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
  };

  const category = getCategoryLabel();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto neon-border-cyan">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-space-yellow" />
            <h2 className="text-2xl font-bold text-neon-cyan font-orbitron">游戏结算</h2>
          </div>
          <button
            onClick={hideResultPage}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl font-bold text-neon-pink font-orbitron mb-2">
            {gameResult.score}
          </div>
          <div className="text-lg text-gray-400">最终得分</div>
          <div className={`inline-block mt-3 px-4 py-2 rounded-full ${category.bg}`}>
            <span className={`font-bold ${category.color}`}>{category.text}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ResultCard
            label="采样收集"
            value={gameResult.samplesCollected}
            icon="🎵"
            color="cyan"
          />
          <ResultCard
            label="采样放置"
            value={gameResult.samplesPlaced}
            icon="🎼"
            color="pink"
          />
          <ResultCard
            label="节奏质量"
            value={`${gameResult.rhythmQuality}%`}
            icon="✨"
            color="green"
          />
          <ResultCard
            label="剩余燃料"
            value={`${Math.round(gameResult.fuelRemaining)}%`}
            icon="⛽"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-lg p-4 neon-border-cyan">
            <div className="text-sm text-gray-400 mb-2">节奏错位</div>
            <div className={`text-2xl font-bold ${gameResult.rhythmMismatchCount > 2 ? 'text-space-red' : 'text-space-cyan'}`}>
              {gameResult.rhythmMismatchCount} 次
            </div>
          </div>
          <div className="glass rounded-lg p-4 neon-border-pink">
            <div className="text-sm text-gray-400 mb-2">采样冲突</div>
            <div className={`text-2xl font-bold ${gameResult.sampleConflictCount > 2 ? 'text-space-red' : 'text-space-pink'}`}>
              {gameResult.sampleConflictCount} 次
            </div>
          </div>
          <div className="glass rounded-lg p-4 neon-border-green">
            <div className="text-sm text-gray-400 mb-2">风暴命中</div>
            <div className={`text-2xl font-bold ${gameResult.stormHitCount > 3 ? 'text-space-red' : 'text-space-green'}`}>
              {gameResult.stormHitCount} 次
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={showReplayPanel}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-space-purple text-white font-bold transition-all duration-300 hover:shadow-neon-purple"
          >
            <BarChart3 className="w-5 h-5" />
            查看复盘
          </button>
          <button
            onClick={() => {
              hideResultPage();
              restartGame();
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
            }}
          >
            <RotateCcw className="w-5 h-5" />
            再来一局
          </button>
        </div>

        {showReplay && <ReplayPanel onClose={hideReplayPanel} />}
      </div>
    </div>
  );
};
