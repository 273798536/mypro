import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, FileText, Loader2 } from "lucide-react";
import { useStore, type GrowthMeasurement } from "@/store";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

const PLANT_COLORS = [
  "#2D6A4F", "#52B788", "#577590", "#E09F3E", "#E63946",
  "#457B9D", "#1B4332", "#8AC926", "#6A4C93", "#F4845F",
];

const PLANTS_PER_PAGE = 5;

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

export default function CurveDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { currentGroup, curves, curvePlants, fetchCurves, fetchConclusion } = useStore();

  const [page, setPage] = useState(0);
  const [showConclusion, setShowConclusion] = useState(false);
  const [visiblePlants, setVisiblePlants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      setLoading(true);
      await fetchCurves(groupId);
      setLoading(false);
    };
    load();
  }, [groupId, fetchCurves]);

  const plantsByGroup = useMemo(() => {
    const map = new Map<string, { code: string; measurements: GrowthMeasurement[] }>();
    for (const plant of curvePlants) {
      map.set(plant.plantId, {
        code: plant.plantCode,
        measurements: plant.measurements,
      });
    }
    return map;
  }, [curvePlants]);

  const plantIds = useMemo(() => Array.from(plantsByGroup.keys()), [plantsByGroup]);
  const totalPages = Math.max(1, Math.ceil(plantIds.length / PLANTS_PER_PAGE));

  const pagePlantIds = useMemo(() => {
    const start = page * PLANTS_PER_PAGE;
    return plantIds.slice(start, start + PLANTS_PER_PAGE);
  }, [plantIds, page]);

  useEffect(() => {
    setVisiblePlants(new Set(pagePlantIds));
  }, [pagePlantIds]);

  const chartData = useMemo(() => {
    if (pagePlantIds.length === 0) return [];
    const maxDays = Math.max(
      ...pagePlantIds.map((pid) => plantsByGroup.get(pid)?.measurements.length ?? 0),
      1
    );
    const data: Record<string, number | string>[] = [];
    for (let d = 0; d < maxDays; d++) {
      const row: Record<string, number | string> = { dayIndex: d + 1 };
      pagePlantIds.forEach((pid) => {
        const plant = plantsByGroup.get(pid);
        const m = plant?.measurements[d];
        if (m) row[pid] = m.height;
      });
      data.push(row);
    }
    return data;
  }, [pagePlantIds, plantsByGroup]);

  const togglePlant = (pid: string) => {
    setVisiblePlants((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleViewConclusion = async () => {
    if (groupId) await fetchConclusion(groupId);
    setShowConclusion(true);
  };

  const getPlantLabel = (pid: string) => {
    return plantsByGroup.get(pid)?.code ?? pid.slice(0, 8);
  };

  const customTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: number }) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-xl border border-surface-dark bg-white p-3 shadow-lg">
        <p className="mb-1 text-xs font-medium text-info">第 {label} 天</p>
        {payload.map((item) => (
          <p key={item.dataKey} className="text-xs" style={{ color: item.color }}>
            {getPlantLabel(item.dataKey)}: {item.value?.toFixed(1)} cm
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showConclusion && currentGroup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConclusion(false)}
            className="rounded-lg p-1.5 text-info hover:bg-surface-dark"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="heading-font text-xl font-semibold text-primary-dark">
            {currentGroup.name} - 结论
          </h2>
        </div>

        <div className="rounded-2xl border border-surface-dark/60 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm font-medium text-info">结论状态:</span>
            <StatusBadge status={currentGroup.conclusionStatus} />
          </div>
          <div className="mb-4">
            <span className="text-sm font-medium text-info">结论:</span>
            <p className="mt-1 text-sm text-primary-dark">
              {currentGroup.conclusion ?? "暂无结论"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-surface p-4 text-center">
              <div className="text-2xl font-bold text-primary">{currentGroup.plantCount}</div>
              <div className="text-xs text-info">植株数量</div>
            </div>
            <div className="rounded-xl bg-surface p-4 text-center">
              <div className="text-2xl font-bold text-info">{curves.length}</div>
              <div className="text-xs text-info">测量记录</div>
            </div>
            <div className="rounded-xl bg-surface p-4 text-center">
              <div className="text-2xl font-bold text-accent">
                {curves.filter((c) => c.annotation === "abnormal").length}
              </div>
              <div className="text-xs text-info">异常标注</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="rounded-lg p-1.5 text-info hover:bg-surface-dark"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="heading-font text-xl font-semibold text-primary-dark">
          {currentGroup?.name ?? "加载中..."}
        </h2>
        {currentGroup && <StatusBadge status={currentGroup.conclusionStatus} size="sm" />}
      </div>

      <div className="flex flex-wrap gap-2">
        {pagePlantIds.map((pid, idx) => {
          const isVisible = visiblePlants.has(pid);
          return (
            <button
              key={pid}
              onClick={() => togglePlant(pid)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                isVisible
                  ? "border-transparent text-white"
                  : "border-surface-dark bg-white text-info"
              )}
              style={isVisible ? { backgroundColor: PLANT_COLORS[idx % PLANT_COLORS.length] } : undefined}
            >
              {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {getPlantLabel(pid)}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-surface-dark/60 bg-white p-5 shadow-sm">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
            <XAxis dataKey="dayIndex" tick={{ fontSize: 12 }} label={{ value: "天数", position: "insideBottomRight", offset: -5, fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: "高度 (cm)", angle: -90, position: "insideLeft", fontSize: 12 }} />
            <Tooltip content={customTooltip} />
            <Legend formatter={(value: string) => getPlantLabel(value)} />
            {pagePlantIds.map((pid, idx) =>
              visiblePlants.has(pid) ? (
                <Line
                  key={pid}
                  type="monotone"
                  dataKey={pid}
                  stroke={PLANT_COLORS[idx % PLANT_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-info hover:bg-surface disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> 上一页
          </button>
          <span className="text-sm text-info">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-info hover:bg-surface disabled:opacity-40"
          >
            下一页 <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {page >= totalPages - 1 && (
          <button
            onClick={handleViewConclusion}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <FileText className="h-4 w-4" /> 查看结论
          </button>
        )}
      </div>
    </div>
  );
}
