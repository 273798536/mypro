import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  ListChecks,
  BarChart3,
  MessageSquareWarning,
  Clock,
  Share2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { path: "/", label: "GIS点位", icon: MapPin },
  { path: "/public-list", label: "公示清单", icon: ListChecks },
  { path: "/review", label: "复核工作台", icon: BarChart3 },
  { path: "/complaints", label: "投诉处理", icon: MessageSquareWarning },
  { path: "/history", label: "历史复盘", icon: Clock },
  { path: "/delivery", label: "交付视图", icon: Share2 },
];

const pageTitles: Record<string, string> = {
  "/": "GIS点位",
  "/public-list": "公示清单",
  "/review": "复核工作台",
  "/complaints": "投诉处理",
  "/history": "历史复盘",
  "/delivery": "交付视图",
};

export default function Layout() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || "系统";

  return (
    <div className="flex h-screen bg-gray-50">
      <motion.aside
        className="fixed left-0 top-0 h-full bg-municipal-900 text-white overflow-hidden z-50"
        initial={false}
        animate={{ width: isExpanded ? 240 : 64 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-4 border-b border-municipal-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-municipal-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg font-bold whitespace-nowrap"
                  >
                    市政公示系统
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200",
                        isActive
                          ? "bg-municipal-500 text-white"
                          : "text-municipal-200 hover:bg-municipal-800 hover:text-white"
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-municipal-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-municipal-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="font-medium whitespace-nowrap">老曹</p>
                    <p className="text-sm text-municipal-300 whitespace-nowrap">市政设计员</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.aside>

      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: 64 }}
      >
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
          <div className="flex items-center gap-4" id="header-actions" />
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
