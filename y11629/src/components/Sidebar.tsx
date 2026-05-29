import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Tag, RefreshCw, PieChart, BarChart3, Database, RotateCcw } from 'lucide-react';
import { useLedgerStore } from '../store/useLedgerStore';

const navItems = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard },
  { to: '/ledger', label: '积分账本', icon: BookOpen },
  { to: '/campaigns', label: '活动版本', icon: Tag },
  { to: '/refunds', label: '退款补偿', icon: RefreshCw },
  { to: '/allocation', label: '成本分摊', icon: PieChart },
  { to: '/reports', label: '报告导出', icon: BarChart3 },
];

export default function Sidebar() {
  const { stats, resetData } = useLedgerStore();

  return (
    <aside className="w-60 bg-navy-950 border-r border-navy-800 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-navy-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-navy-600 rounded flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">CCOST CLI</h1>
            <p className="text-navy-400 text-xs">信用卡积分成本工具</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-navy-800">
        <div className="bg-navy-900 rounded p-3 text-xs">
          <div className="text-navy-400 mb-2">统计快照</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-navy-300">总成本</div>
              <div className="text-white font-mono font-semibold">¥{stats.totalCost.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-navy-300">异常</div>
              <div className="text-red-400 font-mono font-semibold">{stats.anomalyCount}</div>
            </div>
            <div>
              <div className="text-navy-300">已修正</div>
              <div className="text-emerald-400 font-mono font-semibold">{stats.revisedCount}</div>
            </div>
            <div>
              <div className="text-navy-300">待确认</div>
              <div className="text-amber-400 font-mono font-semibold">{stats.pendingReviewCount}</div>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
                isActive
                  ? 'bg-navy-700 text-white'
                  : 'text-navy-300 hover:bg-navy-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-navy-800">
        <button
          onClick={() => {
            if (confirm('确定要重置所有数据吗？此操作不可恢复。')) {
              resetData();
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-navy-400 hover:text-navy-200 hover:bg-navy-800 rounded transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          重置演示数据
        </button>
        <div className="mt-2 text-center text-xs text-navy-600">
          数据保存在本地浏览器
        </div>
      </div>
    </aside>
  );
}
