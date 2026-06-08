import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";

export default function OutOfBoundsBanner() {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();
  const { getOutOfBoundsSnapshots, measurementRecords } = useAppStore();

  const snapshots = getOutOfBoundsSnapshots();
  const oobRecords = measurementRecords.filter((r) => r.status === "out-of-bounds");

  if (!visible || oobRecords.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded border border-coral-200 bg-gradient-to-r from-ocean-800 via-ocean-700 to-ocean-800 px-4 py-3 text-white shadow-card animate-pulse-slow">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral-500">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-song text-sm font-semibold">
            <span>越界提示</span>
            <span className="rounded bg-coral-500 px-1.5 py-0.5 font-mono-num text-xs">
              {oobRecords.length} 处
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ocean-100">
            <span>涉及网箱：</span>
            {oobRecords.slice(0, 6).map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  navigate("/records");
                }}
                className="rounded bg-coral-500/30 px-2 py-0.5 font-mono-num text-coral-100 transition-colors hover:bg-coral-500/50"
              >
                {r.cageId}
              </button>
            ))}
            {oobRecords.length > 6 && (
              <span className="text-ocean-200">等{oobRecords.length}个</span>
            )}
            <span className="ml-2 text-ocean-200">
              分布于 {snapshots.length} 个视角
            </span>
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded text-ocean-200 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-coral-500 to-transparent" />
      </div>
    </div>
  );
}
