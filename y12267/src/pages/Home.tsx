import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Atom } from 'lucide-react';
import CrystalGrid from '../components/CrystalGrid';
import DefectCardPanel from '../components/DefectCard';
import StatusBar from '../components/StatusBar';
import ControlPanel from '../components/ControlPanel';
import ReportPanel from '../components/ReportPanel';
import ToastMessage from '../components/ToastMessage';
import { useGameStore } from '../store/gameStore';
import { DEFECT_CARDS } from '../data/gameConfig';

const Home: React.FC = () => {
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error');

  const { submitGame, loadSavedGame, resetGame, isSubmitted } = useGameStore();

  useEffect(() => {
    const hasSavedGame = loadSavedGame();
    if (hasSavedGame) {
      showToast('已恢复上次游戏进度', 'info');
    }
  }, [loadSavedGame]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSubmit = () => {
    submitGame();
    showToast('游戏已提交！报告已生成', 'success');
  };

  const handlePlayAgain = () => {
    resetGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <ToastMessage
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-6 px-8"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Atom className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">晶体缺陷采矿场</h1>
                <p className="text-sm text-slate-400">Crystal Defect Mining Field</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">游戏规则</p>
                <p className="text-sm text-slate-400">放置缺陷，避免违规</p>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-8 pb-8">
          {!isSubmitted ? (
            <div className="grid grid-cols-12 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="col-span-3"
              >
                <div className="space-y-6">
                  <DefectCardPanel cards={DEFECT_CARDS} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-6"
              >
                <div className="flex justify-center">
                  <CrystalGrid onViolation={(msg) => showToast(msg, 'error')} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="col-span-3"
              >
                <div className="space-y-6">
                  <StatusBar />
                  <ControlPanel onSubmit={handleSubmit} />
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-12 gap-6"
            >
              <div className="col-span-8">
                <ReportPanel />
              </div>
              <div className="col-span-4">
                <div className="space-y-6">
                  <StatusBar />
                  <div className="p-6 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-4">操作</h3>
                    <button
                      onClick={handlePlayAgain}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/20"
                    >
                      <Atom size={18} />
                      <span className="font-medium">再玩一次</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!isSubmitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <ReportPanel />
            </motion.div>
          )}

          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center text-sm text-slate-500"
          >
            <p>提示：选择缺陷卡后点击晶格放置 · 位错需要邻接其他缺陷 · 注意能量消耗</p>
          </motion.footer>
        </main>
      </div>
    </div>
  );
};

export default Home;
