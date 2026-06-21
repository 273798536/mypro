import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  AlertTriangle, 
  GitCompare, 
  Download, 
  CheckSquare,
  Calculator
} from 'lucide-react';

const navItems = [
  { path: '/', label: '成本看板', icon: LayoutDashboard },
  { path: '/timeline', label: '历史时间线', icon: Clock },
  { path: '/exceptions', label: '异常处理', icon: AlertTriangle },
  { path: '/compare', label: '版本对比', icon: GitCompare },
  { path: '/export', label: '导出中心', icon: Download },
  { path: '/review', label: '审核放行', icon: CheckSquare },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white font-mono-display">联邦成本</h1>
            <p className="text-xs text-slate-500">客户端看板</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
              许
            </div>
            <div>
              <p className="text-sm font-medium text-white">许工</p>
              <p className="text-xs text-slate-500">算法工程师</p>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            <p>当前版本: v2.4.1</p>
            <p>模型: rec-2024-06-hotfix</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
