import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Filter, Loader2 } from "lucide-react";
import { useStore, type ExperimentGroup } from "@/store";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

function MiniSparkline({ data, width = 80, height = 28 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`);
  const pathD = `M${points.join(" L")}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={pathD} fill="none" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupCard({ group, sparklineData }: { group: ExperimentGroup; sparklineData: number[] }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/curve/${group.id}`)}
      className="card-hover w-full rounded-2xl border border-surface-dark/60 bg-white p-5 text-left shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="heading-font text-base font-semibold text-primary-dark line-clamp-1">
          {group.name}
        </h3>
        <StatusBadge status={group.conclusionStatus} size="sm" />
      </div>
      <p className="mb-4 text-sm text-info line-clamp-2">{group.description}</p>

      <div className="mb-3 flex items-end justify-between">
        <div className="space-y-1 text-xs text-info">
          <div>植株数量: <span className="font-medium text-primary-dark">{group.plantCount}</span></div>
          <div>最近测量: <span className="font-medium text-primary-dark">{group.lastMeasuredAt?.slice(0, 10) ?? "-"}</span></div>
        </div>
        <MiniSparkline data={sparklineData} />
      </div>
    </button>
  );
}

export default function GroupStats() {
  const { groups, groupsLoading, fetchGroups, checkSeedStatus, initSeed, seedStatus } = useStore();
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [annotationFilter, setAnnotationFilter] = useState<"" | "normal" | "abnormal" | "pending">("");

  useEffect(() => {
    const init = async () => {
      await checkSeedStatus();
      if (!useStore.getState().seedStatus) {
        await initSeed();
      }
      await fetchGroups();
    };
    init();
  }, [fetchGroups, checkSeedStatus, initSeed]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (dateFrom && g.lastMeasuredAt < dateFrom) return false;
      if (dateTo && g.lastMeasuredAt > dateTo + "T23:59:59") return false;
      if (annotationFilter && g.conclusionStatus !== annotationFilter) return false;
      if (batchFilter && !g.name.includes(batchFilter) && !g.description.includes(batchFilter)) return false;
      return true;
    });
  }, [groups, dateFrom, dateTo, batchFilter, annotationFilter]);

  const generateSparkline = (group: ExperimentGroup): number[] => {
    const seed = group.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const data: number[] = [];
    let val = 10 + (seed % 20);
    for (let i = 0; i < 8; i++) {
      val += (Math.sin(seed + i) * 3 + 2);
      data.push(Math.max(0, val));
    }
    return data;
  };

  if (groupsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-surface-dark/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-info" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-primary-dark outline-none focus:border-primary"
            placeholder="开始日期"
          />
          <span className="text-sm text-info">至</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-primary-dark outline-none focus:border-primary"
          />
        </div>

        <input
          type="text"
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          placeholder="搜索批次/名称..."
          className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-primary-dark outline-none focus:border-primary"
        />

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-info" />
          <select
            value={annotationFilter}
            onChange={(e) => setAnnotationFilter(e.target.value as typeof annotationFilter)}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-primary-dark outline-none focus:border-primary"
          >
            <option value="">全部标注</option>
            <option value="normal">正常</option>
            <option value="abnormal">异常</option>
            <option value="pending">待定</option>
          </select>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-info">
          <p className="text-lg">暂无实验分组数据</p>
          <p className="mt-1 text-sm">请检查筛选条件或导入数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              sparklineData={generateSparkline(group)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
