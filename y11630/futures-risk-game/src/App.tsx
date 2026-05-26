import React, { useEffect, useState } from 'react';
import { GameProvider } from './store/gameContext';
import { GameHeader } from './components/GameHeader';
import { AccountCard } from './components/AccountCard';
import { TradingCards } from './components/TradingCards';
import { ForceCloseQueue } from './components/ForceCloseQueue';
import { MarketEventList } from './components/MarketEvent';
import { LiquidationLog } from './components/LiquidationLog';
import { SettlementModal } from './components/SettlementModal';
import { useGameEngine } from './hooks/useGameEngine';
import { useTimer } from './hooks/useTimer';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, BookOpen, Target, AlertTriangle, CheckCircle, Clock, Play } from 'lucide-react';

const GameContent: React.FC = () => {
  const { state, selectAccount, isGameOver } = useGameEngine();
  useTimer();
  const [showSettlement, setShowSettlement] = useState(false);

  useEffect(() => {
    if (isGameOver() && state.status !== 'idle') {
      const timer = setTimeout(() => {
        setShowSettlement(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.status, isGameOver]);

  const isIdle = state.status === 'idle';
  const isSettled = state.status === 'settled';

  if (isIdle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <GameHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-24 h-24 bg-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary-600/30">
              <Zap className="w-12 h-12 text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              期货交易风控桌游
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              在模拟行情跳水场景中练习追加保证金处理和强平决策，掌握期货交易风控原理
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Target, title: '回合制行情', desc: '每回合触发行情事件，价格随机波动' },
              { icon: AlertTriangle, title: '风险阈值', desc: '实时监控风险度，预警和危险状态' },
              { icon: CheckCircle, title: '强平队列', desc: '按风险度排序，优先处理高风险账户' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              游戏规则
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">游戏目标</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="w-3 h-3 text-green-600" />
                    </span>
                    <span>在10个回合中管理客户账户风险度低于100%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="w-3 h-3 text-green-600" />
                    </span>
                    <span>通过追加保证金或平仓来降低风险</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="w-3 h-3 text-green-600" />
                    </span>
                    <span>风险度超过120%将触发强制平仓</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">操作方式</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="w-3 h-3 text-blue-600" />
                    </span>
                    <span>点击客户账户卡片选择要操作的账户</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="w-3 h-3 text-blue-600" />
                    </span>
                    <span>选择操作：追加保证金/部分平仓/全部平仓</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3 h-3 text-blue-600" />
                    </span>
                    <span>每回合30秒，超时系统自动处理</span>
                  </li>
                </ul>
              </div>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ForceCloseQueue />
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">客户账户</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {state.accounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      isSelected={state.selectedAccountId === account.id}
                      onSelect={() => selectAccount(account.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
            
            <LiquidationLog />
          </div>
          
          <div className="space-y-6">
            <TradingCards />
            <MarketEventList />
          </div>
        </div>
      </div>

      <SettlementModal
        isOpen={showSettlement || isSettled}
        onClose={() => setShowSettlement(false)}
      />
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;
