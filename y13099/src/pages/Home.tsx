import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { FilterPanel } from "@/components/common/FilterPanel";
import { PlanCard } from "@/components/common/PlanCard";
import { STATUS_LABEL_MAP, PlanStatus } from "@shared/types";
import {
  Layers,
  Search,
  AlertTriangle,
  FileText,
  Camera,
  Info,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {
  const {
    plans,
    plansTotal,
    fetchPlans,
    filterSnapshot,
    loading,
    setShowRejudgeModal,
    exceptions,
    fetchExceptions,
  } = useStore();

  const [statusTab, setStatusTab] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchPlans();
    fetchExceptions();
  }, [fetchPlans, fetchExceptions]);

  const handleFilter = (filters: {
    status?: string;
    corridorCode?: string;
    from?: string;
    to?: string;
  }) => {
    fetchPlans(filters);
    if (filters.status) {
      setStatusTab(filters.status);
    }
  };

  const exceptionCount = exceptions.filter(
    (p) => p.status === "exception" || p.status === "supplement"
  ).length;

  const filteredPlans = plans.filter((plan) => {
    const matchStatus =
      statusTab === "all" || plan.status === statusTab;
    const matchSearch =
      !searchText ||
      plan.corridorCode.toLowerCase().includes(searchText.toLowerCase()) ||
      plan.corridorName.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusTabs: Array<{ key: string; label: string; status?: PlanStatus }> =
    [
      { key: "all", label: "全部" },
      { key: "pass", label: "通过放行", status: "pass" },
      { key: "supplement", label: "待补材料", status: "supplement" },
      { key: "exception", label: "异常待审", status: "exception" },
      { key: "withdrawn", label: "已撤回", status: "withdrawn" },
    ];

  const stats = [
    {
      label: "方案总数",
      value: plansTotal,
      icon: Layers,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "通过放行",
      value: plans.filter((p) => p.status === "pass").length,
      icon: FileText,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "待办处理",
      value: plans.filter(
        (p) => p.status === "supplement" || p.status === "exception"
      ).length,
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "已撤回",
      value: plans.filter((p) => p.status === "withdrawn").length,
      icon: RefreshCw,
      color: "text-muted",
      bg: "bg-muted/10",
    },
  ];

  return (
    <div className="min-h-screen p-6 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-2">
            <Camera className="w-3.5 h-3.5" />
            <span>
              筛选条件可追溯至传感器原始记录，截图自动包含条件水印
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text mb-1.5">
            低空航线走廊方案比选
          </h1>
          <p className="text-sm text-text-secondary">
            管理走廊方案的筛选、判定、改判与收尾全流程
          </p>
        </div>
        <Link
          to="/exceptions"
          className="btn-secondary text-sm"
        >
          <AlertTriangle className="w-4 h-4 text-warning" />
          异常队列
          {exceptionCount > 0 && (
            <span className="bg-warning/20 text-warning text-xs px-2 py-0.5 rounded-full">
              {exceptionCount}
            </span>
          )}
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card p-4"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-text mb-0.5 font-mono">
                {stat.value}
              </div>
              <div className="text-xs text-muted">{stat.label}</div>
            </div>
          );
        })}
      </motion.div>

      <FilterPanel
        onFilter={handleFilter}
        filterSnapshot={filterSnapshot}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-5"
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {statusTabs.map((tab) => {
              const count =
                tab.key === "all"
                  ? plans.length
                  : plans.filter((p) => p.status === tab.status).length;
              const isActive = statusTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusTab(tab.key);
                    if (tab.key === "all") {
                      fetchPlans({ ...filterSnapshot, status: undefined });
                    } else {
                      fetchPlans({ ...filterSnapshot, status: tab.key });
                    }
                  }}
                  className={`filter-chip ${isActive ? "filter-chip-active" : ""}`}
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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索走廊编号/名称..."
              className="bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-primary/60 w-60"
            />
          </div>
        </div>

        {Object.keys(filterSnapshot).length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
            <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-text-secondary">
              当前生效筛选：
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
              条件已关联，可溯源
            </span>
          </div>
        )}
      </motion.div>

      {loading.plans ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card h-44 animate-pulse bg-surface"
            />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-3 text-muted opacity-40" />
          <h3 className="text-base font-medium text-text mb-1">暂无方案数据</h3>
          <p className="text-sm text-muted">请调整筛选条件后重试</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredPlans.map((plan, idx) => (
            <div
              key={plan.id}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <PlanCard
                plan={plan}
                onRejudge={(id) => setShowRejudgeModal(true, id)}
              />
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
