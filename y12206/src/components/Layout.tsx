import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  Wallet,
  Percent,
  AlertTriangle,
  Download,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", label: "归集校验", icon: Home },
  { path: "/employees", label: "员工档案", icon: Users },
  { path: "/salary", label: "工资表", icon: Wallet },
  { path: "/ratio", label: "缴费比例", icon: Percent },
  { path: "/validation", label: "校验结果", icon: AlertTriangle },
  { path: "/export", label: "报表导出", icon: Download },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-30 bg-primary-900 text-white transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden"
        )}
      >
        <div className="p-4 border-b border-primary-700 flex items-center justify-between">
          <div
            className={cn(
              "flex items-center gap-3",
              !sidebarOpen && "lg:justify-center"
            )}
          >
            <Building2 className="w-8 h-8 text-accent-500 flex-shrink-0" />
            {(sidebarOpen || !sidebarOpen) && (
              <span
                className={cn(
                  "font-bold text-lg whitespace-nowrap transition-opacity",
                  !sidebarOpen && "lg:hidden"
                )}
              >
                年金归集
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isActive
                    ? "bg-accent-500 text-primary-900 font-medium"
                    : "text-primary-100 hover:bg-primary-800 hover:text-white",
                  !sidebarOpen && "lg:justify-center lg:px-2"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                  className={cn(
                    "whitespace-nowrap",
                    !sidebarOpen && "lg:hidden"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-primary-700">
          <div
            className={cn(
              "text-xs text-primary-300",
              !sidebarOpen && "lg:hidden"
            )}
          >
            v1.0.0 · 企业年金归集校验系统
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-slate-600" />
            ) : (
              <Menu className="w-5 h-5 text-slate-600" />
            )}
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
