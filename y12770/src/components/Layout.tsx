import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Activity,
  Bell,
  ChevronDown,
  User,
  Shield,
  Thermometer,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import type { UserRole } from "@/types";
import { useState } from "react";

const roleLabels: Record<UserRole, string> = {
  engineer: "质检工程师",
  supervisor: "质检主管",
};

const menuItems = [
  {
    path: "/",
    label: "工作台",
    icon: LayoutDashboard,
    end: true,
  },
  {
    path: "/weighing",
    label: "称量单管理",
    icon: FileSpreadsheet,
  },
  {
    path: "/trace",
    label: "异常留痕中心",
    icon: Activity,
  },
];

export default function Layout() {
  const { role, toggleRole, notifications } = useAppStore();
  const location = useLocation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isActive = (path: string, end: boolean = false) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-lab-bg flex flex-col">
      <header className="h-16 bg-gradient-to-r from-lab-primary via-lab-primary to-lab-primaryDark border-b border-lab-primaryDark/30 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Thermometer className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-xl font-bold text-white tracking-wide">
            反应热安全预警
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-lab-danger text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-lab-border z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-lab-border flex items-center justify-between">
                  <span className="font-semibold text-lab-text">通知中心</span>
                  <span className="text-xs text-lab-textLight">
                    {unreadCount} 条未读
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-lab-textLight text-sm">
                      暂无通知
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-lab-border/50 hover:bg-lab-bg cursor-pointer transition-colors ${
                          !n.read ? "bg-lab-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              n.type === "success"
                                ? "bg-lab-success"
                                : n.type === "warning"
                                ? "bg-lab-warning"
                                : n.type === "error"
                                ? "bg-lab-danger"
                                : "bg-lab-primary"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-lab-text truncate">
                              {n.title}
                            </p>
                            <p className="text-xs text-lab-textLight mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                {role === "supervisor" ? (
                  <Shield className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">
                  {roleLabels[role]}
                </div>
                <div className="text-xs text-white/60">点击切换角色</div>
              </div>
              <ChevronDown className="w-4 h-4 text-white/60" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-lab-border z-50 overflow-hidden">
                <button
                  onClick={() => {
                    useAppStore.getState().setRole("engineer");
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-lab-bg transition-colors ${
                    role === "engineer" ? "bg-lab-primary/5 text-lab-primary" : "text-lab-text"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">质检工程师</span>
                </button>
                <button
                  onClick={() => {
                    useAppStore.getState().setRole("supervisor");
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-lab-bg transition-colors ${
                    role === "supervisor" ? "bg-lab-primary/5 text-lab-primary" : "text-lab-text"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">质检主管</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 bg-lab-panel border-r border-lab-border flex-shrink-0 flex flex-col">
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.end);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={active ? "sidebar-item-active" : "sidebar-item"}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-lab-border">
            <div className="glass-card p-3">
              <div className="flex items-center gap-2 mb-2">
                {role === "supervisor" ? (
                  <Shield className="w-4 h-4 text-lab-primary" />
                ) : (
                  <User className="w-4 h-4 text-lab-primary" />
                )}
                <span className="text-sm font-semibold text-lab-text">
                  {roleLabels[role]}
                </span>
              </div>
              <p className="text-xs text-lab-textLight">
                当前角色权限已生效
              </p>
              <button
                onClick={toggleRole}
                className="mt-3 w-full text-xs text-lab-primary hover:underline"
              >
                切换到{role === "engineer" ? "主管" : "工程师"}视角
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
