import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  LineChart,
  Upload,
  Edit3,
  Settings,
  Activity,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { DashboardPage } from '@/pages/DashboardPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { DataImportPage } from '@/pages/DataImportPage';
import { CorrectionPage } from '@/pages/CorrectionPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { Badge } from '@/components/ui/Badge';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import * as React from 'react';

const navItems = [
  { path: '/', label: '数据概览', icon: LayoutDashboard },
  { path: '/analysis', label: '数据分析', icon: LineChart },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/correction', label: '手动修正', icon: Edit3 },
  { path: '/config', label: '配置管理', icon: Settings },
];

function Sidebar() {
  const location = useLocation();
  const { anomalies } = useAnalysisStore();
  const pendingAnomalies = React.useMemo(
    () => anomalies.filter((a) => !a.resolved).length,
    [anomalies]
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-industrial-bg-dark border-r border-industrial-border flex flex-col z-50">
      <div className="p-4 border-b border-industrial-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-sm flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-wider">
              MOTOR-TEST
            </h1>
            <p className="text-xs text-gray-500 font-mono">v2.4.1-SNAPSHOT</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-industrial-border">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Activity className="w-4 h-4 text-green-500" />
          <span>系统运行中</span>
          <span className="ml-auto font-mono text-gray-500">6 ONLINE</span>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all duration-150
                ${isActive
                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                  : 'text-gray-400 hover:bg-industrial-bg-light hover:text-gray-200 border-l-2 border-transparent'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.path === '/analysis' && pendingAnomalies > 0 && (
                <Badge
                  variant="red"
                  className="ml-auto text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center"
                >
                  {pendingAnomalies}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-industrial-border">
        <div className="bg-industrial-bg-light rounded-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-300">待处理异常</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-display font-bold text-amber-400">
              {pendingAnomalies}
            </span>
            <span className="text-xs text-gray-500 mb-1">项</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Header() {
  const location = useLocation();
  const currentNav = navItems.find((n) => n.path === location.pathname);
  const { filters, materials, testBenches } = useAnalysisStore();

  const selectedMaterial = React.useMemo(() => {
    if (filters.materialIds.length > 0) {
      const mat = materials.find((m) => m.id === filters.materialIds[0]);
      return mat?.code || null;
    }
    return null;
  }, [filters.materialIds, materials]);

  const selectedTestBench = React.useMemo(() => {
    if (filters.testBenchIds.length > 0) {
      const tb = testBenches.find((t) => t.id === filters.testBenchIds[0]);
      return tb?.code || null;
    }
    return null;
  }, [filters.testBenchIds, testBenches]);

  const formatDate = (d: Date | null | undefined) => {
    if (!d) return '-';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const startTime = filters.timeRange?.[0];
  const endTime = filters.timeRange?.[1];

  return (
    <header className="h-14 bg-industrial-bg border-b border-industrial-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">
          {currentNav?.label || '电机效率测试台'}
        </h2>
        {selectedMaterial && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">材料:</span>
            <span className="text-blue-400 font-mono">{selectedMaterial}</span>
          </div>
        )}
        {selectedTestBench && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">测试台:</span>
            <span className="text-green-400 font-mono">{selectedTestBench}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="font-mono">
          {formatDate(startTime)} ~ {formatDate(endTime)}
        </span>
        <div className="w-px h-4 bg-industrial-border" />
        <span className="font-mono">OP: ENGINEER_01</span>
      </div>
    </header>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  const { initialize } = useAnalysisStore();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-industrial-bg">
      <Sidebar />
      <div className="ml-60 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <PageTransition>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/import" element={<DataImportPage />} />
              <Route path="/correction" element={<CorrectionPage />} />
              <Route path="/config" element={<ConfigPage />} />
            </Routes>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
