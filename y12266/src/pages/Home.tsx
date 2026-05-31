import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Star, Trophy, Music, BookOpen, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';
import { formatTimestamp } from '../utils/export';

export default function Home() {
  const navigate = useNavigate();
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const startGame = useGameStore(state => state.startGame);
  const loadSavedGames = useGameStore(state => state.loadSavedGames);
  const savedGames = useGameStore(state => state.savedGames);
  const startReview = useGameStore(state => state.startReview);

  useEffect(() => {
    loadSavedGames();
  }, [loadSavedGames]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-magic-green';
      case 'medium': return 'text-magic-gold';
      case 'hard': return 'text-magic-red';
      default: return 'text-primary-300';
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'from-magic-green/20 to-magic-green/5';
      case 'medium': return 'from-magic-gold/20 to-magic-gold/5';
      case 'hard': return 'from-magic-red/20 to-magic-red/5';
      default: return 'from-primary-600/20 to-primary-600/5';
    }
  };

  const getDifficultyName = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return difficulty;
    }
  };

  return (
    <div className="min-h-screen p-8 font-body">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold font-display text-magic-gold text-glow mb-4">
          🎵 音阶魔法塔 🏰
        </h1>
        <p className="text-xl text-primary-200 max-w-2xl mx-auto">
          通过塔防游戏学习音阶判定，战胜和弦怪，守护你的音乐王国！
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-primary-100 mb-6 flex items-center gap-2">
            <Play className="w-6 h-6 text-magic-gold" />
            选择关卡
          </h2>
          
          <div className="space-y-4">
            {LEVELS.map((level, index) => (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`card-glow bg-gradient-to-r ${getDifficultyBg(level.difficulty)}`}
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedLevel(expandedLevel === level.id ? null : level.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-800 flex items-center justify-center text-2xl font-bold text-magic-gold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-primary-100">{level.name}</h3>
                      <p className="text-primary-300 text-sm">{level.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`text-sm font-semibold ${getDifficultyColor(level.difficulty)}`}>
                      {getDifficultyName(level.difficulty)}
                    </div>
                    <div className="text-primary-300 text-sm">
                      {level.totalWaves} 波次
                    </div>
                    <div className="flex">
                      {[...Array(3)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-5 h-5 ${i < (level.difficulty === 'easy' ? 1 : level.difficulty === 'medium' ? 2 : 3) ? 'text-magic-gold fill-magic-gold' : 'text-primary-600'}`} 
                        />
                      ))}
                    </div>
                    {expandedLevel === level.id ? 
                      <ChevronUp className="w-5 h-5 text-primary-400" /> : 
                      <ChevronDown className="w-5 h-5 text-primary-400" />
                    }
                  </div>
                </div>
                
                {expandedLevel === level.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-primary-600/30"
                  >
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-magic-cyan">{level.initialLives}</div>
                        <div className="text-xs text-primary-400">初始生命</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-magic-gold">{level.initialGold}</div>
                        <div className="text-xs text-primary-400">初始金币</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-magic-orange">{level.availableTowers.length}</div>
                        <div className="text-xs text-primary-400">可用塔</div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm text-primary-300 mb-2">错误类型练习:</div>
                      <div className="flex flex-wrap gap-2">
                        {level.errorTypes.map(error => (
                          <span key={error} className="px-2 py-1 bg-primary-800/50 rounded text-xs text-primary-200">
                            {error === 'accidental_miss' && '升降号漏判'}
                            {error === 'enharmonic_confusion' && '同名调混淆'}
                            {error === 'chord_misattribution' && '和弦归属错'}
                            {error === 'tower_late' && '调式塔晚到'}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        startGame(level.id);
                        navigate(`/game/${level.id}`);
                      }}
                    >
                      <Play className="w-5 h-5" />
                      开始游戏
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="card"
          >
            <button 
              className="w-full flex items-center justify-between mb-4"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <h3 className="text-lg font-bold text-primary-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-magic-cyan" />
                游戏规则
              </h3>
              {showInstructions ? 
                <ChevronUp className="w-5 h-5 text-primary-400" /> : 
                <ChevronDown className="w-5 h-5 text-primary-400" />
              }
            </button>
            
            {showInstructions && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 text-sm text-primary-200"
              >
                <div className="p-3 bg-magic-cyan/10 rounded-lg border border-magic-cyan/30">
                  <div className="font-bold text-magic-cyan mb-1">🎴 音阶卡（主信息）</div>
                  <p>显示当前需要判定的调号、音阶类型和升降号标记。这是最优先的判定依据。</p>
                </div>
                
                <div className="p-3 bg-magic-orange/10 rounded-lg border border-magic-orange/30">
                  <div className="font-bold text-magic-orange mb-1">👾 和弦怪（补证）</div>
                  <p>携带和弦沿路径行进，和弦音是判定的第二依据。如果和弦音与音阶卡冲突，优先相信音阶卡。</p>
                </div>
                
                <div className="p-3 bg-magic-gold/10 rounded-lg border border-magic-gold/30">
                  <div className="font-bold text-magic-gold mb-1">🏰 调式塔（补证）</div>
                  <p>你部署的防御塔，攻击时提供调式特征音作为第三依据。塔可能晚到，需要注意时序！</p>
                </div>
                
                <div className="p-3 bg-magic-red/10 rounded-lg border border-magic-red/30">
                  <div className="font-bold text-magic-red mb-1">⚠️ 冲突处理</div>
                  <p>当三者判定冲突时：先留痕记录冲突点和时序，然后按优先级判断：音阶卡 {'>>'} 和弦怪 {'>>'} 调式塔</p>
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="card"
          >
            <h3 className="text-lg font-bold text-primary-100 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-magic-gold" />
              历史记录
            </h3>
            
            {savedGames.length === 0 ? (
              <p className="text-primary-400 text-sm text-center py-4">
                暂无游戏记录
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                {savedGames.slice().reverse().map((game, index) => (
                  <div 
                    key={game.gameId}
                    className="p-3 bg-primary-800/30 rounded-lg hover:bg-primary-700/30 transition-colors cursor-pointer"
                    onClick={() => {
                      startReview(game.gameId);
                      navigate(`/review/${game.gameId}`);
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-primary-100">{game.levelName}</span>
                      <span className={`text-sm ${game.won ? 'text-magic-green' : 'text-magic-red'}`}>
                        {game.won ? '✓ 胜利' : '✗ 失败'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-primary-400">
                      <span>分数: {game.score}</span>
                      <span>正确率: {(game.accuracy * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-primary-500 mt-1">
                      {formatTimestamp(game.endTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="card bg-gradient-to-br from-primary-800/50 to-primary-900/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <Volume2 className="w-8 h-8 text-magic-cyan" />
              <div>
                <h4 className="font-bold text-primary-100">错误类型说明</h4>
                <p className="text-xs text-primary-400">点击开始游戏后会遇到这些挑战</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-magic-red"></span>
                <span className="text-primary-300">升降号漏判 - 忽略临时升降号</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-magic-cyan"></span>
                <span className="text-primary-300">同名调混淆 - C#大调 vs Db大调</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-magic-orange"></span>
                <span className="text-primary-300">和弦归属错 - 和弦不属于当前调</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-magic-green"></span>
                <span className="text-primary-300">调式塔晚到 - 攻击时序滞后</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
