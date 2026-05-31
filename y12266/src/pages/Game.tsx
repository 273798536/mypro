import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Coins, Zap, Pause, Play, Home, RotateCcw, ArrowRight, Info } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { canPlaceTower } from '../game/towers/modeTowerGenerator';
import { SCALE_NAMES, ERROR_TYPE_NAMES } from '../data/musicTheory';
import { TOWER_TEMPLATES } from '../data/levels';
import type { Position, ModeTower, ChordMonster } from '../types';

export default function Game() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  
  const gameState = useGameStore(state => state.gameState);
  const selectedTowerTemplate = useGameStore(state => state.selectedTowerTemplate);
  const selectTowerTemplate = useGameStore(state => state.selectTowerTemplate);
  const placeTower = useGameStore(state => state.placeTower);
  const selectTower = useGameStore(state => state.selectTower);
  const upgradeTower = useGameStore(state => state.upgradeTower);
  const sellTower = useGameStore(state => state.sellTower);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const startGame = useGameStore(state => state.startGame);
  const clearGame = useGameStore(state => state.clearGame);
  const startReview = useGameStore(state => state.startReview);
  const saveGame = useGameStore(state => state.saveGame);
  
  const [showJudgmentModal, setShowJudgmentModal] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);

  useGameLoop();

  useEffect(() => {
    if (levelId && (!gameState || gameState.levelId !== levelId)) {
      startGame(levelId);
    }
  }, [levelId, gameState?.levelId, startGame]);

  useEffect(() => {
    if (gameState?.lastJudgment && !gameState.lastJudgment.isCorrect) {
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 500);
      setShowJudgmentModal(true);
    } else if (gameState?.lastJudgment?.isCorrect) {
      setShowJudgmentModal(true);
      setTimeout(() => setShowJudgmentModal(false), 2000);
    }
  }, [gameState?.lastJudgment?.id]);

  useEffect(() => {
    if (gameState?.status === 'won' || gameState?.status === 'lost') {
      saveGame();
      setTimeout(() => {
        startReview(gameState.gameId);
        navigate(`/review/${gameState.gameId}`);
      }, 3000);
    }
  }, [gameState?.status, gameState?.gameId, startReview, saveGame, navigate]);

  if (!gameState || !gameState.level) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-300 mb-4">加载中...</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const GRID_WIDTH = 8;
  const GRID_HEIGHT = 6;
  const CELL_SIZE = 80;

  const handleCellClick = (x: number, y: number) => {
    if (selectedTowerTemplate) {
      if (canPlaceTower({ x, y }, gameState.level!.towerSlots, gameState.towers)) {
        placeTower(selectedTowerTemplate, { x, y });
      }
    } else {
      const tower = gameState.towers.find(t => t.position?.x === x && t.position?.y === y);
      if (tower) {
        selectTower(tower.id === gameState.selectedTowerId ? null : tower.id);
      } else {
        selectTower(null);
      }
    }
  };

  const isPathCell = (x: number, y: number) => {
    return gameState.level?.path.some(p => p.x === x && p.y === y) || false;
  };

  const isSlotCell = (x: number, y: number) => {
    return gameState.level?.towerSlots.some(s => s.x === x && s.y === y) || false;
  };

  const getTowerAt = (x: number, y: number): ModeTower | undefined => {
    return gameState.towers.find(t => t.position?.x === x && t.position?.y === y);
  };

  const getAvailableTowers = () => {
    return gameState.level?.availableTowers.map(key => ({
      key,
      ...TOWER_TEMPLATES[key as keyof typeof TOWER_TEMPLATES]
    })) || [];
  };

  const selectedTower = gameState.towers.find(t => t.id === gameState.selectedTowerId);

  return (
    <div className={`min-h-screen p-4 font-body ${shakeScreen ? 'animate-shake' : ''}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <button 
              className="btn-secondary flex items-center gap-2"
              onClick={() => {
                clearGame();
                navigate('/');
              }}
            >
              <Home className="w-4 h-4" />
              首页
            </button>
            <div className="text-xl font-bold font-display text-magic-gold">
              {gameState.level.name}
            </div>
            <div className="flex items-center gap-2 text-primary-200">
              <Zap className="w-5 h-5 text-magic-orange" />
              <span>波次 {gameState.wave}/{gameState.totalWaves}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-magic-red" />
              <span className="font-bold text-lg text-magic-red">{gameState.lives}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-magic-gold" />
              <span className="font-bold text-lg text-magic-gold">{gameState.gold}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-magic-cyan" />
              <span className="font-bold text-lg text-magic-cyan">连击 {gameState.combo}</span>
            </div>
            <div className="text-primary-200">
              分数: <span className="font-bold text-white">{gameState.score}</span>
            </div>
            <button 
              className="btn-secondary"
              onClick={() => gameState.status === 'playing' ? pauseGame() : resumeGame()}
            >
              {gameState.status === 'playing' ? 
                <Pause className="w-5 h-5" /> : 
                <Play className="w-5 h-5" />
              }
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 space-y-4">
            <div className="card">
              <h3 className="text-lg font-bold text-magic-cyan mb-3 flex items-center gap-2">
                🎴 音阶卡
              </h3>
              {gameState.currentCard ? (
                <div className="space-y-3">
                  <div className="text-center py-4 bg-magic-cyan/10 rounded-lg border border-magic-cyan/30">
                    <div className="text-3xl font-bold text-magic-cyan font-display mb-2">
                      {gameState.currentCard.tonic} {SCALE_NAMES[gameState.currentCard.scaleType]}
                    </div>
                    <div className="text-sm text-primary-300">
                      音阶: {gameState.currentCard.displayNotes.join(' - ')}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">调号:</span>
                      <span className="text-primary-200">
                        {gameState.currentCard.keySignature.length > 0 
                          ? gameState.currentCard.keySignature.join(', ') 
                          : '无'}
                      </span>
                    </div>
                    {gameState.currentCard.accidentals.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-400">临时升降号:</span>
                        <span className="text-magic-red font-bold">
                          {gameState.currentCard.accidentals.map(a => `${a.note}${a.type}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-primary-400">
                  等待下一波...
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-magic-gold mb-3 flex items-center gap-2">
                🏰 调式塔
              </h3>
              <div className="space-y-2">
                {getAvailableTowers().map((tower, index) => {
                  const isSelected = selectedTowerTemplate === tower.key;
                  const canAfford = gameState.gold >= tower.cost;
                  const unplacedTower = gameState.towers.find(t => 
                    t.type === tower.type && t.position === null
                  );
                  
                  return (
                    <motion.div
                      key={tower.key}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-magic-gold/20 border-2 border-magic-gold' 
                          : canAfford && unplacedTower
                            ? 'bg-primary-800/50 border border-primary-600 hover:border-magic-gold/50'
                            : 'bg-primary-900/30 border border-primary-700/30 opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (canAfford && unplacedTower) {
                          selectTowerTemplate(isSelected ? null : tower.key);
                        }
                      }}
                      whileHover={canAfford && unplacedTower ? { scale: 1.02 } : {}}
                      whileTap={canAfford && unplacedTower ? { scale: 0.98 } : {}}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            tower.type === 'major' ? 'bg-magic-gold/20 text-magic-gold' :
                            tower.type === 'minor' ? 'bg-magic-cyan/20 text-magic-cyan' :
                            'bg-magic-orange/20 text-magic-orange'
                          }`}>
                            {tower.type === 'major' ? 'M' : tower.type === 'minor' ? 'm' : '♯'}
                          </div>
                          <div>
                            <div className="font-medium text-primary-100">{tower.modeName}</div>
                            <div className="text-xs text-primary-400">
                              特征音: {tower.characteristicNotes.join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="text-magic-gold font-bold">
                          {tower.cost} 💰
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-primary-400">
                        <div>攻击: {tower.damage}</div>
                        <div>范围: {tower.range}</div>
                        <div>攻速: {tower.attackSpeed}ms</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {selectedTower && (
                <div className="mt-4 p-3 bg-primary-800/50 rounded-lg border border-primary-600">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-primary-100">{selectedTower.modeName} Lv.{selectedTower.level}</span>
                    <span className="text-xs text-primary-400">
                      {selectedTower.position ? `(${selectedTower.position.x}, ${selectedTower.position.y})` : '未放置'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="text-primary-300">攻击: <span className="text-white">{selectedTower.damage}</span></div>
                    <div className="text-primary-300">范围: <span className="text-white">{selectedTower.range}</span></div>
                    <div className="text-primary-300">攻速: <span className="text-white">{selectedTower.attackSpeed}ms</span></div>
                  </div>
                  <div className="flex gap-2">
                    {selectedTower.level < selectedTower.maxLevel && (
                      <button
                        className={`flex-1 py-2 rounded text-sm font-medium ${
                          gameState.gold >= selectedTower.upgradeCost
                            ? 'bg-magic-gold/20 text-magic-gold hover:bg-magic-gold/30'
                            : 'bg-primary-800 text-primary-500 cursor-not-allowed'
                        }`}
                        onClick={() => upgradeTower(selectedTower.id)}
                        disabled={gameState.gold < selectedTower.upgradeCost}
                      >
                        升级 ({selectedTower.upgradeCost}💰)
                      </button>
                    )}
                    <button
                      className="flex-1 py-2 rounded text-sm font-medium bg-magic-red/20 text-magic-red hover:bg-magic-red/30"
                      onClick={() => sellTower(selectedTower.id)}
                    >
                      出售
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-6">
            <div className="card p-2">
              <div 
                className="relative bg-primary-950/50 rounded-lg overflow-hidden"
                style={{ 
                  width: GRID_WIDTH * CELL_SIZE, 
                  height: GRID_HEIGHT * CELL_SIZE,
                  margin: '0 auto'
                }}
              >
                {Array.from({ length: GRID_HEIGHT }).map((_, y) => (
                  Array.from({ length: GRID_WIDTH }).map((_, x) => {
                    const isPath = isPathCell(x, y);
                    const isSlot = isSlotCell(x, y);
                    const tower = getTowerAt(x, y);
                    const isSelectedTower = tower?.id === gameState.selectedTowerId;
                    const canPlace = selectedTowerTemplate && isSlot && !tower;

                    return (
                      <motion.div
                        key={`${x}-${y}`}
                        className={`absolute ${
                          isPath ? 'grid-cell-path' : 
                          isSlot ? 'grid-cell-slot' : 
                          'grid-cell bg-primary-900/20'
                        } ${canPlace ? 'ring-2 ring-magic-gold animate-pulse' : ''} ${
                          isSelectedTower ? 'ring-2 ring-magic-cyan' : ''
                        }`}
                        style={{
                          left: x * CELL_SIZE,
                          top: y * CELL_SIZE,
                          width: CELL_SIZE,
                          height: CELL_SIZE
                        }}
                        onClick={() => handleCellClick(x, y)}
                        whileHover={isSlot ? { backgroundColor: 'rgba(255, 215, 0, 0.1)' } : {}}
                      >
                        {tower && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                              tower.type === 'major' ? 'bg-gradient-to-br from-magic-gold to-yellow-600 text-yellow-900' :
                              tower.type === 'minor' ? 'bg-gradient-to-br from-magic-cyan to-cyan-600 text-cyan-900' :
                              'bg-gradient-to-br from-magic-orange to-orange-600 text-orange-900'
                            } shadow-lg ${tower.isLate ? 'animate-pulse ring-2 ring-magic-red' : ''}`}>
                              {tower.type === 'major' ? 'M' : tower.type === 'minor' ? 'm' : '♯'}
                              <span className="absolute -bottom-1 -right-1 bg-primary-900 text-xs w-5 h-5 rounded-full flex items-center justify-center text-white">
                                {tower.level}
                              </span>
                            </div>
                            {isSelectedTower && (
                              <div 
                                className="absolute rounded-full border-2 border-magic-cyan/30 pointer-events-none"
                                style={{
                                  width: tower.range * CELL_SIZE * 2,
                                  height: tower.range * CELL_SIZE * 2,
                                  left: '50%',
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)'
                                }}
                              />
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })
                ))}

                <AnimatePresence>
                  {gameState.monsters.map(monster => (
                    <MonsterSprite key={monster.id} monster={monster} cellSize={CELL_SIZE} />
                  ))}
                </AnimatePresence>

                <div 
                  className="absolute flex items-center justify-center text-xs text-primary-400 bg-primary-900/80 rounded px-2 py-1"
                  style={{
                    left: 0,
                    top: gameState.level.path[0].y * CELL_SIZE + CELL_SIZE / 2 - 12,
                    transform: 'translateX(-100%)'
                  }}
                >
                  入口
                </div>
                <div 
                  className="absolute flex items-center justify-center text-xs text-primary-400 bg-primary-900/80 rounded px-2 py-1"
                  style={{
                    right: 0,
                    top: gameState.level.path[gameState.level.path.length - 1].y * CELL_SIZE + CELL_SIZE / 2 - 12,
                    transform: 'translateX(100%)'
                  }}
                >
                  终点
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3 space-y-4">
            <div className="card max-h-96 overflow-y-auto scrollbar-thin">
              <h3 className="text-lg font-bold text-magic-orange mb-3 flex items-center gap-2">
                📜 判定记录
              </h3>
              {gameState.judgments.length === 0 ? (
                <div className="text-center py-8 text-primary-400 text-sm">
                  暂无判定记录
                </div>
              ) : (
                <div className="space-y-2">
                  {gameState.judgments.slice().reverse().map((judgment, index) => (
                    <motion.div
                      key={judgment.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg text-sm ${
                        judgment.isCorrect 
                          ? 'bg-magic-green/10 border border-magic-green/30' 
                          : 'bg-magic-red/10 border border-magic-red/30'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold ${judgment.isCorrect ? 'text-magic-green' : 'text-magic-red'}`}>
                          {judgment.isCorrect ? '✓ 正确' : '✗ 错误'}
                        </span>
                        <span className="text-xs text-primary-400">
                          #{gameState.judgments.length - index}
                        </span>
                      </div>
                      <div className="text-primary-200 text-xs mb-1">
                        正确答案: <span className="text-magic-green">{judgment.correctAnswer}</span>
                        {!judgment.isCorrect && (
                          <span> | 你的答案: <span className="text-magic-red">{judgment.userAnswer}</span></span>
                        )}
                      </div>
                      {judgment.errorTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {judgment.errorTypes.map((error, i) => (
                            <span key={i} className="px-2 py-0.5 bg-primary-800 rounded text-xs text-primary-200">
                              {ERROR_TYPE_NAMES[error]}
                            </span>
                          ))}
                        </div>
                      )}
                      {judgment.conflictDetected && (
                        <div className="text-xs text-magic-orange">
                          ⚠️ 检测到冲突
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {gameState.lastJudgment && (
              <div className="card bg-gradient-to-br from-primary-800/50 to-primary-900/50">
                <h4 className="font-bold text-primary-100 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-magic-cyan" />
                  判定时序
                </h4>
                <div className="space-y-1 text-xs">
                  {gameState.lastJudgment.timingSequence
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((record, index) => {
                      const timeDiff = index > 0 
                        ? record.timestamp - gameState.lastJudgment!.timingSequence[index - 1].timestamp
                        : 0;
                      return (
                        <div key={record.id} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary-700 flex items-center justify-center text-magic-gold font-bold">
                            {index + 1}
                          </span>
                          <span className={`${
                            record.source === 'card' ? 'text-magic-cyan' :
                            record.source === 'monster' ? 'text-magic-orange' :
                            'text-magic-gold'
                          }`}>
                            {record.source === 'card' ? '音阶卡' : 
                             record.source === 'monster' ? '和弦怪' : '调式塔'}
                          </span>
                          {timeDiff > 0 && (
                            <span className="text-primary-400">
                              +{timeDiff}ms
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showJudgmentModal && gameState.lastJudgment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowJudgmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className={`card max-w-lg w-full mx-4 ${
                gameState.lastJudgment.isCorrect 
                  ? 'border-magic-green/50' 
                  : 'border-magic-red/50'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className={`text-6xl mb-2 ${gameState.lastJudgment.isCorrect ? 'animate-float' : ''}`}>
                  {gameState.lastJudgment.isCorrect ? '✨' : '💥'}
                </div>
                <h2 className={`text-3xl font-bold font-display ${
                  gameState.lastJudgment.isCorrect ? 'text-magic-green' : 'text-magic-red'
                }`}>
                  {gameState.lastJudgment.isCorrect ? '判定正确！' : '判定错误！'}
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-magic-green/10 rounded-lg text-center">
                    <div className="text-xs text-primary-400 mb-1">正确答案</div>
                    <div className="text-xl font-bold text-magic-green">
                      {gameState.lastJudgment.correctAnswer}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${
                    gameState.lastJudgment.isCorrect ? 'bg-magic-green/10' : 'bg-magic-red/10'
                  }`}>
                    <div className="text-xs text-primary-400 mb-1">你的答案</div>
                    <div className={`text-xl font-bold ${
                      gameState.lastJudgment.isCorrect ? 'text-magic-green' : 'text-magic-red'
                    }`}>
                      {gameState.lastJudgment.userAnswer}
                    </div>
                  </div>
                </div>

                {gameState.lastJudgment.errorTypes.length > 0 && (
                  <div>
                    <div className="text-sm text-primary-300 mb-2">错误类型:</div>
                    <div className="flex flex-wrap gap-2">
                      {gameState.lastJudgment.errorTypes.map((error, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 bg-magic-red/20 rounded-full text-sm text-magic-red"
                        >
                          {ERROR_TYPE_NAMES[error]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {gameState.lastJudgment.conflictDetected && (
                  <div className="p-3 bg-magic-orange/10 rounded-lg border border-magic-orange/30">
                    <div className="text-sm font-bold text-magic-orange mb-1">⚠️ 冲突检测</div>
                    {gameState.lastJudgment.conflictDetails.map((detail, i) => (
                      <div key={i} className="text-xs text-primary-200">{detail}</div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-primary-800/50 rounded-lg">
                  <div className="text-sm text-primary-300 mb-1">详细说明:</div>
                  <div className="text-sm text-primary-100">
                    {gameState.lastJudgment.explanation}
                  </div>
                </div>

                <button
                  className="btn-primary w-full"
                  onClick={() => setShowJudgmentModal(false)}
                >
                  继续
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(gameState.status === 'paused') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="card text-center"
            >
              <h2 className="text-3xl font-bold font-display text-magic-gold mb-6">游戏暂停</h2>
              <div className="space-y-3">
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  onClick={resumeGame}
                >
                  <Play className="w-5 h-5" />
                  继续游戏
                </button>
                <button
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    startGame(gameState.levelId);
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                  重新开始
                </button>
                <button
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    clearGame();
                    navigate('/');
                  }}
                >
                  <Home className="w-5 h-5" />
                  返回首页
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(gameState.status === 'won' || gameState.status === 'lost') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="card text-center max-w-md"
            >
              <div className="text-6xl mb-4">
                {gameState.status === 'won' ? '🎉' : '💔'}
              </div>
              <h2 className={`text-4xl font-bold font-display mb-4 ${
                gameState.status === 'won' ? 'text-magic-gold' : 'text-magic-red'
              }`}>
                {gameState.status === 'won' ? '胜利！' : '失败...'}
              </h2>
              <div className="space-y-2 mb-6">
                <div className="text-2xl text-white">
                  得分: <span className="text-magic-gold font-bold">{gameState.score}</span>
                </div>
                <div className="text-primary-300">
                  正确率: {((gameState.judgments.filter(j => j.isCorrect).length / Math.max(1, gameState.judgments.length)) * 100).toFixed(1)}%
                </div>
                <div className="text-primary-300">
                  最高连击: {gameState.maxCombo}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-primary-400">
                <span>正在进入复盘...</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MonsterSprite({ monster, cellSize }: { monster: ChordMonster; cellSize: number }) {
  const hpPercent = (monster.hp / monster.maxHp) * 100;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: monster.position.x * cellSize + cellSize / 2,
        top: monster.position.y * cellSize + cellSize / 2,
        transform: 'translate(-50%, -50%)',
        zIndex: 10
      }}
      animate={{
        left: monster.position.x * cellSize + cellSize / 2,
        top: monster.position.y * cellSize + cellSize / 2,
      }}
      transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-magic-orange to-red-600 flex items-center justify-center text-white font-bold shadow-lg animate-float">
          👾
        </div>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-primary-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-magic-red to-magic-orange"
            initial={{ width: '100%' }}
            animate={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-primary-200 bg-primary-900/80 px-2 py-0.5 rounded">
          {monster.chordNotes.join('-')}
        </div>
      </div>
    </motion.div>
  );
}
