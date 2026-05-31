import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Layers } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { CardComponent } from './CardComponent';
import { canPlayCard } from '../engine/cardScheduler';

export function CardHand() {
  const {
    hand,
    deck,
    discardPile,
    status,
    city,
    playCard,
    endRound,
    playedCardsThisRound,
  } = useGameStore();

  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const isSettled = status === 'settled';

  const handleCardClick = (cardId: string) => {
    if (!isPlaying) return;
    playCard(cardId);
  };

  const handleEndRound = () => {
    if (!isPlaying) return;
    endRound();
  };

  return (
    <motion.div
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-t-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">手牌</span>
                <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded-full font-mono">
                  {hand.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-slate-500" />
                <span className="text-slate-500 text-xs">
                  牌库 {deck.length} · 弃牌 {discardPile.length}
                </span>
              </div>
              {playedCardsThisRound.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-xs">
                    本回合已调度 {playedCardsThisRound.length} 张
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isPaused && (
                <span className="text-amber-400 text-sm font-medium animate-pulse">
                  游戏已暂停
                </span>
              )}
              {isSettled && (
                <span className="text-cyan-400 text-sm font-medium">
                  游戏已结束，请查看结算
                </span>
              )}
              {isPlaying && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEndRound}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all"
                >
                  <SkipForward size={18} />
                  结束回合
                </motion.button>
              )}
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="popLayout">
              {hand.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-52 bg-slate-800/50 rounded-xl border border-dashed border-slate-700"
                >
                  <div className="text-center">
                    <Layers size={48} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500">手牌已用完</p>
                    <p className="text-slate-600 text-sm">点击"结束回合"抽取新牌</p>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-end justify-center gap-3 flex-wrap py-2 min-h-56">
                  {hand.map((card, index) => {
                    const playable = canPlayCard(card, city);
                    return (
                      <motion.div
                        key={card.id}
                        layout
                        initial={{ scale: 0, rotate: -10, y: 50 }}
                        animate={{
                          scale: 1,
                          rotate: 0,
                          y: 0,
                          transition: { delay: index * 0.05 },
                        }}
                        exit={{ scale: 0, rotate: 10, y: -50 }}
                        whileHover={{
                          y: -20,
                          zIndex: 10,
                          transition: { duration: 0.2 },
                        }}
                        className="relative"
                        style={{ zIndex: index }}
                      >
                        <CardComponent
                          card={card}
                          onClick={() => handleCardClick(card.id)}
                          disabled={!isPlaying || !playable}
                          size="medium"
                        />
                        {!playable && isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                            <span className="text-red-400 text-xs font-medium">
                              不可调度
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>

          {isPlaying && (
            <div className="mt-3 text-center text-xs text-slate-500">
              💡 点击卡牌进行调度 · 管网卡提升输送能力 · 处置卡处理低洼积水 · 雨水花园卡补充海绵容量
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
