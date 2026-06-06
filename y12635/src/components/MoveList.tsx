import { useMemo, useState } from "react";
import type { Move, MoveStatus, Layer } from "../types";
import { STATUS_LABELS, STATUS_COLORS } from "../types";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

interface MoveListProps {
  moves: Move[];
  layers: Layer[];
  selectedMoveId: string | null;
  onSelectMove: (moveId: string | null) => void;
  onUpdateStatus: (moveId: string, status: MoveStatus) => void;
  onUpdateNote: (moveId: string, note: string) => void;
  onRemoveMove: (moveId: string) => void;
}

const STATUS_OPTIONS: MoveStatus[] = [
  "confirmed",
  "pending",
  "normal",
  "boundary_error",
];

function StatusIcon({ status }: { status: MoveStatus }) {
  const cls = "w-3.5 h-3.5";
  switch (status) {
    case "confirmed":
      return <CheckCircle2 className={cn(cls, "text-emerald-500")} />;
    case "pending":
      return <Clock className={cn(cls, "text-amber-500")} />;
    case "boundary_error":
      return <XCircle className={cn(cls, "text-red-500")} />;
    case "undone":
      return <AlertTriangle className={cn(cls, "text-slate-400")} />;
    default:
      return <Clock className={cn(cls, "text-blue-500")} />;
  }
}

export function MoveList({
  moves,
  layers,
  selectedMoveId,
  onSelectMove,
  onUpdateStatus,
  onUpdateNote,
  onRemoveMove,
}: MoveListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);

  const layerMap = useMemo(() => {
    const m = new Map<string, Layer>();
    layers.forEach((l) => m.set(l.id, l));
    return m;
  }, [layers]);

  const sortedMoves = useMemo(
    () => moves.slice().sort((a, b) => b.order - a.order),
    [moves]
  );

  const counts = useMemo(() => {
    return moves.reduce(
      (acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [moves]);

  const handleStartNote = (move: Move) => {
    setNoteEditingId(move.id);
    setNoteDraft(move.note ?? "");
  };

  const handleSaveNote = (moveId: string) => {
    onUpdateNote(moveId, noteDraft.trim());
    setNoteEditingId(null);
    setNoteDraft("");
  };

  return (
    <div className="card p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-4 bg-accent-600 rounded-full" />
          轨迹记录
          <span className="ml-1 text-xs font-normal text-slate-500">
            共 {moves.length} 手
          </span>
        </h3>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
            {counts.confirmed ?? 0}
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <Clock className="w-3 h-3" />
            {counts.pending ?? 0}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="w-3 h-3" />
            {counts.boundary_error ?? 0}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 -mr-1 space-y-2 min-h-0">
        {sortedMoves.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">
            <div className="text-3xl mb-2">🪨</div>
            暂无落子记录
            <div className="text-xs mt-1 text-slate-400">
              点击棋盘空位添加落子
            </div>
          </div>
        )}

        {sortedMoves.map((move) => {
          const layer = layerMap.get(move.layerId);
          const isSelected = selectedMoveId === move.id;
          const isExpanded = expandedId === move.id;
          const isUndone = move.status === "undone";

          return (
            <div
              key={move.id}
              className={cn(
                "rounded-lg border transition-all",
                isSelected
                  ? "border-primary-400 bg-primary-50/60 shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50",
                isUndone && "opacity-60"
              )}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => onSelectMove(isSelected ? null : move.id)}
              >
                <div className="flex flex-col items-center justify-center w-8 h-8 rounded-md bg-slate-100 flex-shrink-0">
                  <span className="text-[10px] text-slate-500 leading-none">
                    第
                  </span>
                  <span className="text-sm font-bold text-slate-800 leading-none font-mono">
                    {move.order}
                  </span>
                </div>

                <div
                  className="w-5 h-5 rounded-full shadow-sm flex-shrink-0 ring-1 ring-slate-300"
                  style={{
                    background:
                      move.player === "black"
                        ? "radial-gradient(circle at 35% 30%, #4b5563 0%, #111827 70%)"
                        : "radial-gradient(circle at 35% 30%, #ffffff 0%, #e5e7eb 80%)",
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-slate-700">
                      ({move.x}, {move.y})
                    </span>
                    <span
                      className="badge text-[10px] !py-0.5 !px-1.5"
                      style={{
                        backgroundColor: `${STATUS_COLORS[move.status]}15`,
                        color: STATUS_COLORS[move.status],
                        boxShadow: `inset 0 0 0 1px ${STATUS_COLORS[move.status]}40`,
                      }}
                    >
                      <StatusIcon status={move.status} />
                      {STATUS_LABELS[move.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: layer?.color ?? "#999" }}
                    />
                    <span className="text-xs text-slate-500 truncate">
                      {layer?.name ?? "未知图层"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(isExpanded ? null : move.id);
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2 animate-fade-in">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">状态</div>
                    <div className="flex flex-wrap gap-1">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onUpdateStatus(move.id, s)}
                          className={cn(
                            "text-[11px] px-2 py-1 rounded-md border transition-all flex items-center gap-1",
                            move.status === s
                              ? "bg-primary-50 border-primary-300 text-primary-700"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <StatusIcon status={s} />
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(move.id, "undone")}
                        className={cn(
                          "text-[11px] px-2 py-1 rounded-md border transition-all flex items-center gap-1",
                          move.status === "undone"
                            ? "bg-slate-100 border-slate-300 text-slate-600"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <StatusIcon status="undone" />
                        {STATUS_LABELS.undone}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      备注
                    </div>
                    {noteEditingId === move.id ? (
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNote(move.id);
                            if (e.key === "Escape") {
                              setNoteEditingId(null);
                              setNoteDraft("");
                            }
                          }}
                          placeholder="添加备注..."
                          className="flex-1 text-xs bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(move.id)}
                          className="btn-primary !py-1 !px-2.5 text-[11px]"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNoteEditingId(null);
                            setNoteDraft("");
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartNote(move)}
                        className={cn(
                          "w-full text-left text-xs px-2 py-1.5 rounded border transition-all",
                          move.note
                            ? "bg-slate-50 border-slate-200 text-slate-700"
                            : "bg-white border-dashed border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        {move.note || "+ 点击添加备注"}
                      </button>
                    )}
                  </div>

                  {move.note && (
                    <div className="text-xs text-slate-600 bg-amber-50/50 border border-amber-100 rounded p-2">
                      💡 {move.note}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveMove(move.id)}
                    className="w-full text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded px-2 py-1.5 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除该手
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
