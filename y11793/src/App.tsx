import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Battery, History } from 'lucide-react';
import FittingWorkbench from '@/pages/FittingWorkbench';
import HistoryPage from '@/pages/HistoryPage';
import { cn } from '@/utils/cn';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#1a1a2e]">
        <nav className="bg-[#16162a] border-b border-[#2a2a4e] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center">
                  <Battery className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">电池RC等效拟合</h1>
                  <p className="text-xs text-gray-400">Battery RC Equivalent Fitting</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a4e]'
                    )
                  }
                >
                  <Battery className="w-4 h-4" />
                  <span>工作台</span>
                </NavLink>
                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-[#ff8c00]/20 text-[#ff8c00] border border-[#ff8c00]/30'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a4e]'
                    )
                  }
                >
                  <History className="w-4 h-4" />
                  <span>历史记录</span>
                </NavLink>
              </div>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<FittingWorkbench />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </Router>
  );
}
