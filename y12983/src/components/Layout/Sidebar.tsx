import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Table,
  Shield,
  FlaskConical,
  History,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { resetAllData } from '@/utils/init';

const navItems = [
  { path: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/gaps', label: '缺口报告', icon: ListTodo },
  { path: '/snapshots', label: '表结构快照', icon: Table },
  { path: '/audit', label: '权限审计', icon: Shield },
  { path: '/test', label: '测试路径', icon: FlaskConical },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    resetAllData();
    setShowResetConfirm(false);
    window.location.reload();
  };

  return (
    <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col h-screen border-r border-slate-800">
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Table size={18} />
          </div>
          <span className="tracking-tight">时序缺口工作台</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Sampling Gap Console</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={() => navigate('/audit')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
        >
          <History size={14} />
          <span>日常入口：权限审计</span>
        </button>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/50 rounded transition-colors"
        >
          <RotateCcw size={14} />
          <span>重置为示例数据</span>
        </button>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-80 border border-slate-700">
            <h3 className="text-white font-semibold mb-2">确认重置</h3>
            <p className="text-slate-400 text-sm mb-4">
              重置后所有数据将恢复为初始示例数据，当前操作记录会丢失。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
