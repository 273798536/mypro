import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Map, AlertTriangle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "方案比选", icon: LayoutDashboard },
  { path: "/exceptions", label: "异常队列", icon: AlertTriangle },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-full min-h-screen">
      <aside className="w-60 bg-surface border-r border-border flex-shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-text">低空航线走廊</h1>
              <p className="text-xs text-muted">方案比选工具</p>
            </div>
          </div>
        </div>

        <nav className="p-3 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-all",
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text"
                )}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3">
          <div className="bg-background border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span>截图条件自动保留</span>
            </div>
            <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
              所有筛选条件将随截图嵌入水印，可追溯原始传感器依据
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
