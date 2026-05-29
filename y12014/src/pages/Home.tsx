import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import WarningTable from '../components/WarningTable';
import { useWarningStore } from '../store/warningStore';

function Home() {
  const { filter, fetchWarnings } = useWarningStore();

  useEffect(() => {
    fetchWarnings();
  }, [filter, fetchWarnings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">仓单质押价格预警系统</h1>
              <p className="text-slate-300 text-sm">供应链金融风控平台 - 风险自动识别与追溯</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="bg-white shadow-sm">
          <FilterBar />
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <WarningTable />
        </div>
      </main>

      <footer className="mt-8 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>仓单质押价格预警系统 © 2024 | 提示：筛选条件会自动保存，刷新页面不丢失</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
