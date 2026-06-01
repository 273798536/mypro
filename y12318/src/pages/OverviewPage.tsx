import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, ArrowUpDown, TrendingUp, TrendingDown, Clock, FileEdit, Shield, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { useStore } from "@/store/useStore";
import type { ReplenishmentSuggestion } from "@/types";

const CATEGORIES = ["乳制品", "蛋品", "肉制品", "水果", "粮食", "调味品", "烘焙", "海鲜"];
const STORES = ["华东仓", "华北仓", "华南仓"];
const ANOMALY_OPTIONS = [
  { key: "demand_surge", label: "需求突增", icon: TrendingUp },
  { key: "arrival_delay", label: "到货延迟", icon: Clock },
  { key: "negative_inventory", label: "负库存被覆盖", icon: AlertTriangle },
  { key: "remark_change", label: "备注变更", icon: FileEdit },
] as const;
const PRIORITY_BADGE: Record<string, string> = { critical: "badge-danger", high: "badge-warning", medium: "badge-info", low: "badge-success" };
const PRIORITY_LABEL: Record<string, string> = { critical: "紧急", high: "高", medium: "中", low: "低" };
const ANOMALY_ICON_MAP: Record<string, React.ElementType> = { demand_surge: TrendingUp, arrival_delay: Clock, negative_inventory: TrendingDown, remark_change: FileEdit };

function probToColor(p: number): string {
  if (p <= 0.3) return "#34C759";
  if (p <= 0.5) return "#8BC34A";
  if (p <= 0.7) return "#E8A838";
  return "#FF3B30";
}

function ConsistencyStatusBar({ rate }: { rate: number }) {
  const pct = Math.round(rate);
  return (
    <div className="card flex items-center gap-4 py-3">
      <Shield className="w-5 h-5 text-steel shrink-0" />
      <span className="text-sm text-text-secondary whitespace-nowrap">销售-库存一致性</span>
      <div className="flex-1 h-2.5 bg-base-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#34C759" : pct >= 50 ? "#E8A838" : "#FF3B30" }}
        />
      </div>
      <span className="mono text-sm font-medium" style={{ color: pct >= 80 ? "#34C759" : pct >= 50 ? "#E8A838" : "#FF3B30" }}>
        {pct}%
      </span>
    </div>
  );
}

