import { NavLink, useLocation } from "react-router-dom";
import {
  Upload,
  LayoutDashboard,
  AlertTriangle,
  FileBarChart,
  Dna,
  Database,
  Github,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalysisStore } from "@/store/analysisStore";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { analysisResult } = useAnalysisStore();

  const anomalyCount = analysisResult?.anomalies.length ?? 0;
  const samplesAttention = analysisResult?.summary.samplesNeedingAttention ?? 0;

  const navItems: NavItem[] = [
    { to: "/", icon: LayoutDashboard, label: "分析看板" },
    { to: "/import", icon: Upload, label: "数据导入" },
    {
      to: "/anomalies",
      icon: AlertTriangle,
      label: "异常检测",
      badge: anomalyCount > 0 ? anomalyCount : undefined,
    },
    {
      to: "/report",
      icon: FileBarChart,
      label: "报告导出",
      badge: samplesAttention > 0 ? samplesAttention : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
        {/* Logo区域 */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center shadow-md">
              <Dna className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">
                引物覆盖检查
              </h1>
              <p className="text-xs text-slate-500">Primer Checker v1.0</p>
            </div>
          </div>
        </div>

        {/* 数据状态 */}
        <div className="px-4 py-3 border-b border-slate-100">
          <DataStatusCard />
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            工作区
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold",
                      item.to === "/anomalies"
                        ? "bg-warning-100 text-warning-700"
                        : "bg-danger-100 text-danger-700"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* 底部链接 */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-1">
          <button
            onClick={() => alert("使用说明：\n1. 在「数据导入」页面上传参考序列、引物和突变数据\n2. 点击「开始分析」\n3. 在「分析看板」查看结果\n4. 在「异常检测」处理问题引物\n5. 在「报告导出」生成实验员报告")}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-slate-400" />
            <span>使用帮助</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-400">
            <Database className="w-4 h-4" />
            <span>纯前端处理 · 数据不离开浏览器</span>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* 顶部栏 */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between px-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {getPageTitle(location.pathname)}
            </h2>
            <p className="text-xs text-slate-500">
              {getPageSubtitle(location.pathname, analysisResult)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {analysisResult && (
              <div className="text-right">
                <p className="text-xs text-slate-500">最近分析</p>
                <p className="text-sm font-medium text-slate-700 font-mono">
                  {new Date(analysisResult.createdAt).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              生
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function DataStatusCard() {
  const { reference, primerPairs, mutations } = useAnalysisStore();

  const items = [
    {
      label: "参考序列",
      value: reference ? `${reference.length.toLocaleString()} bp` : "未加载",
      ok: !!reference,
    },
    {
      label: "引物对",
      value: primerPairs.length > 0 ? `${primerPairs.length} 对` : "未加载",
      ok: primerPairs.length > 0,
    },
    {
      label: "突变位点",
      value: mutations.length > 0 ? `${mutations.length} 个` : "未加载",
      ok: mutations.length > 0,
    },
  ];

  return (
    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{item.label}</span>
          <span
            className={cn(
              "text-xs font-medium font-mono",
              item.ok ? "text-success-600" : "text-slate-400"
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function getPageTitle(pathname: string): string {
  switch (pathname) {
    case "/":
      return "分析看板";
    case "/import":
      return "数据导入";
    case "/anomalies":
      return "异常检测中心";
    case "/report":
      return "报告导出";
    default:
      return "病毒引物覆盖检查";
  }
}

function getPageSubtitle(
  pathname: string,
  result: ReturnType<typeof useAnalysisStore.getState>["analysisResult"]
): string {
  if (!result) {
    switch (pathname) {
      case "/":
        return "导入数据后开始分析引物覆盖情况";
      case "/import":
        return "上传参考序列、引物清单和样本突变数据";
      case "/anomalies":
        return "检测并处理反向写反、含N碱基、重复引物等问题";
      case "/report":
        return "生成实验员可读的扩增方案建议报告";
      default:
        return "";
    }
  }

  switch (pathname) {
    case "/":
      return `参考序列: ${result.reference.name} · ${result.primerPairs.length} 对引物 · ${result.mutations.length} 个突变`;
    case "/anomalies":
      return `检测到 ${result.anomalies.length} 个异常需要处理`;
    case "/report":
      return `基于 ${result.summary.validPrimers}/${result.summary.totalPrimers} 对有效引物生成报告`;
    default:
      return "";
  }
}
