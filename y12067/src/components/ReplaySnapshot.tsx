import type { GameSnapshot, FloorPlan } from "@/types";
import FloorMap from "./FloorMap";

interface ReplaySnapshotProps {
  snapshot: GameSnapshot;
  floors: FloorPlan[];
}

export default function ReplaySnapshot({ snapshot, floors }: ReplaySnapshotProps) {
  const floor = floors[0];
  if (!floor) return null;

  const fireRadius = floor.fireSource.radius + 0.05 * snapshot.elapsed;

  return (
    <div className="bg-bg-light/80 backdrop-blur-sm rounded-lg border border-gray-700/40 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-gray-400">
          步骤 #{snapshot.step} · {snapshot.elapsed}秒
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-safe">已疏散: {snapshot.evacuated}</span>
          <span className={snapshot.score.total >= 60 ? "text-safe" : "text-danger"}>
            评分: {snapshot.score.total}
          </span>
        </div>
      </div>

      <FloorMap
        floor={floor}
        crowdState={snapshot.crowdState}
        exitFlows={snapshot.exitFlows}
        fireRadius={fireRadius}
        width={560}
        height={420}
      />

      {snapshot.score.deductions.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-danger font-medium">本步扣分</div>
          {snapshot.score.deductions.map((d, i) => (
            <div key={i} className="text-[10px] text-gray-400 flex gap-1">
              <span className="text-danger font-mono">{d.points}分</span>
              <span>{d.reason}</span>
            </div>
          ))}
        </div>
      )}

      {snapshot.operations.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-info font-medium">已执行操作</div>
          {snapshot.operations.map((op, i) => (
            <div key={i} className="text-[10px] text-gray-400">
              <span className="text-accent font-mono">#{op.step}</span>{" "}
              {op.type === "broadcast" && `广播 → ${op.target}`}
              {op.type === "elevator_control" && `电梯${op.params.disable ? "停用" : "启用"} ${op.target}`}
              {op.type === "exit_redirect" && `引导 ${String(op.params.fromExitId)} → ${String(op.params.toExitId)}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
