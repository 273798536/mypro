import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, GitMerge, Columns, Search, FileDown } from "lucide-react";

const navItems = [
  { to: "/", label: "材料总览", icon: BookOpen },
  { to: "/normalization", label: "指法归一", icon: GitMerge },
  { to: "/comparison", label: "版本对比", icon: Columns },
  { to: "/search", label: "片段检索", icon: Search },
  { to: "/export", label: "证据导出", icon: FileDown },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 h-screen bg-mohei flex flex-col shrink-0">
        <div className="px-6 py-8 border-b border-mohei-light">
          <h1 className="font-heading text-3xl text-gutong tracking-wider">
            指法谱系
          </h1>
          <p className="text-gutong-light/60 text-xs mt-1 font-serif">
            古琴指法谱系检索系统
          </p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-xuanzhi">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 border-l-3 ${
                  isActive
                    ? "border-l-gutong bg-mohei-light text-gutong"
                    : "border-l-transparent text-gray-400 hover:bg-mohei-light/50 hover:text-gutong-light"
                }`
              }
            >
              <item.icon size={18} />
              <span className="font-serif">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-mohei-light">
          <p className="text-gray-500 text-xs font-serif">
            古琴指法谱系检索 v1.0
          </p>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto bg-xuanzhi">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
