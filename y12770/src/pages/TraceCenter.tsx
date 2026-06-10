import { useEffect, useState } from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Lightbulb, Clock } from "lucide-react";
import { mockApi, type Anomaly, type Severity } from "@/utils/mock";

const filters: { key: "all" | Severity; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "high", label: "高" },
  { key: "medium", label: "中" },
  { key: "low", label: "低" },
];

const severityConfig = {
  high: { color: "bg-lab-danger", border: "border-l-lab-danger", text: "text-lab-danger", bg: "bg-lab-danger/5", label: "高优先级", Icon: AlertTriangle },
  medium: { color: "bg-lab-warning", border: "border-l-lab-warning", text: "text-lab-warning", bg: "bg-lab-warning/5", label: "中优先级", Icon: AlertCircle },
  low: { color: "bg-lab-success", border: "border-l-lab-success", text: "text-lab-success", bg: "bg-lab-success/5", label: "低优先级", Icon: Info },
};

export default function TraceCenter() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockApi.getAnomalies().then((a) => {
      setAnomalies(a);
      setLoading(false);
    });
  }, []);

  const handleResolve = async (id: string) => {
    await mockApi.markAnomalyResolved(id);
    setAnomalies(anomalies.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  };

  const sorted = [...anomalies].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const filtered = filter === "all" ? sorted : sorted.filter((a) => a.severity === filter);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-lab-textLight">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-lab-bg p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl text-lab-primary">异常留痕中心</h1>
          <p className="text-sm text-lab-textLight mt-1">记录并追踪所有分析过程中的异常事件</p>
        </div>

        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-lab-text mr-2">严重程度筛选：</span>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filter === f.key
                    ? "bg-lab-primary text-white"
                    : "text-lab-textLight hover:text-lab-text hover:bg-lab-bg"
                }`}
              >
                {f.label}
                {f.key !== "all" && (
                  <span className="ml-1.5 opacity-70">
                    ({anomalies.filter((a) => a.severity === f.key && !a.resolved).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CheckCircle className="w-12 h-12 text-lab-success mx-auto mb-3 opacity-50" />
              <p className="text-lab-textLight">暂无异常记录</p>
            </div>
          ) : (
            filtered.map((anomaly) => {
              const config = severityConfig[anomaly.severity];
              const Icon = config.Icon;
              return (
                <div
                  key={anomaly.id}
                  className={`glass-card border-l-4 ${config.border} p-4 ${anomaly.resolved ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium ${config.text} uppercase tracking-wide`}>
                            {config.label}
                          </span>
                          <span className="status-badge bg-lab-bg text-lab-textLight">{anomaly.type}</span>
                          {anomaly.resolved && (
                            <span className="status-success">
                              <CheckCircle className="w-3 h-3" />
                              已解决
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-lab-textLight flex-shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          {anomaly.timestamp}
                        </div>
                      </div>
                      <p className="text-sm text-lab-text mt-2 font-medium">{anomaly.message}</p>
                      <div className="mt-3 p-3 bg-lab-bg rounded-lg border border-lab-border">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-lab-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-lab-text mb-0.5">可操作建议</p>
                            <p className="text-xs text-lab-textLight">{anomaly.suggestion}</p>
                          </div>
                        </div>
                      </div>
                      {!anomaly.resolved && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleResolve(anomaly.id)}
                            className="btn-success text-sm py-1.5 px-3 flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            标记已解决
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
