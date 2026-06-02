import { useEffect, useState } from 'react';
import { User, RefreshCw, Trash2, Search, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '@/store/useAppStore';

const Header = () => {
  const { loadMockData, clearAllData, instruments, searchKeyword, setSearchKeyword } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    setHasData(instruments.length > 0);
  }, [instruments]);

  const handleLoadMock = () => {
    if (confirm('确定要加载样例数据吗？这将覆盖现有数据。')) {
      clearAllData();
      loadMockData();
    }
  };

  const handleClearData = () => {
    if (confirm('确定要清空所有数据吗？此操作不可撤销。')) {
      clearAllData();
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 bg-midnight-800/80 backdrop-blur-xl border-b border-midnight-700 flex items-center justify-between px-6 sticky top-0 z-40"
    >
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-400" />
          <input
            type="text"
            placeholder="搜索乐器名称、演奏员、序列号..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-midnight-900/50 border border-midnight-600 rounded-btn text-sm text-midnight-100 placeholder-midnight-500 focus:outline-none focus:ring-2 focus:ring-amber-gold-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLoadMock}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          加载样例
        </motion.button>

        {hasData && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClearData}
            className="btn-ghost flex items-center gap-2 text-sm text-alert-red hover:text-alert-red hover:bg-alert-red/10"
          >
            <Trash2 className="w-4 h-4" />
            清空数据
          </motion.button>
        )}

        <div className="h-8 w-px bg-midnight-600" />

        <button className="relative p-2 text-midnight-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-alert-red rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-btn hover:bg-midnight-700 transition-colors"
          >
            <div className="w-8 h-8 gold-gradient rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-midnight-100">乐团经理</p>
              <p className="text-xs text-midnight-400">管理员</p>
            </div>
          </button>

          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-2 w-48 card py-2 z-50"
            >
              <button className="w-full px-4 py-2 text-left text-sm text-midnight-200 hover:bg-midnight-700 transition-colors">
                个人设置
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-midnight-200 hover:bg-midnight-700 transition-colors">
                系统设置
              </button>
              <div className="border-t border-midnight-600 my-1" />
              <button className="w-full px-4 py-2 text-left text-sm text-alert-red hover:bg-alert-red/10 transition-colors">
                退出登录
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
