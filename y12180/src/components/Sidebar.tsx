import { NavLink } from 'react-router-dom';
import {
  Music,
  Search,
  AlertTriangle,
  CheckCircle,
  History,
  Download,
  Copyright,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: '点歌单列表', icon: Music },
  { path: '/matches', label: '版权匹配', icon: Search },
  { path: '/conflicts', label: '冲突处理', icon: AlertTriangle },
  { path: '/review', label: '风险分级与复核', icon: CheckCircle },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/export', label: '导出下载', icon: Download },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Copyright className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">版权过滤工作台</h1>
            <p className="text-slate-400 text-xs">直播点歌管理系统</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                      'hover:bg-slate-800 hover:text-white',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-300'
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-sm">当前用户</p>
          <p className="text-white font-medium">管理员</p>
        </div>
      </div>
    </aside>
  );
}
