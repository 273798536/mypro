import { useState, useMemo } from "react";
import {
  Download,
  FileText,
  Table,
  CheckCircle,
  Calendar,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/stores/employeeStore";
import { useSalaryStore } from "@/stores/salaryStore";
import { useRatioStore } from "@/stores/ratioStore";
import { useValidationStore } from "@/stores/validationStore";

export default function Export() {
  const { employees } = useEmployeeStore();
  const { salaryRecords, getAvailableMonths } = useSalaryStore();
  const { ratioVersions } = useRatioStore();
  const { validationResults, getSummary } = useValidationStore();

  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [includeResolved, setIncludeResolved] = useState(true);

  const months = getAvailableMonths();

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month]
    );
  };

  const selectAllMonths = () => {
    setSelectedMonths(months);
  };

  const clearSelection = () => {
    setSelectedMonths([]);
  };

  const summary = getSummary();

  const exportData = useMemo(() => {
    const targetMonths =
      selectedMonths.length > 0 ? selectedMonths : months;

    const filteredValidations = validationResults.filter(
      (r) =>
        targetMonths.includes(r.month) &&
        (includeResolved || !r.resolvedAt)
    );

    const salarySummary = targetMonths.map((month) => {
      const monthSalaries = salaryRecords.filter((s) => s.month === month);
      const totalSalary = monthSalaries.reduce(
        (sum, s) => sum + s.totalSalary,
        0
      );
      const backpayCount = monthSalaries.filter((s) => s.isBackpay).length;

      return {
        month,
        employeeCount: monthSalaries.length,
        totalSalary,
        backpayCount,
        avgSalary: monthSalaries.length > 0 ? totalSalary / monthSalaries.length : 0,
      };
    });

    return {
      exportDate: new Date().toISOString(),
      summary: {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.status === "active").length,
        totalSalaryRecords: salaryRecords.filter((s) =>
          targetMonths.includes(s.month)
        ).length,
        ratioVersions: ratioVersions.length,
        validations: summary,
      },
      salarySummary,
      validations: filteredValidations.map((v) => {
        const employee = employees.find((e) => e.id === v.employeeId);
        return {
          month: v.month,
          employeeNo: employee?.employeeNo || "",
          employeeName: employee?.name || "",
          department: employee?.department || "",
          type: v.type,
          category: v.category,
          description: v.description,
          sources: JSON.stringify(v.sources),
          resolved: !!v.resolvedAt,
          resolution: v.resolution || "",
        };
      }),
    };
  }, [
    selectedMonths,
    months,
    employees,
    salaryRecords,
    ratioVersions,
    validationResults,
    includeResolved,
    summary,
  ]);

  const exportToCSV = () => {
    const headers = [
      "月份",
      "工号",
      "姓名",
      "部门",
      "类型",
      "分类",
      "描述",
      "数据来源",
      "是否已解决",
      "差异说明",
    ];

    const typeMap: Record<string, string> = {
      conflict: "冲突",
      warning: "警告",
      info: "信息",
    };

    const categoryMap: Record<string, string> = {
      resign_not_stop: "离职未停缴",
      backpay_cross_month: "补缴跨月",
      ratio_version_mismatch: "比例版本错配",
      ratio_delayed: "比例延迟到版",
      data_inconsistency: "数据不一致",
    };

    const rows = exportData.validations.map((v) => [
      v.month,
      v.employeeNo,
      v.employeeName,
      v.department,
      typeMap[v.type] || v.type,
      categoryMap[v.category] || v.category,
      `"${v.description}"`,
      `"${v.sources}"`,
      v.resolved ? "是" : "否",
      `"${v.resolution}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `企业年金归集校验报告_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `企业年金归集校验报告_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (exportFormat === "csv") {
      exportToCSV();
    } else {
      exportToJSON();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">报表导出</h1>
        <p className="text-slate-500 mt-1">生成归集校验报告，下载复盘数据</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-500" />
              选择导出月份
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => toggleMonth(month)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    selectedMonths.includes(month)
                      ? "bg-accent-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {month}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllMonths}
                className="text-sm text-accent-600 hover:text-accent-700"
              >
                全选
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                清空
              </button>
            </div>
            {selectedMonths.length === 0 && (
              <p className="text-sm text-slate-400 mt-2">
                未选择月份时将导出全部月份数据
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent-500" />
              导出配置
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  导出格式
                </label>
                <div className="flex gap-4">
                  <label
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer",
                      exportFormat === "csv"
                        ? "border-accent-500 bg-accent-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === "csv"}
                      onChange={() => setExportFormat("csv")}
                      className="hidden"
                    />
                    <FileSpreadsheet
                      className={cn(
                        "w-5 h-5",
                        exportFormat === "csv"
                          ? "text-accent-500"
                          : "text-slate-400"
                      )}
                    />
                    <span>CSV</span>
                  </label>
                  <label
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer",
                      exportFormat === "json"
                        ? "border-accent-500 bg-accent-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === "json"}
                      onChange={() => setExportFormat("json")}
                      className="hidden"
                    />
                    <FileJson
                      className={cn(
                        "w-5 h-5",
                        exportFormat === "json"
                          ? "text-accent-500"
                          : "text-slate-400"
                      )}
                    />
                    <span>JSON</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeResolved}
                    onChange={(e) => setIncludeResolved(e.target.checked)}
                    className="rounded text-accent-500 focus:ring-accent-500"
                  />
                  <span className="text-sm text-slate-700">
                    包含已处理的校验结果
                  </span>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            导出报告
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">导出摘要</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">员工总数</span>
                <span className="font-medium text-slate-800">
                  {exportData.summary.totalEmployees}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">在职员工</span>
                <span className="font-medium text-slate-800">
                  {exportData.summary.activeEmployees}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">工资记录数</span>
                <span className="font-medium text-slate-800">
                  {exportData.summary.totalSalaryRecords}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">比例版本数</span>
                <span className="font-medium text-slate-800">
                  {exportData.summary.ratioVersions}
                </span>
              </div>
              <hr className="border-slate-200" />
              <div className="flex justify-between">
                <span className="text-slate-500">校验项总数</span>
                <span className="font-medium text-slate-800">
                  {exportData.summary.validations.total}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-500">冲突</span>
                <span className="font-medium text-red-600">
                  {exportData.summary.validations.conflicts}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-500">警告</span>
                <span className="font-medium text-amber-600">
                  {exportData.summary.validations.warnings}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500">已处理</span>
                <span className="font-medium text-green-600">
                  {exportData.summary.validations.resolved}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">工资表摘要</h3>
            <div className="space-y-4">
              {exportData.salarySummary.slice(0, 3).map((item) => (
                <div key={item.month} className="bg-slate-50 rounded-lg p-3">
                  <div className="font-medium text-slate-800">{item.month}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">人数</span>
                      <p className="font-medium text-slate-700">
                        {item.employeeCount}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">总额</span>
                      <p className="font-medium text-slate-700">
                        ¥{item.totalSalary.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">平均</span>
                      <p className="font-medium text-slate-700">
                        ¥{Math.round(item.avgSalary).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">补缴</span>
                      <p className="font-medium text-slate-700">
                        {item.backpayCount} 人
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {exportData.salarySummary.length > 3 && (
                <p className="text-sm text-slate-400 text-center">
                  还有 {exportData.salarySummary.length - 3} 个月数据...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
