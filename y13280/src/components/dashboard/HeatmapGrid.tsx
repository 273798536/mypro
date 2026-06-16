import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useFilteredGroups } from "@/hooks/useFilter";
import clsx from "clsx";
import { AlertTriangle, Clock } from "lucide-react";

interface TileInfo {
  groupId: string;
  name: string;
  status: string;
  intensity: number;
  hasLate: boolean;
}

const GRID_ROWS = 4;
const GRID_COLS = 6;

export function HeatmapGrid() {
  const allGroups = useFilteredGroups();
  const variants = useAppStore((s) => s.variants);
  const [hovered, setHovered] = useState<string | null>(null);
  const navigate = useNavigate();

  const tiles: (TileInfo | null)[] = useMemo(() => {
    const result: (TileInfo | null)[] = [];
    const sorted = [...allGroups].sort((a, b) => {
      const rank = { risk: 0, doubtful: 1, pending: 2, merged: 3 } as const;
      return rank[a.status] - rank[b.status];
    });
    for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
      const g = sorted[i];
      if (!g) {
        result.push(null);
        continue;
      }
      const hasLate = variants.some(
        (v) => v.groupId === g.groupId && v.isLateAttachment
      );
      let intensity = 1;
      if (g.status === "risk") intensity = 4;
      else if (g.status === "doubtful") intensity = 3;
      else if (g.status === "pending") intensity = 2;
      result.push({
        groupId: g.groupId,
        name: g.canonicalName,
        status: g.status,
        intensity,
        hasLate,
      });
    }
    return result;
  }, [allGroups, variants]);

  const colorFor = (t: TileInfo | null) => {
    if (!t) return "bg-neutral-100";
    if (t.status === "risk")
      return ["", "bg-risk-100", "bg-risk-300", "bg-risk-500", "bg-risk-600"][
        t.intensity
      ];
    if (t.status === "doubtful")
      return ["", "bg-late-100", "bg-late-200", "bg-late-400", ""][t.intensity];
    if (t.status === "pending")
      return ["", "bg-warning-100", "bg-warning-200", "bg-warning-400", ""][
        t.intensity
      ];
    return ["", "bg-evidence-50", "bg-evidence-100", "bg-evidence-200", ""][
      t.intensity
    ];
  };

  const hoverTile = hovered ? tiles.find((t) => t?.groupId === hovered) : null;

  return (
    <div className="card-base p-5 animate-fade-up" style={{ animationDelay: "50ms" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold">异常标记热力图</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            色深表示异常等级，红点为含晚到附件，点击进详情
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-evidence-100" />
            已归并
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-warning-300" />
            待确认
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-late-400" />
            存疑
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-risk-600" />
            相邻风险
          </div>
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0,1fr))` }}
      >
        {tiles.map((t, idx) => (
          <div key={idx} className="relative aspect-[4/3]">
            <button
              disabled={!t}
              onClick={() => t && navigate(`/merge/${t.groupId}`)}
              onMouseEnter={() => t && setHovered(t.groupId)}
              onMouseLeave={() => setHovered(null)}
              className={clsx(
                "w-full h-full rounded-civic transition-all flex items-end justify-start p-1.5 text-left relative",
                colorFor(t),
                t ? "hover:ring-2 hover:ring-civic-500 hover:scale-[1.03] cursor-pointer" : "opacity-40"
              )}
            >
              {t && (
                <>
                  <span
                    className={clsx(
                      "text-[10px] font-medium leading-tight truncate",
                      t.intensity >= 3 ? "text-white" : "text-neutral-700"
                    )}
                  >
                    {t.name.length > 8 ? t.name.slice(0, 8) + "…" : t.name}
                  </span>
                  {t.hasLate && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-late-600 ring-2 ring-white" />
                  )}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-100 min-h-[60px]">
        {hoverTile ? (
          <div className="flex items-start gap-3 animate-fade-up">
            <div className="w-10 h-10 rounded-civic bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
              {hoverTile.status === "risk" ? (
                <AlertTriangle className="w-5 h-5 text-risk-600" />
              ) : hoverTile.status === "doubtful" ? (
                <AlertTriangle className="w-5 h-5 text-late-600" />
              ) : hoverTile.status === "pending" ? (
                <Clock className="w-5 h-5 text-warning-600" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-evidence-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-900 truncate">
                {hoverTile.name}
                <span className="ml-2 text-xs font-mono text-neutral-400">
                  {hoverTile.groupId}
                </span>
              </div>
              <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>状态: <span className="font-medium text-neutral-700">
                  {{merged:"已归并",pending:"待确认",doubtful:"存疑",risk:"相邻风险"}[hoverTile.status]}
                </span></span>
                {hoverTile.hasLate && (
                  <span className="text-late-600 font-medium">含晚到附件</span>
                )}
                <span className="text-civic-600 underline decoration-dotted">
                  点击查看详情 →
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-neutral-400 text-center py-3">
            悬停网格查看点位信息
          </div>
        )}
      </div>
    </div>
  );
}
