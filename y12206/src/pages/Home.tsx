import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  Users,
  Wallet,
  Percent,
  Play,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/stores/employeeStore";
import { useSalaryStore } from "@/stores/salaryStore";
import { useRatioStore } from "@/stores/ratioStore";
import { useValidationStore } from "@/stores/validationStore";

export default function Home() {
  const { employees } = useEmployeeStore();
  const { salaryRecords, getAvailableMonths } = useSalaryStore();
  const { ratioVersions } = useRatioStore();
  const { validationResults, isRunning, runValidation, getSummary } =
    useValidationStore();

  const [hasRun, setHasRun] = useState(validationResults.length > 0);

  useEffect(() => {
    if (validationResults.length > 0) {
      setHasRun(true);
    }
  }, [validationResults]);

  const summary = getSummary();
  const months = getAvailableMonths();

  const handleRunValidation = async () => {
    await runValidation();
    setHasRun(true);
  };

  const sourceCards = [
    {
      title: "员工档案",
      icon: Users,
      count: employees.length,
      subtitle: `${employees.filter((e) => e.status === "active").length} 在职`,
      color: "bg-blue-500",
      path: "/employees",
    },
    {
      title: "工资表",
      icon: Wallet,
      count: salaryRecords.length,
      subtitle: `${months.length} 个月数据`,
      color: "bg-green-500",
      path: "/salary",
    },
    {
      title: "缴费比例",
      icon: Percent,
      count: ratioVersions.length,
      subtitle: `${ratioVersions.filter((v) => v.isDelayed).length} 个延迟版本`,
      color: "bg-amber-500",
      path: "/ratio",
    },
  ];

  const categoryLabels: Record<string, string> = {
    resign_not_stop: "离职未停缴",
    backpay_cross_month: "补缴跨月",
    ratio_version_mismatch: "比例版本错配",
    ratio_delayed: "比例延迟到版",
    data_inconsistency: "数据不一致",
  };

  const typeColors: Record<string, string> = {
    conflict: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    conflict: <AlertTriangle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">归集校验</h1>
          <p className="text-slate-500 mt-1">
            三源数据交叉校验，确保缴费归集准确无误
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sourceCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.path}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">
                    {card.count}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">{card.subtitle}</p>
                </div>
                <div className={cn("p-3 rounded-lg text-white", card.color)}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-accent-50 rounded-full flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-accent-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">
            三源数据归集校验
          </h2>
          <p className="text-slate-500 mt-2 max-w-md">
            交叉比对员工档案、工资表和缴费比例，检测冲突、不一致和异常情况
          </p>
          <button
            onClick={handleRunValidation}
            disabled={isRunning}
            className="mt-6 px-8 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                校验中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                {hasRun ? "重新校验" : "开始校验"}
              </>
            )}
          </button>
        </div>
      </div>

      {hasRun && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Database className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {summary.total}
                </p>
                <p className="text-sm text-slate-500">总校验项</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {summary.conflicts}
                </p>
                <p className="text-sm text-slate-500">冲突</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {summary.warnings}
                </p>
                <p className="text-sm text-slate-500">警告</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summary.resolved}
                </p>
                <p className="text-sm text-slate-500">已处理</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasRun && validationResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">冲突摘要</h3>
            <p className="text-sm text-slate-500 mt-1">
              点击查看详情和溯源链
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {validationResults.slice(0, 5).map((result) => {
              const employee = employees.find(
                (e) => e.id === result.employeeId
              );
              return (
                <div
                  key={result.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium border flex items-center gap-1",
                          typeColors[result.type]
                        )}
                      >
                        {typeIcons[result.type]}
                        {result.type === "conflict"
                          ? "冲突"
                          : result.type === "warning"
                          ? "警告"
                          : "信息"}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        {categoryLabels[result.category] || result.category}
                      </span>
                    </div>
                    {result.resolvedAt && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        已处理
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-slate-700">{result.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                    <span>{employee?.name || "未知员工"}</span>
                    <span>{result.month}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-slate-200">
            <Link
              to="/validation"
              className="flex items-center justify-center gap-2 text-accent-600 hover:text-accent-700 font-medium text-sm"
            >
              查看全部校验结果
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
