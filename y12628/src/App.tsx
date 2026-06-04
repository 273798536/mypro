import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, History, Upload, Beaker } from 'lucide-react';
import MainPage from './pages/MainPage';
import SettlementPage from './pages/SettlementPage';
import AuditPage from './pages/AuditPage';
import ImportPage from './pages/ImportPage';

function App() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: '标注操作', icon: LayoutDashboard },
    { path: '/settlement', label: '结算复盘', icon: FileText },
    { path: '/audit', label: '审计追溯', icon: History },
    { path: '/import', label: '数据导入', icon: Upload },
  ];

  return (
    <div className="min-h-screen relative z-10">
      <header className="glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <Beaker className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">实验室危化品贴纸图</h1>
            <p className="text-xs text-white/60">Lab Hazard Sticker Management</p>
          </div>
        </div>
        
        <nav className="flex gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="p-4">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/settlement" element={<SettlementPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
