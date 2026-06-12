import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { STATUS_LABEL_MAP, PlanStatus } from "@shared/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  Link2,
  MapPin,
  Clock,
  Camera,
  CheckCircle2,
  Info,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Exceptions() {
  const {
    exceptions,
    fetchExceptions,
    filterSnapshot,
    loading,
    exportExceptions,
    fetchSensorDetail,
  } = useStore();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [corridorSearch, setCorridorSearch] = useState("");
  const [exportInfo, setExportInfo] = useState<{
    time: string;
    format: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const handleFilter = (filters: { status?: string; corridorCode?: string }) => {
    fetchExceptions(filters);
    if (filters.status) {
      setStatusFilter(filters.status);
    }
  };

  const filteredExceptions = exceptions.filter((plan) => {
    const matchStatus =
      statusFilter === "all" || plan.status === statusFilter;
    const matchSearch =
      !corridorSearch ||
      plan.corridorCode
        .toLowerCase()
        .includes(corridorSearch.toLowerCase()) ||
      plan.corridorName
        .toLowerCase()
        .includes(corridorSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleExport = async (format: string) => {
    const filters: {
      format: string;
      status?: string;
      corridorCode?: string;
    } = { format };
    if (statusFilter !== "all") filters.status = statusFilter;
    if (corridorSearch) filters.corridorCode = corridorSearch;
    try {
      const url = await exportExceptions(filters);
      setExportInfo({
        time: new Date().toLocaleString("zh-CN"),
        format: format.toUpperCase(),
        url,
      });
      window.open(url, "_blank");
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-2">
            <Camera className="w-3.5 h-3.5" />
            <span>页面状态与导出文件严格一致，含完整筛选条件快照</span>
          </div>
          <h1 className="text-2xl font-bold text-text mb-1.5 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-warning" />
            异常队列
          </h1>
          <p className="text-sm text-text-secondary">
            管理待补材料与异常待审的方案，支持批量导出
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-sm"
            onClick={() => handleExport("json")}
          >
            <FileJson className="w-4 h-4" />
            导出 JSON
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="w-4 h-4" />
            导出 CSV
          </button>
        </div>
      </motion.div>

      {exportInfo && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-success/5 border border-success/30 rounded-xl flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-text">
              已成功导出 <span className="font-medium">{exportInfo.format}</span>{" "}
              文件，导出时间: {exportInfo.time}
            </p>
            <a
              href={exportInfo.url}
              className="text-xs text-primary hover:text-primary-hover inline-flex items-center gap-1 mt-0.5"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-3 h-3" />
              如未自动下载，点击此处手动下载
            </a>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="card p-4 mb-5"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted mr-1">状态筛选</span>
            {[
              { key: "all", label: "全部" },
              { key: "supplement", label: "待补材料", status: "supplement" as PlanStatus },
              { key: "exception", label: "异常待审", status: "exception" as PlanStatus },
            ].map((tab) => {
              const count =
                tab.key === "all"
                  ? exceptions.length
                  : exceptions.filter((p) => p.status === (tab as { status?: PlanStatus }).status).length;
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key);
                    if (tab.key === "all") {
                      handleFilter({});
                    } else {
                      handleFilter({ status: tab.key });
                    }
                  }}
                  className={`filter-chip text-xs ${isActive ? "filter-chip-active" : ""}`}
                >
                  {tab.label}
                  <span
                    className={`text-xs ${isActive ? "opacity-80" : "text-muted"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={corridorSearch}
              onChange={(e) => setCorridorSearch(e.target.value)}
              placeholder="搜索走廊..."
              className="bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-primary/60 w-52"
            />
          </div>
        </div>

        {Object.keys(filterSnapshot).length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border text-xs">
            <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-text-secondary">
              当前筛选条件：
              {Object.entries(filterSnapshot)
                .map(([k, v]) => {
                  const label =
                    k === "status"
                      ? `状态=${STATUS_LABEL_MAP[v as PlanStatus]}`
                      : k === "corridorCode"
                      ? `走廊=${v}`
                      : `${k}=${v}`;
                  return label;
                })
                .join("  ·  ")}
            </span>
            <span className="text-primary ml-auto flex items-center gap-1">
              <Camera className="w-3 h-3" />
              导出文件包含此条件快照
            </span>
          </div>
        )}
      </motion.div>

      {loading.exceptions ? (
        <div className="card p-12 text-center">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">加载异常队列...</p>
        </div>
      ) : filteredExceptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-12 text-center"
        >
          <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-success opacity-50" />
          <h3 className="text-lg font-semibold text-text mb-1">队列为空</h3>
          <p className="text-sm text-muted">暂无待处理的异常方案</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-hover/50 border-b border-border">
                  <th className="text-left text-xs font-medium text-muted px-5 py-3.5">
                    走廊编号 / 名称
                  </th>
                  <th className="text-left text-xs font-medium text-muted px-4 py-3.5">
                    状态
                  </th>
                  <th className="text-left text-xs font-medium text-muted px-4 py-3.5">
                    传感器说明
                  </th>
                  <th className="text-left text-xs font-medium text-muted px-4 py-3.5">
                    结论摘要
                  </th>
                  <th className="text-left text-xs font-medium text-muted px-4 py-3.5">
                    更新时间
                  </th>
                  <th className="text-right text-xs font-medium text-muted px-5 py-3.5">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExceptions.map((plan, idx) => (
                  <motion.tr
                    key={plan.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-surface-hover/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-mono text-xs text-muted">
                            {plan.corridorCode}
                          </div>
                          <div className="text-sm font-medium text-text">
                            {plan.corridorName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={plan.status} />
                      <div className="text-[10px] text-muted mt-1 font-mono">
                        code: {plan.status}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-text-secondary line-clamp-2 max-w-xs">
                        {plan.sensorSourceSummary}
                      </p>
                      <button
                        className="text-[11px] text-primary hover:text-primary-hover inline-flex items-center gap-1 mt-1"
                        onClick={() => {
                          const sensorId = plan.id;
                          fetchSensorDetail(
                            exceptions.find((p) => p.id === plan.id)?.id ||
                              sensorId
                          );
                        }}
                      >
                        <Link2 className="w-3 h-3" />
                        溯源传感器
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-text-secondary line-clamp-2 max-w-sm">
                        {plan.conclusionSummary}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Clock className="w-3.5 h-3.5 text-muted" />
                        {format(new Date(plan.updatedAt), "yyyy-MM-dd HH:mm", {
                          locale: zhCN,
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/plan/${plan.id}`}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          查看详情
                        </Link>
                        <FileSpreadsheet className="w-4 h-4 text-muted hover:text-primary cursor-pointer transition-colors" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3.5 border-t border-border bg-surface-hover/20 flex items-center justify-between">
            <div className="text-xs text-muted">
              共 <span className="text-text font-medium">{filteredExceptions.length}</span>{" "}
              条异常记录
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning" />
                待补材料:{" "}
                <span className="text-text font-medium">
                  {filteredExceptions.filter((p) => p.status === "supplement").length}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-danger" />
                异常待审:{" "}
                <span className="text-text font-medium">
                  {filteredExceptions.filter((p) => p.status === "exception").length}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {[
          {
            title: "状态一致性",
            desc: "导出文件中的状态枚举值与页面显示完全一致",
            icon: CheckCircle2,
            color: "success",
          },
          {
            title: "筛选条件快照",
            desc: "导出文件包含筛选条件，截图不再丢失上下文",
            icon: Camera,
            color: "primary",
          },
          {
            title: "可追溯性",
            desc: "每条记录可溯源至触发异常的传感器原始读数",
            icon: Link2,
            color: "warning",
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`bg-${item.color}/5 border border-${item.color}/20 rounded-xl p-4`}
              style={{
                backgroundColor:
                  item.color === "success"
                    ? "rgba(0, 196, 140, 0.05)"
                    : item.color === "primary"
                    ? "rgba(0, 212, 170, 0.05)"
                    : "rgba(255, 176, 32, 0.05)",
                borderColor:
                  item.color === "success"
                    ? "rgba(0, 196, 140, 0.2)"
                    : item.color === "primary"
                    ? "rgba(0, 212, 170, 0.2)"
                    : "rgba(255, 176, 32, 0.2)",
              }}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                  item.color === "success"
                    ? "bg-success/15"
                    : item.color === "primary"
                    ? "bg-primary/15"
                    : "bg-warning/15"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 ${
                    item.color === "success"
                      ? "text-success"
                      : item.color === "primary"
                      ? "text-primary"
                      : "text-warning"
                  }`}
                />
              </div>
              <h4 className="text-sm font-semibold text-text mb-1">
                {item.title}
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
