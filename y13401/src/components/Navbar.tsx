import { NavLink } from "react-router-dom";
import { LayoutGrid, Clock, FileBarChart, Compass } from "lucide-react";

export function Navbar() {
  const navItems = [
    { to: "/", label: "参数沙盘", icon: LayoutGrid, end: true },
    { to: "/timeline", label: "操作时间线", icon: Clock },
    { to: "/reports", label: "运行报告", icon: FileBarChart },
  ];

  return (
    <header className="sticky top-0 z-40 bg-parchment-50/80 backdrop-blur-md border-b border-parchment-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ink-800 rounded-lg">
              <Compass className="w-5 h-5 text-parchment-100" />
            </div>
            <div>
              <h1 className="font-serif-title text-base font-semibold text-ink-800 leading-tight">
                拓扑路径参数沙盘
              </h1>
              <p className="text-xs text-ink-400 leading-tight">
                Topology Path Parameter Sandbox
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-soft ${
                    isActive
                      ? "bg-ink-800 text-white shadow-md"
                      : "text-ink-600 hover:bg-ink-100/50 hover:text-ink-800"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-medium text-ink-700">老叶</div>
              <div className="text-xs text-ink-400">复核人</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-parchment-200 flex items-center justify-center text-ink-700 font-serif-title font-semibold">
              叶
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
