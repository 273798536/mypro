import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { TreeDeciduous, ListChecks, AlertTriangle, Upload, Filter } from 'lucide-react';
import { useSeatStore } from '../store/useSeatStore';
import type { RecordStatus } from '../shared/types';

const navItems = [
  { to: '/', label: '清单列表', icon: ListChecks },
  { to: '/exceptions', label: '异常队列', icon: AlertTriangle },
  { to: '/import', label: '材料导入', icon: Upload },
];

const statusFilters: { value: RecordStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '已通过' },
  { value: 'exception', label: '异常' },
  { value: 'need_evidence', label: '待补证' },
  { value: 'suspected_duplicate', label: '疑似重复' },
];

export default function Layout() {
  const location = useLocation();
  const { filters, setFilters, stats, fetchRecords } = useSeatStore();
  const isDetailPage = location.pathname.startsWith('/record/');

  const showSidebar = !isDetailPage && location.pathname === '/';

  return (
    <div className="min-h-screen bg-bg-paper flex flex-col">
      <header className="bg-primary text-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                <TreeDeciduous className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif font-semibold text-lg leading-tight">
                  口袋公园座椅公示清单
                </h1>
                <p className="text-xs text-white/70 font-mono">Public Seat Registration System</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (item.to === '/') fetchRecords();
                  }}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:text-white hover:bg-white/10',
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
        <nav className="md:hidden border-t border-white/10">
          <div className="container mx-auto px-2 flex overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (item.to === '/') fetchRecords();
                }}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2',
                    isActive
                      ? 'text-white border-white'
                      : 'text-white/70 border-transparent hover:text-white',
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <div className="flex-1 flex">
        {showSidebar && (
          <>
            <aside className="hidden lg:block w-56 border-r border-gray-200 bg-white/50 p-4">
              <div className="flex items-center gap-2 mb-4 text-sm font-medium text-text-dark">
                <Filter className="w-4 h-4 text-primary" />
                状态筛选
              </div>
              <div className="space-y-1">
                {statusFilters.map((f) => {
                  const active = filters.status === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setFilters({ status: f.value })}
                      className={clsx(
                        'w-full flex items-center justify-between px-3 py-2 rounded text-sm text-left transition-colors',
                        active
                          ? 'bg-primary text-white'
                          : 'text-text-dark hover:bg-gray-100',
                      )}
                    >
                      <span>{f.label}</span>
                      <span
                        className={clsx(
                          'text-xs font-mono px-1.5 py-0.5 rounded',
                          active ? 'bg-white/20' : 'bg-gray-200 text-gray-600',
                        )}
                      >
                        {f.value === 'all'
                          ? stats.pending + stats.approved + stats.exception + stats.needEvidence + stats.suspectedDuplicate
                          : f.value === 'pending'
                          ? stats.pending
                          : f.value === 'approved'
                          ? stats.approved
                          : f.value === 'exception'
                          ? stats.exception
                          : f.value === 'need_evidence'
                          ? stats.needEvidence
                          : stats.suspectedDuplicate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="lg:hidden w-full border-b border-gray-200 bg-white/50 px-4 py-3">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-text-dark">
                <Filter className="w-4 h-4 text-primary" />
                状态筛选
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {statusFilters.map((f) => {
                  const active = filters.status === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setFilters({ status: f.value })}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors border',
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-text-dark border-gray-300 hover:border-primary/50',
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
