import { NavLink } from 'react-router-dom';
import { FileText, Wallet, History, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const navItems = [
  { path: '/refunds', label: '退款单列表', icon: FileText },
  { path: '/reserve', label: '备付金池概览', icon: Wallet },
  { path: '/history', label: '操作历史', icon: History },
];

export function Sidebar() {
  const resetToInitialState = useAppStore(state => state.resetToInitialState);
  const brokenRefund = useAppStore(state =>
    state.refundOrders.find(r => r.id === 'REFUND-BROKEN-001')
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-black font-mono tracking-tight text-amber-400">
          商户退款备付金
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          管理工作台 v1.0
        </p>
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/refunds'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded border-2 transition-all font-mono text-sm ${
                    isActive
                      ? 'bg-amber-900/30 border-amber-500 text-amber-300'
                      : 'border-transparent hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                  }`
                }
              >
                <item.icon size={18} className="shrink-0" />
                <span>{item.label}</span>
                {item.path === '/' && brokenRefund && (
                  <span className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs bg-red-600 text-white rounded-full animate-pulse">
                    <AlertTriangle size={10} />
                    异常
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={resetToInitialState}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono text-slate-400 bg-slate-800 border border-slate-600 rounded hover:bg-red-900/30 hover:text-red-300 hover:border-red-500 transition-all"
        >
          <RotateCcw size={14} />
          重置演示数据
        </button>
      </div>
    </aside>
  );
}
