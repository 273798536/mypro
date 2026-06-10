import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { BarChart3, TrendingUp, FileText, Shield, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: BarChart3, label: "分组统计" },
  { path: "/curve", icon: TrendingUp, label: "生长曲线" },
  { path: "/records", icon: FileText, label: "培养记录" },
  { path: "/qc", icon: Shield, label: "质控与导入" },
];

const pageNames: Record<string, string> = {
  "/": "分组统计",
  "/curve": "生长曲线",
  "/records": "培养记录",
  "/qc": "质控与导入",
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = navItems.find((item) =>
    item.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.path)
  )?.path ?? "/";

  const currentPageName =
    pageNames[activePath] ?? "植物表型生长曲线";

  return (
    <div className="flex h-screen overflow-hidden bg-surface font-body">
      <aside className="flex w-16 flex-col items-center bg-primary-dark py-4">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light/20">
          <Sprout className="h-5 w-5 text-primary-light" />
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary-light/20 text-white shadow-lg shadow-primary-dark/50"
                    : "text-white/50 hover:bg-primary-light/10 hover:text-white/80"
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-surface-dark bg-white px-6">
          <h1 className="heading-font text-lg font-semibold text-primary-dark">
            植物表型生长曲线
          </h1>
          <span className="mx-3 text-surface-dark">/</span>
          <span className="text-sm text-info">{currentPageName}</span>
        </header>

        <main className="flex-1 overflow-auto grid-bg p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
