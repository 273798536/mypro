import { NavLink } from 'react-router-dom';
import {
  Home,
  Database,
  GitCompare,
  BarChart3,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '索引建议', icon: Home, description: '日常入口' },
  { to: '/backups', label: '备份记录', icon: Database, description: '列表与详情' },
  { to: '/schema-compare', label: 'Schema 对比', icon: GitCompare, description: '月底审计' },
  { to: '/test-suite', label: '测试路径', icon: FlaskConical, description: '场景验证' },
  { to: '/reports', label: '指标报表', icon: BarChart3, description: '质量分析' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-navy-900/80 backdrop-blur-sm border-r border-navy-700/50 flex flex-col">
      <div className="p-6 border-b border-navy-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navy-400 to-navy-600 flex items-center justify-center shadow-lg shadow-navy-900/50">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-bold text-white">备份恢复</h1>
            <p className="text-xs text-navy-300">演练台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-navy-700/60 text-white shadow-inner shadow-navy-900/30'
                  : 'text-navy-200 hover:bg-navy-800/50 hover:text-white'
              )
            }
          >
            <div
              className={cn(
                'p-1.5 rounded-md transition-all duration-200',
                'bg-navy-800/60 group-hover:bg-navy-700'
              )}
            >
              <item.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-navy-400 truncate">{item.description}</p>
            </div>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-navy-700/50">
        <div className="bg-navy-800/50 rounded-lg p-3">
          <p className="text-xs text-navy-300 font-medium mb-1">安全审计员</p>
          <p className="text-xs text-navy-400">本地工作台</p>
        </div>
      </div>
    </aside>
  );
}
