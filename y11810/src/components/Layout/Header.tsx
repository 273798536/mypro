import { useLocation, Link } from "react-router-dom";
import { Bell, LogOut, ChevronRight } from "lucide-react";

const routeTitles: Record<string, string> = {
  "/": "仪表盘",
  "/channels": "渠道管理",
  "/data/impression": "曝光日志",
  "/data/click": "点击日志",
  "/data/conversion": "转化单",
  "/settlement/runs": "结算运行",
  "/exceptions": "异常中心",
  "/bills": "结算明细",
};

export function Header() {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || "页面标题";
  const hasUnprocessedExceptions = true;

  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const crumbs = [{ path: "/", label: "首页" }];
    let currentPath = "";
    for (const path of paths) {
      currentPath += `/${path}`;
      if (routeTitles[currentPath]) {
        crumbs.push({ path: currentPath, label: routeTitles[currentPath] });
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#F2F3F5] bg-white px-6">
      <nav className="flex items-center text-[14px]">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-500 hover:text-primary transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-primary transition-colors">
          <Bell className="h-5 w-5" />
          {hasUnprocessedExceptions && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>

        <div className="h-6 w-px bg-gray-200" />

        <span className="text-[14px] text-gray-700">管理员</span>

        <button className="flex items-center gap-1.5 text-[14px] text-gray-500 hover:text-primary transition-colors">
          <LogOut className="h-4 w-4" />
          <span>退出</span>
        </button>
      </div>
    </header>
  );
}
