import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function BoundarySamples() {
  const recalcResults = useStore((s) => s.recalcResults);

  if (recalcResults.length === 0) {
    return (
      <div className="rounded-lg p-6 text-center" style={{ background: "#1a1a2e" }}>
        <p className="text-gray-400">请先点击复算</p>
      </div>
    );
  }

  const boundarySamples = recalcResults.filter((r) => r.crossedBoundary);

  if (boundarySamples.length === 0) {
    return (
      <div className="rounded-lg p-6 text-center" style={{ background: "#1a1a2e" }}>
        <p className="text-gray-400">没有跨越边界的样本</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4" style={{ background: "#1a1a2e" }}>
      <h3 className="mb-4 text-lg font-semibold" style={{ color: "#f59e0b" }}>
        边界样本详情
      </h3>
      <div className="space-y-3">
        {boundarySamples.map((sample) => {
          const intoAnomaly = sample.afterAnomaly && !sample.beforeAnomaly;
          const outOfAnomaly = sample.beforeAnomaly && !sample.afterAnomaly;

          return (
            <div
              key={sample.cellId}
              className="flex items-center gap-3 rounded-md border border-gray-700 p-3"
            >
              <div className="flex-shrink-0">
                {intoAnomaly && <ArrowUpCircle className="h-6 w-6 text-red-500" />}
                {outOfAnomaly && <ArrowDownCircle className="h-6 w-6 text-green-500" />}
              </div>
              <div className="flex flex-1 items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-200">
                    {sample.cellId}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <p className="text-gray-500">变更前</p>
                    <p className="text-gray-300">{sample.beforeValue}</p>
                    <p className={sample.beforeAnomaly ? "text-red-400" : "text-green-400"}>
                      {sample.beforeAnomaly ? "异常" : "正常"}
                    </p>
                  </div>
                  <span className="text-gray-600">→</span>
                  <div className="text-center">
                    <p className="text-gray-500">变更后</p>
                    <p className="text-gray-300">{sample.afterValue}</p>
                    <p className={sample.afterAnomaly ? "text-red-400" : "text-green-400"}>
                      {sample.afterAnomaly ? "异常" : "正常"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
