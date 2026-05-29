import { List, History } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "结算列表", icon: List },
  { to: "/history", label: "操作历史", icon: History },
];

const pageTitles: Record<string, string> = {
  "/": "结算列表",
  "/history": "操作历史",
};

export default function Layout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? "";

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-[#1a1a2e] flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="text-xl font-bold text-[#c9a96e] tracking-wide">寄售结算</h1>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active
                    ? "border-l-3 border-[#c9a96e] text-[#c9a96e] bg-white/5"
                    : "border-l-3 border-transparent text-gray-400 hover:text-[#c9a96e] hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 text-xs text-gray-500 border-t border-white/10">v1.0</div>
      </aside>
      <div className="flex-1 flex flex-col bg-[#f5f0eb] overflow-hidden">
        <header className="bg-white shadow-sm px-6 py-4 flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-400">寄售结算</span>
          <span className="text-sm text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800">{title}</span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
