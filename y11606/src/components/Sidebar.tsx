import { NavLink } from 'react-router-dom';
import { Calculator, FileDown, FileText, GitCompare, History, Home } from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/loan-info', label: '贷款信息', icon: FileText },
  { path: '/calculator', label: '提前还款试算', icon: Calculator },
  { path: '/compare', label: '方案对比', icon: GitCompare },
  { path: '/export', label: '报告导出', icon: FileDown },
  { path: '/history', label: '历史记录', icon: History },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wide">
          <span className="text-amber-400">房贷</span>提前还款试算
        </h1>
        <p className="text-xs text-slate-400 mt-1">专业金融计算工具</p>
      </div>
      
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white border-r-4 border-amber-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        <p>版本 1.0.0</p>
        <p className="mt-1">数据保存在本地浏览器</p>
      </div>
    </aside>
  );
}
