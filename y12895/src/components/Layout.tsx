import { NavLink, Outlet } from "react-router-dom"
import {
  LayoutDashboard,
  Navigation,
  Droplets,
  PenLine,
  Camera,
  ClipboardCheck,
  Layers,
  Anchor,
} from "lucide-react"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "结算总览" },
  { to: "/trajectory", icon: Navigation, label: "轨迹漂移复核" },
  { to: "/water-quality", icon: Droplets, label: "水质预警" },
  { to: "/corrections", icon: PenLine, label: "人工修正留痕" },
  { to: "/photos", icon: Camera, label: "巡检照片" },
  { to: "/results", icon: ClipboardCheck, label: "结果说明" },
  { to: "/composite", icon: Layers, label: "复合材料复核" },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 flex-shrink-0 bg-ocean-950 border-r border-ocean-800/60 flex flex-col">
        <div className="p-5 border-b border-ocean-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-ice/15 flex items-center justify-center">
              <Anchor className="w-5 h-5 text-ice" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">渔获冷链</h1>
              <p className="text-[11px] text-slate-400 leading-tight">靠港结算系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-ice/10 text-ice border border-ice/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900/60"
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-ocean-800/60">
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <p>浙渔运冷7号 · 在线</p>
            <p>舟山沈家门渔港</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-ocean-950">
        <Outlet />
      </main>
    </div>
  )
}
