import { NavLink } from 'react-router-dom';
import { Calculator, FlaskConical, History, BarChart3, Droplets } from 'lucide-react';

const navItems = [
  { to: '/', label: '计算工作台', icon: Calculator },
  { to: '/reagent', label: '试剂台账', icon: FlaskConical },
  { to: '/batch', label: '批次追踪', icon: History },
  { to: '/results', label: '结果总览', icon: BarChart3 },
];

function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-900 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="font-serif text-base font-semibold text-primary-900 leading-tight">
              晶体水含量
            </h1>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase">
              Crystal Water Analyzer
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <p>适用范围：结晶水含量 0.5%~50.0%</p>
          <p className="mt-1">单位统一：克(g) / 百分比(%)</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
