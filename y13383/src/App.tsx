import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, GitCompare, Handshake, UserCircle2 } from 'lucide-react';
import DashboardPage from '@/pages/DashboardPage';
import QueuePage from '@/pages/QueuePage';
import GraylinePage from '@/pages/GraylinePage';
import HandoverPage from '@/pages/HandoverPage';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import { useAppStore } from '@/store/useAppStore';

const navItems = [
  { to: '/', label: '交付摘要', icon: LayoutDashboard },
  { to: '/queue', label: '失败队列', icon: ListOrdered },
  { to: '/grayline', label: '灰度拆解', icon: GitCompare },
  { to: '/handover', label: '交接视图', icon: Handshake },
];

export default function App() {
  const loc = useLocation();
  const { activeView, setActiveView } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-slate-200">
      <header className="h-16 border-b border-ink-800/80 backdrop-blur sticky top-0 z-30 bg-ink-950/80 flex items-center px-6 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 via-sky-500 to-emerald-400 grid place-items-center text-white font-bold serif text-lg shadow-lg shadow-violet-500/20">
            壓
          </div>
          <div>
            <div className="serif text-lg font-semibold text-slate-100 leading-tight">模型压缩成本看板</div>
            <div className="text-[11px] text-slate-500 tracking-wide">Compression Cost Observatory · v1.3 / 2026-06-20</div>
          </div>
        </div>

        <nav className="flex-1 flex items-center gap-1 ml-6">
          {navItems.map(n => {
            const Icon = n.icon;
            const active = loc.pathname === n.to;
            return (
              <NavLink key={n.to} to={n.to}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-md text-sm transition-all
                  ${active
                    ? 'bg-ink-800/80 text-white shadow-inner shadow-black/20 border border-ink-700'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-ink-800/40 border border-transparent'}`}>
                <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                <span className="serif italic font-medium">{n.label}</span>
                {active && <span className="ml-1 w-1 h-1 rounded-full bg-emerald-400 animate-pulse-dot" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-900/60 p-1">
            <button onClick={() => setActiveView('teacher')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5
                ${activeView === 'teacher' ? 'bg-violet-500/20 text-violet-200 border border-violet-400/40' : 'text-slate-400 hover:text-slate-200'}`}>
              <UserCircle2 size={13} /> 现场老师
            </button>
            <button onClick={() => setActiveView('engineer')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5
                ${activeView === 'engineer' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40' : 'text-slate-400 hover:text-slate-200'}`}>
              <UserCircle2 size={13} /> 工程师小唐
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 noise-bg">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/grayline" element={<GraylinePage />} />
          <Route path="/handover" element={<HandoverPage />} />
        </Routes>
      </main>

      <EvidenceDrawer />
    </div>
  );
}
