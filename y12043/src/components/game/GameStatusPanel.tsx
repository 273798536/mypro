import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '@/types';
import { Wallet, TrendingUp, TrendingDown, PieChart, AlertCircle, Clock } from 'lucide-react';

interface GameStatusPanelProps {
  game: GameState;
}

export function GameStatusPanel({ game }: GameStatusPanelProps) {
  const returnPercent = ((game.currentCapital - game.startCapital) / game.startCapital) * 100;
  const isPositive = returnPercent >= 0;
  
  const totalFees = game.fees.filter(f => f.isDeducted).reduce((sum, f) => sum + f.amount, 0);
  const pendingFees = game.fees.filter(f => !f.isDeducted).reduce((sum, f) => sum + f.amount, 0);
  
  const totalDrawdown = game.drawdowns.reduce((sum, d) => sum + d.drawdownPercent * 100, 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-1">当前资产</div>
        <motion.div 
          key={game.currentCapital}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold text-gray-800"
        >
          ¥{game.currentCapital.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </motion.div>
        <div className={`flex items-center justify-center gap-1 mt-2 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="font-semibold">
            {isPositive ? '+' : ''}{returnPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Wallet className="w-3 h-3" />
            初始资金
          </div>
          <div className="font-semibold text-slate-700">
            ¥{game.startCapital.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Clock className="w-3 h-3" />
            当前步数
          </div>
          <div className="font-semibold text-slate-700">
            第 {game.currentStep} / 8 步
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">已扣手续费</span>
          </div>
          <span className="font-semibold text-amber-700">¥{totalFees.toFixed(2)}</span>
        </div>

        <AnimatePresence>
          {pendingFees > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">待扣手续费</span>
              </div>
              <span className="font-semibold text-orange-700">¥{pendingFees.toFixed(2)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {totalDrawdown > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">累计回撤</span>
              </div>
              <span className="font-semibold text-red-600">-{totalDrawdown.toFixed(1)}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {game.drawdowns.length > 0 && (
        <div>
          <div className="text-sm font-medium text-slate-600 mb-2">回撤记录</div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {game.drawdowns.slice(-3).map((dd, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs p-2 bg-red-50 rounded-lg"
              >
                <div className="flex justify-between text-red-600">
                  <span>第{dd.step}步</span>
                  <span className="font-semibold">-{(dd.drawdownPercent * 100).toFixed(1)}%</span>
                </div>
                <div className="text-red-500 mt-1">{dd.cause}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
