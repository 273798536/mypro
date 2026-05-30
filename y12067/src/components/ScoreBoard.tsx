import type { ScoreDetail } from "@/types";
import { Clock, Users, Star } from "lucide-react";

interface ScoreBoardProps {
  elapsed: number;
  timeLimit: number;
  evacuated: number;
  totalPeople: number;
  score: ScoreDetail;
  running: boolean;
}

export default function ScoreBoard({
  elapsed,
  timeLimit,
  evacuated,
  totalPeople,
  score,
  running,
}: ScoreBoardProps) {
  const pct = totalPeople > 0 ? Math.floor((evacuated / totalPeople) * 100) : 0;
  const timePct = Math.min(100, Math.floor((elapsed / timeLimit) * 100));
  const isOvertime = elapsed > timeLimit;

  return (
    <div className="bg-bg-light/80 backdrop-blur-sm rounded-lg border border-gray-700/40 p-3 flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <Clock size={14} className={isOvertime ? "text-danger" : "text-info"} />
        <span className={`font-mono text-sm ${isOvertime ? "text-danger" : "text-gray-200"}`}>
          {elapsed}s
        </span>
        <span className="text-[10px] text-gray-500">/ {timeLimit}s</span>
        <div className="w-16 bg-gray-700/50 rounded-full h-1.5 ml-1">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${isOvertime ? "bg-danger" : timePct > 80 ? "bg-warn" : "bg-info"}`}
            style={{ width: `${Math.min(100, timePct)}%` }}
          />
        </div>
      </div>

      <div className="h-4 w-px bg-gray-700" />

      <div className="flex items-center gap-1.5">
        <Users size={14} className="text-safe" />
        <span className="font-mono text-sm text-gray-200">
          {evacuated}/{totalPeople}
        </span>
        <span className={`text-[10px] font-mono ${pct >= 80 ? "text-safe" : pct >= 50 ? "text-warn" : "text-danger"}`}>
          {pct}%
        </span>
      </div>

      <div className="h-4 w-px bg-gray-700" />

      <div className="flex items-center gap-1.5">
        <Star size={14} className={score.total >= 60 ? "text-safe" : "text-danger"} />
        <span className={`font-mono text-sm font-bold ${score.total >= 60 ? "text-safe" : score.total >= 40 ? "text-warn" : "text-danger"}`}>
          {score.total}
        </span>
        <span className="text-[10px] text-gray-500">分</span>
      </div>

      {running && (
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          <span className="text-[10px] text-danger font-mono">LIVE</span>
        </div>
      )}

      {score.deductions.length > 0 && (
        <div className="ml-auto flex gap-1 flex-wrap max-w-xs">
          {score.deductions.slice(-3).map((d, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-danger/20 text-danger border border-danger/30">
              {d.points}分
            </span>
          ))}
          {score.deductions.length > 3 && (
            <span className="text-[9px] text-gray-500">+{score.deductions.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
