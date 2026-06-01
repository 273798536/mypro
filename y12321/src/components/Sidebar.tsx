import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Table2, 
  FileBarChart, 
  Settings2, 
  Download,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/data-entry', label: '数据录入', icon: Table2 },
  { path: '/analysis', label: '分析结果', icon: FileBarChart },
  { path: '/intervention', label: '人工干预', icon: Settings2 },
  { path: '/export', label: '报告导出', icon: Download },
];

export default function Sidebar() {
  const { records } = useAnalysisStore();
  
  const normalCount = records.filter(r => r.status === 'normal').length;
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const abnormalCount = records.filter(r => r.status === 'abnormal').length;

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          相关性误判提醒台
        </h1>
        <p className="text-xs text-slate-400 mt-1">Correlation Misjudgment Alert</p>
      </div>

      <div className="p-4 border-b border-slate-800">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/50 rounded p-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-emerald-400">{normalCount}</div>
            <div className="text-[10px] text-slate-400">正常</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2">
            <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-amber-400">{pendingCount}</div>
            <div className="text-[10px] text-slate-400">待确认</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-red-400">{abnormalCount}</div>
            <div className="text-[10px] text-slate-400">异常</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-all duration-200',
                    isActive
                      ? 'bg-slate-800 text-white border-l-2 border-blue-500'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500">
          <p>总计记录: <span className="text-slate-300 font-mono">{records.length}</span></p>
          <p className="mt-1">数据存储于本地浏览器</p>
        </div>
      </div>
    </div>
  );
}
