import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FlaskConical,
  FileUp,
  Calculator,
  ClipboardCheck,
  Users,
  Menu,
  X
} from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '样本质控', icon: FlaskConical, description: '日常入口' },
  { path: '/import', label: '样本导入', icon: FileUp, description: 'Excel/CSV' },
  { path: '/calculator', label: '计算工具', icon: Calculator, description: '浓度·计数' },
  { path: '/review', label: '复核中心', icon: ClipboardCheck, description: '修正审计' }
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { userRole, setUserRole } = useSampleStore();
  const location = useLocation();

  const currentNav = navItems.find((i) => i.path === location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={cn(
          'bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-cyan-400">临床样本条码追踪</h1>
              <p className="text-xs text-slate-400 mt-0.5">生物教学工具</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-cyan-600/20 text-cyan-400 border-l-4 border-cyan-400'
                    : 'text-slate-300 hover:bg-slate-700/30 hover:text-white'
                )}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/50">
          {sidebarOpen ? (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400">当前身份</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setUserRole(UserRole.TEACHER)}
                  className={cn(
                    'flex-1 py-1.5 px-2 text-xs rounded-md transition-colors',
                    userRole === UserRole.TEACHER
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  老师
                </button>
                <button
                  onClick={() => setUserRole(UserRole.STUDENT)}
                  className={cn(
                    'flex-1 py-1.5 px-2 text-xs rounded-md transition-colors',
                    userRole === UserRole.STUDENT
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  学生
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Users size={20} className="text-slate-500" />
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {currentNav?.label || '样本质控'}
            </h2>
            <p className="text-sm text-slate-500">
              {currentNav?.description || '追踪·日常入口'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                userRole === UserRole.TEACHER
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-cyan-100 text-cyan-700'
              )}
            >
              {userRole === UserRole.TEACHER ? '教师模式' : '学生模式'}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
