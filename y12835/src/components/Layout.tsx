import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  BarChart3,
  GitBranch,
  AlertTriangle,
  Upload,
  Menu,
  X,
  UserCog,
  GraduationCap,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "台账总览", icon: LayoutDashboard },
  { to: "/records", label: "培养记录", icon: FlaskConical },
  { to: "/statistics", label: "分组统计", icon: BarChart3 },
  { to: "/lineage", label: "谱系追踪", icon: GitBranch },
  { to: "/anomaly", label: "异常复核", icon: AlertTriangle },
  { to: "/import", label: "数据导入", icon: Upload },
];

const breadcrumbMap: Record<string, string> = {
  "/": "台账总览",
  "/records": "培养记录",
  "/statistics": "分组统计",
  "/lineage": "谱系追踪",
  "/anomaly": "异常复核",
  "/import": "数据导入",
};

function Sidebar() {
  const { role, toggleRole, sidebarOpen, setSidebarOpen } = useStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <h1 className="font-display text-lg font-bold text-white tracking-wide">
            细胞冻存台账
          </h1>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            onClick={toggleRole}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              role === "technician"
                ? "bg-primary/20 text-primary-300 hover:bg-primary/30"
                : "bg-accent/20 text-accent-300 hover:bg-accent/30"
            )}
          >
            {role === "technician" ? (
              <UserCog size={18} />
            ) : (
              <GraduationCap size={18} />
            )}
            {role === "technician" ? "技师模式" : "学生模式"}
          </button>
        </div>
      </aside>
    </>
  );
}

function Header() {
  const { sidebarOpen, setSidebarOpen } = useStore();
  const location = useLocation();
  const path = location.pathname;
  const title =
    breadcrumbMap[path] ??
    (path.startsWith("/records") ? "培养记录" : "页面");

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
      <button
        className="lg:hidden text-slate-500 hover:text-slate-700"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={22} />
      </button>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">首页</span>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-700">{title}</span>
      </div>
    </header>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6 animate-fadeIn">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
