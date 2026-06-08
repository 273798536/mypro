import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format as formatDate } from "date-fns";
import { useRecordsStore } from "@/store/useRecordsStore";
import PageHeader from "@/components/PageHeader";
import { ANOMALY_META } from "../../shared/constants";
import type { Record, ExportFormat, AnomalyType } from "../../shared/types";
import { Eye, Download } from "lucide-react";

type RecordScope = "all" | "anomaly" | "custom";

export default function ExportPage() {
  const { records, loading, fetchRecords } = useRecordsStore();

  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [recordScope, setRecordScope] = useState<RecordScope>("anomaly");
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter((r) => new Date(r.createdAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000;
      result = result.filter((r) => new Date(r.createdAt).getTime() <= end);
    }

    if (recordScope === "anomaly") {
      result = result.filter((r) => r.status === "anomaly");
    } else if (recordScope === "custom") {
      result = result.filter((r) => selectedRecordIds.includes(r.id));
    }

    return result;
  }, [records, startDate, endDate, recordScope, selectedRecordIds]);

  const anomalyRecords = useMemo(
    () => filteredRecords.filter((r) => r.status === "anomaly" && r.anomalyType),
    [filteredRecords]
  );

  const stats = useMemo(() => {
    return {
      total: filteredRecords.length,
      anomaly: filteredRecords.filter((r) => r.status === "anomaly").length,
      corrected: filteredRecords.filter((r) => r.status === "corrected").length,
      pending: filteredRecords.filter((r) => r.status === "pending").length,
    };
  }, [filteredRecords]);

  const toggleRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const generateMarkdown = useMemo(() => {
    const now = new Date();
    const lines: string[] = [];

    lines.push("# 救援绳索角度模拟复核报告");
    lines.push("");
    lines.push("## 报告摘要");
    lines.push("");
    lines.push(`- **导出时间**：${formatDate(now, "yyyy-MM-dd HH:mm:ss")}`);
    lines.push(`- **总记录数**：${stats.total}`);
    lines.push(`- **异常记录**：${stats.anomaly}`);
    lines.push(`- **已修正**：${stats.corrected}`);
    lines.push(`- **待处理**：${stats.pending}`);
    lines.push("");

    lines.push("## 异常记录明细");
    lines.push("");

    if (anomalyRecords.length === 0) {
      lines.push("> 暂无异常记录");
      lines.push("");
    } else {
      anomalyRecords.forEach((record) => {
        const meta = record.anomalyType ? ANOMALY_META[record.anomalyType as AnomalyType] : null;
        lines.push(`### 记录编号 [${record.recordNumber}]`);
        lines.push("");
        lines.push(`**异常类型**：${meta ? meta.name : record.anomalyType}`);
        lines.push("");
        lines.push(`**拦截原因**：${meta ? meta.blockingReason : "无"}`);
        lines.push("");
        lines.push(`**异常说明**：${record.anomalyDescription || "无"}`);
        lines.push("");
        lines.push(`**影响范围**：${meta ? meta.impact : "无"}`);
        lines.push("");
        lines.push("**当前参数**：");
        lines.push("");
        lines.push(`- 时间参数：${record.timeParameter}`);
        lines.push(`- 绳索角度：${record.ropeAngle}°`);
        lines.push(`- 绳索张力：${record.ropeTension}kgf`);
        lines.push(`- 绳索长度：${record.ropeLength}m`);
        lines.push("");
        lines.push("**处理建议**：");
        lines.push("");
        if (meta && meta.suggestions.length > 0) {
          meta.suggestions.forEach((s, idx) => {
            lines.push(`${idx + 1}. **${s.action}**：${s.description}`);
          });
        } else {
          lines.push("1. 请联系相关人员复核。");
        }
        lines.push("");
        lines.push("---");
        lines.push("");
      });
    }

    lines.push("## 附录：操作建议速查表");
    lines.push("");
    lines.push("| 异常类型 | 下一步操作路径 |");
    lines.push("| --- | --- |");
    Object.entries(ANOMALY_META).forEach(([key, meta]) => {
      const actionPath = meta.nextActionType === "material" ? "补充材料" : "校准参数";
      lines.push(`| ${meta.name} | ${actionPath} → ${meta.suggestions[0]?.action || "查看详情"} |`);
    });
    lines.push("");

    return lines.join("\n");
  }, [anomalyRecords, stats]);

  const handleExport = async () => {
    const config = {
      format,
      recordIds: recordScope === "custom" ? selectedRecordIds : undefined,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      includeHistory,
      includeCharts,
    };

    try {
      const response = await axios.post("/api/export", config, {
        responseType: "blob",
      });

      const now = new Date();
      const timestamp = formatDate(now, "yyyyMMdd-HHmm");
      const ext = format === "markdown" ? "md" : format;
      const filename = `rescue-rope-report-${timestamp}.${ext}`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      const now = new Date();
      const timestamp = formatDate(now, "yyyyMMdd-HHmm");
      const ext = format === "markdown" ? "md" : format;
      const filename = `rescue-rope-report-${timestamp}.${ext}`;
      const blob = new Blob([generateMarkdown], { type: "text/markdown" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="报告导出"
        description="导出给运维组查看的报告，包含每条异常记录的拦截原因与处理建议"
        actions={
          <>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "隐藏预览" : "预览"}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </>
        }
      />

      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">导出配置</h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">导出格式</label>
              <div className="flex gap-4">
                {(["csv", "json", "markdown"] as ExportFormat[]).map((f) => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={f}
                      checked={format === f}
                      onChange={() => setFormat(f)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">
                      {f === "csv" ? "CSV" : f === "json" ? "JSON" : "Markdown"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">时间范围</label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-slate-500">至</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">记录范围</label>
              <div className="flex gap-4">
                {(["all", "anomaly", "custom"] as RecordScope[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      value={s}
                      checked={recordScope === s}
                      onChange={() => setRecordScope(s)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">
                      {s === "all" ? "全部记录" : s === "anomaly" ? "仅异常记录" : "自定义选择"}
                    </span>
                  </label>
                ))}
              </div>

              {recordScope === "custom" && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                  {loading ? (
                    <div className="text-sm text-slate-500">加载中...</div>
                  ) : records.length === 0 ? (
                    <div className="text-sm text-slate-500">暂无记录</div>
                  ) : (
                    <div className="space-y-2">
                      {records.map((record: Record) => (
                        <label key={record.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRecordIds.includes(record.id)}
                            onChange={() => toggleRecord(record.id)}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-slate-700">
                            {record.recordNumber}
                          </span>
                          <span className="text-xs text-slate-500">
                            {record.timeParameter}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">附加选项</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHistory}
                    onChange={(e) => setIncludeHistory(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">包含修改历史</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">包含图表数据</span>
                </label>
              </div>
            </div>

            <div className="pt-2 text-sm text-slate-500">
              当前选择：共 {filteredRecords.length} 条记录，其中异常 {anomalyRecords.length} 条
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">报告预览</h3>
            </div>
            <div
              className="p-6 bg-slate-100 max-h-[500px] overflow-y-auto"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
            >
              <pre className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                {generateMarkdown}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
