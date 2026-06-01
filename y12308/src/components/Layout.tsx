import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Menu,
  CheckCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import useStore from '@/store/useStore';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { batches, currentBatchId, dataSourceValidated, setCurrentBatch } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);

  const currentBatch = batches.find(b => b.id === currentBatchId) || batches[0];

  const breadcrumbMap: Record<string, string> = {
    '/': '数据概览',
    '/matrix': '转移矩阵',
    '/members': '会员明细',
    '/predict': '预测干预',
    '/report': '报告导出',
  };

  const currentPage = breadcrumbMap[location.pathname] || '数据概览';

  const handleBatchSelect = (batchId: string) => {
    setCurrentBatch(batchId);
    setIsBatchDropdownOpen(false);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="md:ml-[240px] min-h-screen">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu size={20} className="text-gray-600" />
              </button>

              <nav className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => navigate('/')}
                  className="text-muted hover:text-primary transition-colors"
                >
                  首页
                </button>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-primary font-medium">{currentPage}</span>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted hidden sm:inline">
                  同源校验
                </span>
                {dataSourceValidated ? (
                  <span className="flex items-center gap-1 text-success" title="数据已通过同源校验">
                    <CheckCircle size={18} />
                    <span className="text-xs hidden sm:inline">正常</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-danger" title="数据同源校验异常">
                    <AlertTriangle size={18} />
                    <span className="text-xs hidden sm:inline">异常</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <Calendar size={16} className="text-muted" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800">
                      {currentBatch?.name}
                    </div>
                    <div className="text-xs text-muted">
                      {currentBatch?.startDate} ~ {currentBatch?.endDate}
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-muted transition-transform ${isBatchDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {isBatchDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-muted">选择数据批次</p>
                      </div>
                      {batches.map((batch) => (
                        <button
                          key={batch.id}
                          onClick={() => handleBatchSelect(batch.id)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            currentBatchId === batch.id
                              ? 'bg-secondary/10 border-l-2 border-secondary'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-800">
                                {batch.name}
                                {batch.isCurrent && (
                                  <span className="ml-2 text-xs bg-secondary text-white px-1.5 py-0.5 rounded">
                                    当前
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted">
                                {batch.id} · {batch.startDate} ~ {batch.endDate}
                              </div>
                            </div>
                            {currentBatchId === batch.id && (
                              <CheckCircle size={16} className="text-secondary" />
                            )}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {isBatchDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsBatchDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
