import { MapPinCheck, FileText, BarChart3 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "点位总览", icon: MapPinCheck },
  { to: "/analysis", label: "分析统计", icon: BarChart3 },
];

export default function TopNav() {
  const loc = useLocation();
  const isDetail = loc.pathname.startsWith("/point");

  return (
    <header className="h-14 bg-ink-700 text-white flex items-center px-6 border-b border-ink-800 shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2.5 mr-10">
        <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-serif text-[17px] font-semibold tracking-wide leading-none">菜场卸货容量复核</h1>
          <p className="text-[11px] text-ink-200 mt-0.5 leading-none">街道工作台账 · 可追溯版</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 h-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            (item.to === "/" && loc.pathname === "/") ||
            (item.to !== "/" && loc.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`h-full px-4 flex items-center gap-2 text-sm transition-colors border-b-2 ${
                active
                  ? "text-white border-amber-500 bg-ink-800/40"
                  : "text-ink-200 border-transparent hover:text-white hover:bg-ink-800/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
        {isDetail && (
          <span className="h-full px-4 flex items-center gap-2 text-sm text-white border-b-2 border-amber-500 bg-ink-800/40">
            <MapPinCheck className="w-4 h-4" />
            复核详情
          </span>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-3 text-sm">
        <span className="text-ink-200">当前经办人</span>
        <span className="px-2.5 py-1 rounded bg-ink-800 border border-ink-600 text-amber-300 text-xs font-medium">
          周姐
        </span>
      </div>
    </header>
  );
}
