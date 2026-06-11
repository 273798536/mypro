import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Box,
  FileBarChart,
  ClipboardCheck,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useRecordsStore, useResultStore, useShallow } from "@/store";
import { cn } from "@/lib/utils";

interface TabItem {
  path: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}

const TABS: TabItem[] = [
  { path: "/", label: "引导页", icon: Home, end: true },
  { path: "/workbench", label: "工作台", icon: LayoutDashboard },
  { path: "/scenario", label: "3D场景", icon: Box },
  { path: "/output", label: "结果输出", icon: FileBarChart },
  { path: "/review", label: "复核面板", icon: ClipboardCheck },
];

export default function TopNav() {
  const location = useLocation();
  const records = useRecordsStore((s) => s.records);
  const { processing, error, result } = useResultStore(
    useShallow((s) => ({
      processing: s.processing,
      error: s.error,
      result: s.result,
    })),
  );

  const getLoadStatus = () => {
    if (processing) {
      return {
        label: "处理中",
        color: "text-deepsea-600 bg-deepsea-50 border-deepsea-200",
        icon: Loader2,
        spin: true,
      };
    }
    if (error) {
      return {
        label: "异常",
        color: "text-red-600 bg-red-50 border-red-200",
        icon: AlertCircle,
        spin: false,
      };
    }
    if (result) {
      return {
        label: "已就绪",
        color: "text-passgreen-600 bg-passgreen-50 border-passgreen-200",
        icon: CheckCircle2,
        spin: false,
      };
    }
    return {
      label: "待处理",
      color: "text-warnorange-600 bg-warnorange-50 border-warnorange-200",
      icon: AlertCircle,
      spin: false,
    };
  };

  const loadStatus = getLoadStatus();
  const StatusIcon = loadStatus.icon;

  const getCurrentTab = () => {
    for (const tab of TABS) {
      if (tab.end) {
        if (location.pathname === tab.path) return tab;
      } else {
        if (location.pathname.startsWith(tab.path)) return tab;
      }
    }
    return null;
  };

  const currentTab = getCurrentTab();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-deepsea-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 mr-6 pr-6 border-r border-deepsea-100">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-deepsea-500 to-deepsea-700 flex items-center justify-center shadow-sm shadow-deepsea-200">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold text-deepsea-900 tracking-tight">
                危险品库方案比选
              </span>
              <span className="text-[11px] text-deepsea-500">
                HazMat Terminal Evaluation System
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.end}
                  className={({ isActive }) =>
                    cn(
                      "eng-btn-ghost px-3 py-2 rounded-lg",
                      "transition-all duration-200",
                      isActive
                        ? "bg-deepsea-500 text-white hover:bg-deepsea-600 shadow-sm shadow-deepsea-200"
                        : "text-deepsea-600 hover:bg-deepsea-50",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          isActive ? "text-white" : "",
                        )}
                      />
                      <span className="font-medium">{tab.label}</span>
                      {isActive && currentTab === tab && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shrink-0 hidden" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="eng-card px-3 py-2 flex items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
                loadStatus.color,
              )}
            >
              <StatusIcon
                className={cn(
                  "w-3.5 h-3.5",
                  loadStatus.spin ? "animate-spin" : "",
                )}
              />
              <span>{loadStatus.label}</span>
            </div>

            <div className="w-px h-5 bg-deepsea-100" />

            <div className="flex items-center gap-1.5 text-deepsea-700">
              <Database className="w-4 h-4 text-deepsea-500" />
              <span className="text-sm">
                <span className="font-bold text-deepsea-800 text-[15px]">
                  {records.length}
                </span>
                <span className="text-deepsea-500 ml-0.5">条记录</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
