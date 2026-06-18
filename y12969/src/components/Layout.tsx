import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  DatabaseBackup,
  FileSearch,
  Search,
  History,
  FileDown,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuditStore } from '@/store/useAuditStore';
import { STATUS_LABEL } from '@/utils/api';

const NAV = [
  { path: '/dashboard', label: '仪表盘总览', icon: LayoutDashboard },
  { path: '/backup', label: '备份记录管理', icon: DatabaseBackup },
  { path: '/review', label: '异常复核中心', icon: FileSearch },
  { path: '/index-engine', label: '索引建议引擎', icon: Search },
  { path: '/history', label: '历史记录追溯', icon: History },
  { path: '/report', label: '审计报告导出', icon: FileDown },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { rounds, currentRoundId, setCurrentRound, loadRounds } = useAuditStore();
  const [roundOpen, setRoundOpen] = useState(false);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  const currentRound = rounds.find((r) => r.id === currentRoundId);

  return (
    <div className="min-h-screen flex bg-slatex-50">
      <aside className="w-64 bg-navy-800 text-navy-100 flex flex-col">
        <div className="px-5 py-6 border-b border-navy-700/60">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber" />
            <div>
              <div className="font-serif text-lg font-bold tracking-wider text-white">
                数据库容量趋势预警
              </div>
              <div className="text-[11px] text-navy-300 mt-0.5">安全审计工作台</div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-navy-700/40">
          <div className="label text-navy-400">当前审计轮次</div>
          <div className="relative mt-1">
            <button
              onClick={() => setRoundOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-navy-900/60 hover:bg-navy-700/60 transition"
            >
              <div className="text-left truncate pr-2">
                <div className="text-sm font-medium text-white truncate">
                  {currentRound?.name || '未选择'}
                </div>
                <div className="text-[11px] text-navy-300">
                  {currentRound ? STATUS_LABEL[currentRound.status] : ''}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 transition ${roundOpen ? 'rotate-180' : ''}`} />
            </button>
            {roundOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-navy-900 border border-navy-700 rounded-md shadow-lg z-20 overflow-hidden">
                {rounds.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setCurrentRound(r.id);
                      setRoundOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-navy-700/60 ${
                      r.id === currentRoundId ? 'bg-navy-700/80 text-white' : 'text-navy-200'
                    }`}
                  >
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11px] text-navy-400">{STATUS_LABEL[r.status]}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  active
                    ? 'bg-navy-600 text-white shadow-inner'
                    : 'text-navy-200 hover:bg-navy-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-navy-700/40 text-[11px] text-navy-400">
          v1.0.0 · © 2026 安全审计团队
        </div>
      </aside>

      <main className="flex-1 overflow-auto scroll-thin">
        <div className="p-6 max-w-[1500px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
