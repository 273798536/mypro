import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  FileUp,
  Calculator,
  AlertTriangle,
  History,
  FileText,
  HelpCircle,
  Wind,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

const navItems = [
  { path: '/', label: '工作台', icon: Home },
  { path: '/import', label: '数据导入', icon: FileUp },
  { path: '/calculator', label: '复算工作台', icon: Calculator },
  { path: '/exceptions', label: '异常处理', icon: AlertTriangle, badge: true },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/report', label: '报告导出', icon: FileText },
  { path: '/guide', label: '使用引导', icon: HelpCircle },
];

export const Sidebar = ({ collapsed = false }: SidebarProps) => {
  const location = useLocation();
  
  return (
    <aside className={cn(
      'h-screen bg-[#0F3460] text-white flex flex-col transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className={cn(
        'h-16 flex items-center gap-3 border-b border-[#1a4a7a]',
        collapsed ? 'justify-center px-4' : 'px-6'
      )}>
        <Wind className="w-8 h-8 text-[#16C79A] flex-shrink-0" />
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold font-mono">风洞烟线</h1>
            <p className="text-xs text-gray-400">实验复算系统</p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-[#1a4a7a] group',
                    isActive ? 'bg-[#1a4a7a] text-[#16C79A]' : 'text-gray-300',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-[#16C79A]' : 'text-gray-400 group-hover:text-white'
                  )} />
                  {!collapsed && (
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className={cn(
        'p-4 border-t border-[#1a4a7a]',
        collapsed && 'flex justify-center'
      )}>
        {!collapsed && (
          <div className="text-xs text-gray-400">
            <p>版本 1.0.0</p>
            <p className="mt-1">© 2024 航空航天实验中心</p>
          </div>
        )}
      </div>
    </aside>
  );
};
