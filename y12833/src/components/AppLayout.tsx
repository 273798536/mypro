import { NavLink, Outlet } from 'react-router-dom';
import {
  GitBranch,
  Dna,
  MapPin,
  FileSearch,
  Images,
  ShieldAlert,
  ThermometerSnowflake,
  Leaf,
} from 'lucide-react';

const navItems = [
  { to: '/lineage', label: '谱系追踪', icon: GitBranch, tag: '日常入口' },
  { to: '/sequencing', label: '测序结果整理', icon: Dna, tag: '🧬 核心' },
  { to: '/sampling-map', label: '采样地点回看', icon: MapPin, tag: '🗺️' },
  { to: '/pathology', label: '病理/结论追溯', icon: FileSearch, tag: '🔗 双向' },
  { to: '/annotation-review', label: '图像标注审核', icon: Images, tag: '月底/课前' },
  { to: '/import-test', label: '重复导入测试', icon: ShieldAlert, tag: '⚠️ 校验' },
];

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-moon-gray">
      <aside className="fixed left-0 top-0 h-screen w-[240px] bg-gradient-to-b from-deep-ocean-dark via-deep-ocean to-deep-ocean-light shadow-xl z-50 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-tundra-green to-tundra-green-dark flex items-center justify-center shadow-card">
              <ThermometerSnowflake className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-[15px] font-serif-cn leading-tight">
                冷链追踪系统
              </h1>
              <p className="text-slate-400 text-[11px] mt-0.5">动植物样本 · 育种专用</p>
            </div>
          </div>
          <div className="mt-4 px-2 py-1.5 rounded bg-tundra-green/25 border border-tundra-green/40 flex items-center gap-2">
            <Leaf className="w-3.5 h-3.5 text-tundra-green-light" />
            <span className="text-tundra-green-light text-[11px] font-medium">
              数据已本地持久化
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''} group`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{item.label}</div>
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 mt-0.5">
                  {item.tag}
                </div>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-warning to-amber-light flex items-center justify-center text-white font-bold text-sm">
              李
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">李明华 · 育种专员</div>
              <div className="text-[10px] text-slate-400">
                长沙中心实验室 · 水稻组
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-[240px] flex-1 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
