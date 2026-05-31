import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/stores/employeeStore";
import { useValidationStore } from "@/stores/validationStore";

export default function Validation() {
  const { employees } = useEmployeeStore();
  const {
    validationResults,
    updateResolution,
    markResolved,
    getSummary,
  } = useValidationStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const summary = getSummary();

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
    info: "bg-blue-100 text-blue-700",
  };

  const sourceLabels: Record<string, string> = {
    archive: "员工档案",
    salary: "工资表",
    ratio: "缴费比例",
  };

  const handleSaveResolution = (id: string) => {
    updateResolution(id, resolutionText);
    markResolved(id);
    setEditingId(null);
    setResolutionText("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">校验结果</h1>
        <p className="text-slate-500 mt-1">查看冲突详情、编写差异说明、确认处理结果</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
          <p className="text-sm text-slate-500">总校验项</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <p className="text-2xl font-bold text-red-600">{summary.conflicts}</p>
          <p className="text-sm text-slate-500">冲突</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <p className="text-2xl font-bold text-amber-600">{summary.warnings}</p>
          <p className="text-sm text-slate-500">警告</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <p className="text-2xl font-bold text-green-600">{summary.resolved}</p>
          <p className="text-sm text-slate-500">已处理</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">校验结果列表</h3>
        </div>

        {validationResults.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无校验结果</p>
            <p className="text-sm text-slate-400 mt-1">请先在首页运行归集校验</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {validationResults.map((result) => {
              const employee = employees.find((e) => e.id === result.employeeId);
              const isExpanded = expandedId === result.id;
              const isEditing = editingId === result.id;

              return (
                <div key={result.id}>
                  <div
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : result.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium border",
                              typeColors[result.type]
                            )}
                          >
                            {result.type === "conflict"
                              ? "冲突"
                              : result.type === "warning"
                              ? "警告"
                              : "信息"}
                          </span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                            {categoryLabels[result.category] || result.category}
                          </span>
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
                      <button className="p-1 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">
                            数据来源对比
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            {Object.entries(result.sources).map(([source, value]) => (
                              <div
                                key={source}
                                className="bg-white rounded p-3 border border-slate-200"
                              >
                                <p className="text-xs text-slate-500">
                                  {sourceLabels[source as keyof typeof sourceLabels] ||
                                    source}
                                </p>
                                <p className="text-sm text-slate-700 mt-1">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">
                            事件时间线
                          </h4>
                          <div className="space-y-2">
                            {result.timeline.map((event, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="w-2 h-2 mt-1.5 bg-accent-500 rounded-full" />
                                <div>
                                  <span className="text-sm text-slate-700">
                                    {event.event}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">
                                    {event.time} · {event.source}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {result.resolution ? (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">
                              差异说明
                            </h4>
                            <p className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                              {result.resolution}
                            </p>
                          </div>
                        ) : isEditing ? (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">
                              编写差异说明
                            </h4>
                            <textarea
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                              rows={3}
                              placeholder="请输入差异说明和处理方案..."
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(null);
                                  setResolutionText("");
                                }}
                                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
                              >
                                取消
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveResolution(result.id);
                                }}
                                className="px-3 py-1.5 text-sm bg-accent-500 hover:bg-accent-600 text-white rounded flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(result.id);
                                setResolutionText("");
                              }}
                              className="text-sm text-accent-600 hover:text-accent-700 flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              编写差异说明
                            </button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
