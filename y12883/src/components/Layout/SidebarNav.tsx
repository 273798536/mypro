import { NavLink, useLocation } from 'react-router-dom';
import {
  Waves,
  Calculator,
  Database,
  Edit3,
  Camera,
  AlertTriangle,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '水质预警', icon: Waves, description: '日常入口' },
  { path: '/calculator', label: '风浪窗口计算', icon: Calculator, description: '核心工具' },
  { path: '/buoy-data', label: '浮标数据', icon: Database, description: '数据管理' },
  { path: '/corrections', label: '修正记录', icon: Edit3, description: '人工留痕' },
  { path: '/photos', label: '巡检照片', icon: Camera, description: '问题追溯' },
  { path: '/risk-levels', label: '风险分层', icon: AlertTriangle, description: '月底/课前' },
];

export default function SidebarNav() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-deep-600/90 border border-white/10 lg:hidden"
      >
        {isMobileMenuOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 border-r border-white/10 bg-deep-600/80 backdrop-blur-xl',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center">
                <Waves size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white font-display">风浪窗口</h1>
                <p className="text-xs text-gray-400">船员换班辅助系统</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-ocean-500/20 text-ocean-400 border border-ocean-500/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                  )}
                  style={{
                    opacity: 0,
                    animation: `slideInLeft 0.4s ease-out ${index * 50}ms forwards`,
                  }}
                >
                  <Icon size={20} className={cn('flex-shrink-0', isActive ? 'text-ocean-400' : 'text-gray-500 group-hover:text-gray-300')} />
                  <div>
                    <p className={cn('text-sm font-medium', isActive ? 'text-ocean-300' : '')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-deep-300 to-deep-500 flex items-center justify-center">
                <Settings size={18} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">科研助理</p>
                <p className="text-xs text-gray-500">数据管理权限</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