function AnomalyFilter({ selected, onToggle }: { selected: Set<string>; onToggle: (k: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-4 h-4 text-text-muted" />
      {ANOMALY_OPTIONS.map((opt) => {
        const active = selected.has(opt.key);
        return (
          <button
            key={opt.key}
            onClick={() => onToggle(opt.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
              active ? "bg-steel/20 text-steel border border-steel/40" : "bg-base-100 text-text-secondary border border-transparent hover:border-base-200"
            }`}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ProbabilityHeatmap({ suggestions }: { suggestions: ReplenishmentSuggestion[] }) {
  const [tooltip, setTooltip] = useState<{ cat: string; store: string; val: number } | null>(null);

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number[]>> = {};
    CATEGORIES.forEach((c) => { m[c] = {}; STORES.forEach((s) => { m[c][s] = []; }); });
    suggestions.forEach((s) => {
      if (m[s.category]?.[s.store]) m[s.category][s.store].push(s.probabilityP75);
    });
    return m;
  }, [suggestions]);

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-text-primary mb-3">缺货概率热力图</h3>
      <div className="relative">
        <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${STORES.length}, 1fr)` }}>
          <div />
          {STORES.map((s) => (
            <div key={s} className="text-xs text-text-secondary text-center py-1.5">{s}</div>
          ))}
          {CATEGORIES.map((cat) => (
            <div key={cat} className="contents">
              <div className="text-xs text-text-secondary flex items-center pr-2">{cat}</div>
              {STORES.map((store) => {
                const vals = matrix[cat][store];
                const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                return (
                  <div
                    key={`${cat}-${store}`}
                    className="rounded-sm h-9 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: vals.length ? probToColor(avg) : "#2D3139", opacity: vals.length ? 0.85 : 0.3 }}
                    onMouseEnter={() => setTooltip({ cat, store, val: avg })}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {vals.length > 0 && <span className="mono text-[11px] text-white font-medium">{(avg * 100).toFixed(0)}%</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {tooltip && (
          <div className="absolute top-0 right-0 bg-base-50 border border-base-100 rounded-md px-3 py-2 shadow-lg z-10 pointer-events-none">
            <p className="text-xs text-text-secondary">{tooltip.cat} · {tooltip.store}</p>
            <p className="mono text-sm text-text-primary">P75: {(tooltip.val * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SafetyStockChart({ suggestions }: { suggestions: ReplenishmentSuggestion[] }) {
  const data = useMemo(() =>
    suggestions.map((s) => ({
      name: s.skuName.length > 6 ? s.skuName.slice(0, 6) + "…" : s.skuName,
      currentStock: s.currentStock,
      safetyStock: s.safetyStock,
      below: s.currentStock < s.safetyStock,
    })),
    [suggestions]
  );

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-text-primary mb-3">安全库存水位</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis dataKey="name" tick={{ fill: "#8E8E93", fontSize: 11 }} axisLine={{ stroke: "#2D3139" }} tickLine={false} />
          <YAxis tick={{ fill: "#8E8E93", fontSize: 11 }} axisLine={{ stroke: "#2D3139" }} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: "#22262E", border: "1px solid #2D3139", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "#F5F5F7" }}
            itemStyle={{ color: "#8E8E93" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8E8E93" }} />
          <Bar dataKey="currentStock" name="当前库存" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.below ? "#FF3B30" : "#4A90D9"} />
            ))}
          </Bar>
          <Bar dataKey="safetyStock" name="安全库存" fill="#3A3F4B" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type SortKey = "skuId" | "category" | "currentStock" | "safetyStock" | "suggestedQty" | "confidence" | "priority";

function SuggestionTable({
  suggestions,
  anomalyFilter,
}: {
  suggestions: ReplenishmentSuggestion[];
  anomalyFilter: Set<string>;
}) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = suggestions;
    if (anomalyFilter.size > 0) {
      list = list.filter((s) => s.anomalyTypes.some((t) => anomalyFilter.has(t)));
    }
    return list;
  }, [suggestions, anomalyFilter]);

  const sorted = useMemo(() => {
    const priOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...filtered].sort((a, b) => {
      const av = sortKey === "priority" ? priOrder[a.priority] : a[sortKey];
      const bv = sortKey === "priority" ? priOrder[b.priority] : b[sortKey];
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const cols: { key: SortKey; label: string }[] = [
    { key: "skuId", label: "SKU" },
    { key: "category", label: "品类" },
    { key: "currentStock", label: "当前库存" },
    { key: "safetyStock", label: "安全库存" },
    { key: "suggestedQty", label: "补货量" },
    { key: "confidence", label: "置信度" },
    { key: "priority", label: "优先级" },
  ];

  return (
    <div className="card overflow-x-auto">
      <h3 className="text-sm font-medium text-text-primary mb-3">补货建议</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-base-100">
            {cols.map((c) => (
              <th
                key={c.key}
                className="text-left text-xs text-text-muted font-medium py-2 px-3 cursor-pointer hover:text-text-secondary select-none"
                onClick={() => toggleSort(c.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  <ArrowUpDown className={`w-3 h-3 ${sortKey === c.key ? "text-steel" : "text-text-muted"}`} />
                </span>
              </th>
            ))}
            <th className="text-left text-xs text-text-muted font-medium py-2 px-3">异常标记</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.skuId}
              className="border-b border-base-100/50 hover:bg-base-100/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/detail/${s.skuId}`)}
            >
              <td className="py-2.5 px-3 mono text-text-primary">{s.skuId}</td>
              <td className="py-2.5 px-3 text-text-secondary">{s.category}</td>
              <td className="py-2.5 px-3 mono" style={{ color: s.currentStock < s.safetyStock ? "#FF3B30" : "#F5F5F7" }}>{s.currentStock}</td>
              <td className="py-2.5 px-3 mono text-text-secondary">{s.safetyStock}</td>
              <td className="py-2.5 px-3 mono text-steel">{s.suggestedQty}</td>
              <td className="py-2.5 px-3 mono text-text-secondary">{(s.confidence * 100).toFixed(0)}%</td>
              <td className="py-2.5 px-3"><span className={PRIORITY_BADGE[s.priority]}>{PRIORITY_LABEL[s.priority]}</span></td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-1">
                  {s.anomalyTypes.map((t) => {
                    const Icon = ANOMALY_ICON_MAP[t] || AlertTriangle;
                    return <Icon key={t} className="w-3.5 h-3.5 text-amber" />;
                  })}
                </div>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={8} className="py-8 text-center text-text-muted text-sm">无匹配数据</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function OverviewPage() {
  const { suggestions, consistencyRate, sampleLoaded } = useStore();
  const [anomalyFilter, setAnomalyFilter] = useState<Set<string>>(new Set());

  const toggleAnomaly = (key: string) => {
    setAnomalyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (!sampleLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Shield className="w-12 h-12 text-text-muted" />
        <p className="text-text-secondary">暂无数据，请先导入</p>
        <Link to="/import" className="btn-primary">前往导入</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-text-primary">概览分析台</h1>

      <ConsistencyStatusBar rate={consistencyRate} />

      <AnomalyFilter selected={anomalyFilter} onToggle={toggleAnomaly} />

      <div className="grid grid-cols-2 gap-5">
        <ProbabilityHeatmap suggestions={suggestions} />
        <SafetyStockChart suggestions={suggestions} />
      </div>

      <SuggestionTable suggestions={suggestions} anomalyFilter={anomalyFilter} />
    </div>
  );
}
