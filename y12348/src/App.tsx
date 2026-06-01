import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calculator, FileText, ClipboardList, FileDown } from "lucide-react";
import InputPage from "@/pages/InputPage";
import ResultPage from "@/pages/ResultPage";
import ReportPage from "@/pages/ReportPage";

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: '数据输入', icon: <ClipboardList className="w-4 h-4" /> },
    { path: '/result', label: '计算结果', icon: <Calculator className="w-4 h-4" /> },
    { path: '/report', label: '报告导出', icon: <FileDown className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-primary-950 grid-pattern">
      <header className="sticky top-0 z-30 bg-industrial-bg/95 backdrop-blur-sm border-b border-industrial-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg shadow-tech-glow">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-industrial-text leading-tight">
                流体管路压降计算
              </h1>
              <p className="text-xs text-industrial-textMuted">
                公式透明 · 追溯完整 · 证据留存
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-tech'
                      : 'text-industrial-textMuted hover:text-industrial-text hover:bg-primary-900/30'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<InputPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </main>

      <footer className="border-t border-industrial-border/30 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-industrial-textMuted/50">
          流体管路压降计算工具 · 达西-魏斯巴赫公式 · 科尔布鲁克摩擦系数
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
