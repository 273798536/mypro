import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import GrayCompare from './pages/GrayCompare';
import Statistics from './pages/Statistics';
import Replay from './pages/Replay';
import PromptVersions from './pages/PromptVersions';
import FeedbackLog from './pages/FeedbackLog';
import { useNav } from './stores';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const NAV: { key: any; label: string; path: string; icon: string; }[] = [
  { key: 'compare', label: '灰度对比', path: '/compare', icon: '🧪' },
  { key: 'statistics', label: '分布统计', path: '/statistics', icon: '📈' },
  { key: 'replay', label: '评测回放', path: '/replay', icon: '🔍' },
  { key: 'versions', label: '版本管理', path: '/versions', icon: '📦' },
  { key: 'feedback', label: '反馈日志', path: '/feedback', icon: '📋' },
];

function Sidebar() {
  const { active, setActive } = useNav();
  const loc = useLocation();
  useEffect(() => {
    const found = NAV.find(n => n.path === loc.pathname);
    if (found) setActive(found.key);
  }, [loc.pathname]);

  return (
    <aside className="w-60 shrink-0 h-full border-r border-border bg-bg-secondary flex flex-col">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-status-approved flex items-center justify-center text-xl">🧪</div>
          <div>
            <div className="font-bold text-sm leading-tight">灰度看板</div>
            <div className="text-[10px] text-text-secondary font-mono">Prompt GrayOps</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(item => (
          <a
            key={item.key}
            href={item.path}
            onClick={e => { e.preventDefault(); history.pushState({}, '', item.path); dispatchEvent(new PopStateEvent('popstate')); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              active === item.key
                ? 'bg-accent/15 text-accent shadow-inner border border-accent/30'
                : 'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border border-transparent'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
            {active === item.key && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
          </a>
        ))}
      </nav>
      <div className="p-4 border-t border-border space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-text-secondary font-mono">快捷 API 入口</div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-accent hover:underline font-mono"
        >
          → Swagger /docs
        </a>
        <a
          href="http://localhost:8000/api/health"
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-accent hover:underline font-mono"
        >
          → Health Check
        </a>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex bg-bg-primary">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/compare" replace />} />
            <Route path="/compare" element={<GrayCompare />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/replay" element={<Replay />} />
            <Route path="/versions" element={<PromptVersions />} />
            <Route path="/feedback" element={<FeedbackLog />} />
            <Route path="*" element={<Navigate to="/compare" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
