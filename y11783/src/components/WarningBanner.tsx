import { useState } from "react";
import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import { usePartitionStore } from "@/store/index";

export default function WarningBanner() {
  const warnings = usePartitionStore((s) => s.warnings);
  const explosionAcknowledged = usePartitionStore((s) => s.explosionAcknowledged);
  const acknowledgeExplosion = usePartitionStore((s) => s.acknowledgeExplosion);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleWarnings = warnings.filter((w) => {
    if (dismissed.has(w.message)) return false;
    if (w.type === "explosion" && explosionAcknowledged) return false;
    return true;
  });

  if (visibleWarnings.length === 0) return null;

  const handleDismiss = (message: string) => {
    setDismissed((prev) => new Set(prev).add(message));
  };

  return (
    <div className="flex flex-col gap-2">
      {visibleWarnings.map((warning) => {
        if (warning.type === "explosion") {
          return (
            <div
              key={warning.message}
              className="relative flex items-start gap-3 rounded-lg border border-red-400/50 bg-red-900/60 px-4 py-3 text-red-100 shadow-lg"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
              <div className="flex-1">
                <p className="font-bold text-red-50">{warning.message}</p>
                <p className="mt-1 text-sm text-red-200">{warning.detail}</p>
                {warning.affectedCount > 0 && (
                  <p className="mt-1 text-sm text-red-300">
                    受影响数量：{warning.affectedCount}
                  </p>
                )}
                <button
                  onClick={acknowledgeExplosion}
                  className="mt-2 rounded bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                >
                  确认继续
                </button>
              </div>
            </div>
          );
        }

        if (warning.type === "duplicate_permutation") {
          return (
            <div
              key={warning.message}
              className="relative flex items-start gap-3 rounded-lg border border-amber-400/50 bg-amber-900/50 px-4 py-3 text-amber-100 shadow"
            >
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
              <div className="flex-1">
                <p className="font-semibold text-amber-50">{warning.message}</p>
                <p className="mt-1 text-sm text-amber-200">{warning.detail}</p>
                {warning.affectedCount > 0 && (
                  <p className="mt-1 text-sm text-amber-300">
                    已移除重复：{warning.affectedCount}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDismiss(warning.message)}
                className="flex-shrink-0 rounded p-0.5 text-amber-300 transition-colors hover:bg-amber-800/50 hover:text-amber-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        }

        if (warning.type === "condition_unused") {
          return (
            <div
              key={warning.message}
              className="relative flex items-start gap-3 rounded-lg border border-amber-400/50 bg-amber-900/50 px-4 py-3 text-amber-100 shadow"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
              <div className="flex-1">
                <p className="font-semibold text-amber-50">{warning.message}</p>
                <p className="mt-1 text-sm text-amber-200">{warning.detail}</p>
                {warning.affectedCount > 0 && (
                  <p className="mt-1 text-sm text-amber-300">
                    未使用条件数：{warning.affectedCount}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDismiss(warning.message)}
                className="flex-shrink-0 rounded p-0.5 text-amber-300 transition-colors hover:bg-amber-800/50 hover:text-amber-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
