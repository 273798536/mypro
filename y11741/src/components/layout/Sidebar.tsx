import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  History,
  Upload,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const menuItems: MenuItem[] = [
  { key: "dashboard", label: "仪表盘", icon: <LayoutDashboard size={20} />, path: "/" },
  { key: "amortization", label: "摊销列表", icon: <FileText size={20} />, path: "/amortization" },
  { key: "history", label: "历史记录", icon: <History size={20} />, path: "/history" },
  { key: "import", label: "数据导入", icon: <Upload size={20} />, path: "/import" },
  { key: "export", label: "导出报告", icon: <Download size={20} />, path: "/export" },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const getActiveKey = () => {
    if (location.pathname === "/") return "dashboard";
    if (location.pathname.startsWith("/amortization")) return "amortization";
    return location.pathname.slice(1);
  };

  const activeKey = getActiveKey();

  return (
    <aside className="w-[240px] h-screen bg-white border-r border-neutral-200 flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-neutral-200">
        <h1 className="font-serif text-lg font-semibold text-primary-900">摊销管理系统</h1>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.key}>
              <Link
                to={item.path}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
                  activeKey === item.key
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                  hoveredKey === item.key && activeKey !== item.key && "bg-neutral-50"
                )}
              >
                <span
                  className={cn(
                    "transition-colors",
                    activeKey === item.key ? "text-primary-600" : "text-neutral-500"
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {activeKey === item.key && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-neutral-200">
        <div className="text-xs text-neutral-400">v1.0.0</div>
      </div>
    </aside>
  );
};
