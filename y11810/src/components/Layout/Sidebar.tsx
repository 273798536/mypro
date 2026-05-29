import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Eye,
  MousePointer,
  ShoppingCart,
  Calculator,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  children?: { path: string; label: string; icon: React.ReactNode }[];
}

const menuItems: MenuItem[] = [
  {
    path: "/",
    label: "仪表盘",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    path: "/channels",
    label: "渠道管理",
    icon: <Users className="h-5 w-5" />,
  },
  {
    path: "/data",
    label: "数据录入",
    icon: <Eye className="h-5 w-5" />,
    children: [
      {
        path: "/data/impression",
        label: "曝光日志",
        icon: <Eye className="h-4 w-4" />,
      },
      {
        path: "/data/click",
        label: "点击日志",
        icon: <MousePointer className="h-4 w-4" />,
      },
      {
        path: "/data/conversion",
        label: "转化单",
        icon: <ShoppingCart className="h-4 w-4" />,
      },
    ],
  },
  {
    path: "/settlement/runs",
    label: "结算运行",
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    path: "/exceptions",
    label: "异常中心",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    path: "/bills",
    label: "结算明细",
    icon: <FileText className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["/data"]);

  const toggleExpand = (path: string) => {
    setExpandedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <aside
      className="flex h-full flex-col border-r border-[#F2F3F5] bg-[#FFFFFF]"
      style={{ width: "220px" }}
    >
      <div className="flex h-16 items-center justify-center border-b border-[#F2F3F5]">
        <h1 className="text-xl font-bold text-primary">结算系统</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => (
          <div key={item.path} className="mb-1">
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.path)}
                  className="flex w-full items-center justify-between px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {expandedMenus.includes(item.path) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {expandedMenus.includes(item.path) && (
                  <div className="ml-2">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-4 py-2.5 text-[13px]",
                            isActive
                              ? "bg-primary/5 text-primary font-medium border-r-2 border-primary"
                              : "text-gray-600 hover:bg-gray-50"
                          )
                        }
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 text-[14px]",
                    isActive
                      ? "bg-primary/5 text-primary font-medium border-r-2 border-primary"
                      : "text-gray-700 hover:bg-gray-50"
                  )
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
