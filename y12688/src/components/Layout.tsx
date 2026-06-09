import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useData } from '../store/DataContext';

const NAV_ITEMS = [
  { to: '/', label: '参数联动', icon: '🏠', desc: '日常入口' },
  { to: '/import', label: '数据导入', icon: '📥', desc: '批量上传去重' },
  { to: '/filter', label: '异常筛选', icon: '🔍', desc: '查看原始信息' },
  { to: '/section', label: '剖切分析', icon: '📐', desc: '月底/课前查看' },
];

export default function Layout() {
  const navigate = useNavigate();
  const { stats, resetAll } = useData();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-gradient-to-b from-deep-sea to-ocean-dark text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold leading-tight">浮标阵列海况立体图</h1>
          <p className="text-xs text-white/60 mt-1">数据管理与复核平台</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 transition-all ${
                  isActive
                    ? 'bg-tech-blue/20 text-white border border-tech-blue/40'
                    : 'text-white/80 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  <div className="text-[10px] text-white/50 leading-tight mt-0.5">{item.desc}</div>
                </div>
              </div>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 rounded p-2">
              <div className="text-white/50">总数</div>
              <div className="text-base font-semibold">{stats.total}</div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-white/50">异常</div>
              <div className="text-base font-semibold text-yellow-300">
                {stats.duplicate + stats.conflict + stats.missingCamera}
              </div>
            </div>
          </div>
          <button
            onClick={() => { if (confirm('确认重置为演示数据？')) resetAll(); }}
            className="mt-3 w-full text-xs text-white/50 hover:text-white/80 py-1"
          >
            重置演示数据
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-800">浮标阵列海况立体图</h2>
            <span className="text-xs text-slate-400">仿真工程师复核工作台</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/filter')}
              className="text-sm px-3 py-1.5 bg-tech-blue text-white rounded hover:bg-tech-blue/90 transition"
            >
              去异常筛选
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
