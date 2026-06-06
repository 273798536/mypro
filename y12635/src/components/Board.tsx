import { useMemo, useRef, useState } from "react";
import type { Move, Layer, Player } from "../types";
import { STATUS_COLORS } from "../types";
import { cn } from "../lib/utils";

interface BoardProps {
  size: number;
  moves: Move[];
  layers: Layer[];
  selectedMoveId: string | null;
  onCellClick?: (x: number, y: number) => void;
  onMoveClick?: (moveId: string) => void;
  currentPlayer?: Player;
  interactive?: boolean;
  cellSize?: number;
}

export function Board({
  size,
  moves,
  layers,
  selectedMoveId,
  onCellClick,
  onMoveClick,
  currentPlayer = "black",
  interactive = true,
  cellSize = 48,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(
    null
  );

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((l) => l.visible).map((l) => l.id)),
    [layers]
  );

  const layerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    layers.forEach((l) => map.set(l.id, l.color));
    return map;
  }, [layers]);

  const visibleMoves = useMemo(
    () =>
      moves
        .filter(
          (m) => visibleLayerIds.has(m.layerId) && m.status !== "undone"
        )
        .sort((a, b) => a.order - b.order),
    [moves, visibleLayerIds]
  );

  const moveMap = useMemo(() => {
    const map = new Map<string, Move>();
    visibleMoves.forEach((m) => map.set(`${m.x},${m.y}`, m));
    return map;
  }, [visibleMoves]);

  const padding = cellSize * 0.8;
  const boardPx = cellSize * (size - 1) + padding * 2;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactive || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.round(
      (e.clientX - rect.left - padding) / cellSize
    );
    const y = Math.round(
      (e.clientY - rect.top - padding) / cellSize
    );
    if (x >= 0 && x < size && y >= 0 && y < size) {
      setHoverCell({ x, y });
    } else {
      setHoverCell(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.round(
      (e.clientX - rect.left - padding) / cellSize
    );
    const y = Math.round(
      (e.clientY - rect.top - padding) / cellSize
    );
    if (x < 0 || x >= size || y < 0 || y >= size) return;

    const existing = moveMap.get(`${x},${y}`);
    if (existing && onMoveClick) {
      onMoveClick(existing.id);
    } else if (!existing && onCellClick) {
      onCellClick(x, y);
    }
    setHoverCell(null);
  };

  const starPoints = useMemo(() => {
    const points: Array<{ x: number; y: number }> = [];
    if (size === 9) {
      [2, 4, 6].forEach((i) =>
        [2, 4, 6].forEach((j) => points.push({ x: i, y: j }))
      );
    } else if (size === 13) {
      [3, 6, 9].forEach((i) =>
        [3, 6, 9].forEach((j) => points.push({ x: i, y: j }))
      );
    } else if (size === 19) {
      [3, 9, 15].forEach((i) =>
        [3, 9, 15].forEach((j) => points.push({ x: i, y: j }))
      );
    }
    return points;
  }, [size]);

  const pieceRadius = cellSize * 0.42;

  return (
    <div
      ref={boardRef}
      className={cn(
        "relative select-none rounded-2xl shadow-inner",
        interactive && "cursor-crosshair"
      )}
      style={{
        width: boardPx,
        height: boardPx,
        background:
          "radial-gradient(circle at 30% 20%, #fef3c7 0%, #fde68a 55%, #fbbf24 100%)",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverCell(null)}
      onClick={handleClick}
    >
      <svg
        className="absolute inset-0 pointer-events-none"
        width={boardPx}
        height={boardPx}
      >
        {Array.from({ length: size }).map((_, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padding}
              y1={padding + i * cellSize}
              x2={padding + (size - 1) * cellSize}
              y2={padding + i * cellSize}
              stroke="#78350f"
              strokeWidth={i === 0 || i === size - 1 ? 2 : 1}
              opacity={0.75}
            />
            <line
              x1={padding + i * cellSize}
              y1={padding}
              x2={padding + i * cellSize}
              y2={padding + (size - 1) * cellSize}
              stroke="#78350f"
              strokeWidth={i === 0 || i === size - 1 ? 2 : 1}
              opacity={0.75}
            />
          </g>
        ))}
        {starPoints.map((p) => (
          <circle
            key={`star-${p.x}-${p.y}`}
            cx={padding + p.x * cellSize}
            cy={padding + p.y * cellSize}
            r={4}
            fill="#78350f"
            opacity={0.85}
          />
        ))}
      </svg>

      {interactive && hoverCell && !moveMap.get(`${hoverCell.x},${hoverCell.y}`) && (
        <div
          className="absolute rounded-full pointer-events-none animate-pulse-soft"
          style={{
            left: padding + hoverCell.x * cellSize - pieceRadius,
            top: padding + hoverCell.y * cellSize - pieceRadius,
            width: pieceRadius * 2,
            height: pieceRadius * 2,
            background:
              currentPlayer === "black"
                ? "rgba(17, 24, 39, 0.35)"
                : "rgba(255, 255, 255, 0.55)",
            border:
              currentPlayer === "black"
                ? "2px solid rgba(17, 24, 39, 0.6)"
                : "2px solid rgba(148, 163, 184, 0.8)",
            boxShadow: "0 0 12px rgba(59, 130, 246, 0.4)",
          }}
        />
      )}

      {visibleMoves.map((move) => {
        const isSelected = move.id === selectedMoveId;
        const layerColor = layerColorMap.get(move.layerId) ?? "#1e40af";
        const borderColor =
          move.status === "boundary_error"
            ? STATUS_COLORS.boundary_error
            : move.status === "pending"
            ? STATUS_COLORS.pending
            : move.status === "confirmed"
            ? STATUS_COLORS.confirmed
            : "transparent";
        return (
          <div
            key={move.id}
            className={cn(
              "absolute rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-all duration-200",
              interactive && "cursor-pointer",
              isSelected && "ring-4 ring-blue-400/80 scale-110 z-10"
            )}
            style={{
              left: padding + move.x * cellSize - pieceRadius,
              top: padding + move.y * cellSize - pieceRadius,
              width: pieceRadius * 2,
              height: pieceRadius * 2,
              background:
                move.player === "black"
                  ? "radial-gradient(circle at 35% 30%, #4b5563 0%, #111827 70%)"
                  : "radial-gradient(circle at 35% 30%, #ffffff 0%, #e5e7eb 80%)",
              color: move.player === "black" ? "#f9fafb" : "#111827",
              border: `3px solid ${borderColor}`,
              boxShadow: isSelected
                ? `0 0 20px ${layerColor}99, 0 6px 12px rgba(0,0,0,0.25)`
                : "0 3px 6px rgba(0,0,0,0.25)",
            }}
            title={`第 ${move.order} 手 (${move.x}, ${move.y})`}
            onClick={(e) => {
              e.stopPropagation();
              onMoveClick?.(move.id);
            }}
          >
            <span
              className="drop-shadow"
              style={{ textShadow: move.player === "black" ? "0 1px 2px rgba(0,0,0,0.6)" : "0 1px 1px rgba(0,0,0,0.2)" }}
            >
              {move.order}
            </span>
          </div>
        );
      })}

      <svg
        className="absolute inset-0 pointer-events-none"
        width={boardPx}
        height={boardPx}
      >
        {visibleMoves.length > 1 &&
          visibleMoves.slice(0, -1).map((move, i) => {
            const next = visibleMoves[i + 1];
            if (!next) return null;
            const color = layerColorMap.get(move.layerId) ?? "#1e40af";
            return (
              <line
                key={`line-${move.id}-${next.id}`}
                x1={padding + move.x * cellSize}
                y1={padding + move.y * cellSize}
                x2={padding + next.x * cellSize}
                y2={padding + next.y * cellSize}
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                opacity={0.55}
              />
            );
          })}
      </svg>
    </div>
  );
}
