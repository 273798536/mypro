import { NavLink } from 'react-router-dom';
import {
  Calculator,
  FileText,
  LineChart,
  AlertTriangle,
  Download,
  LayoutDashboard,
  Mouse,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/calculator', label: '计算工具', icon: Calculator },
  { path: '/samples', label: '样本台账', icon: FileText },
  { path: '/quality-control', label: '质控分析', icon: LineChart },
  { path: '/anomalies', label: '异常中心', icon: AlertTriangle },
  { path: '/export', label: '报告导出', icon: Download },
];

interface SidebarProps {
  currentRunBatch?: string;
}

export default function Sidebar({ currentRunBatch }: SidebarProps) {
  return (
    <aside className="w-60 bg-primary-900 text-white flex flex-col h-screen shadow-side">
      <div className="p-5 border-b border-primary-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-medical-500 rounded-md flex items-center justify-center">
            <Mouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-semibold">小鼠笼位健康台账</h1>
            <p className="text-xs text-primary-400">检验质控管理系统</p>
          </div>
        </div>
      </div>

      {currentRunBatch && (
        <div className="px-4 py-3 border-b border-primary-800 bg-primary-800/50">
          <p className="text-xxs text-primary-400 mb-1">当前运行批次</p>
          <p className="text-sm font-mono font-medium text-medical-300">{currentRunBatch}</p>
        </div>
      )}

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
                      isActive
                        ? 'bg-medical-600 text-white shadow-md'
                        : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-primary-800">
        <div className="text-xxs text-primary-500">
          <p>版本 v1.0.0</p>
          <p className="mt-1">检验科室专用</p>
        </div>
      </div>
    </aside>
  );
}
