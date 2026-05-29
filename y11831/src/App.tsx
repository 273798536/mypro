import { useEffect, useState } from 'react';
import { ControlBar } from './components/ControlBar';
import { CustomerQueue } from './components/CustomerQueue';
import { ChefStation } from './components/ChefStation';
import { CacheMenu } from './components/CacheMenu';
import { PathVisualizer } from './components/PathVisualizer';
import { SettlementPage } from './components/SettlementPage';
import { ReviewPage } from './components/ReviewPage';
import { DataImportModal } from './components/DataImportModal';
import { useGameStore } from './store/useGameStore';
import { Order, Chef, MenuItem } from './types/game';
import { FileJson } from 'lucide-react';

type Page = 'game' | 'settlement' | 'review';

function App() {
  const { status, speed, tick, initGame, restartGame } = useGameStore();
  const [currentPage, setCurrentPage] = useState<Page>('game');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (status === 'running') {
      const interval = setInterval(() => {
        tick();
      }, 1000 / speed);
      return () => clearInterval(interval);
    }
  }, [status, speed, tick]);

  useEffect(() => {
    if (status === 'ended' && currentPage === 'game') {
      setCurrentPage('settlement');
    }
  }, [status, currentPage]);

  const handleRestart = () => {
    restartGame();
    setCurrentPage('game');
  };

  const handleImport = (orders: Order[], chefs: Chef[], menu: MenuItem[]) => {
    initGame(orders, chefs, menu);
  };

  if (currentPage === 'settlement') {
    return (
      <SettlementPage
        onRestart={handleRestart}
        onReview={() => setCurrentPage('review')}
      />
    );
  }

  if (currentPage === 'review') {
    return (
      <ReviewPage
        onBack={() => setCurrentPage('settlement')}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <ControlBar />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">游戏面板</h2>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FileJson className="w-4 h-4" />
            导入数据
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-1">
            <CustomerQueue />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <ChefStation />
            
            <div className="grid md:grid-cols-2 gap-4">
              <CacheMenu />
              <PathVisualizer />
            </div>
          </div>
        </div>

        {status === 'idle' && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">欢迎来到算法面试餐厅</h3>
            <p className="text-gray-600 mb-6">选择算法策略，点击开始按钮体验游戏</p>
            <div className="flex justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full" />
                队列策略影响等待时间
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                缓存策略影响准备速度
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-500 rounded-full" />
                路径算法影响送餐效率
              </div>
            </div>
          </div>
        )}

        {status === 'paused' && (
          <div className="text-center py-8 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-2">⏸️</div>
            <h3 className="text-xl font-bold text-gray-800">游戏已暂停</h3>
            <p className="text-gray-600">点击继续按钮恢复游戏</p>
          </div>
        )}
      </div>

      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
}

export default App;
