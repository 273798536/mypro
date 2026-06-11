import { useSceneStore } from "../../hooks/useSceneStore";
import { AlertTriangle, X, MapPin } from "lucide-react";

export default function PendingConfirmModal() {
  const {
    showPendingModal,
    currentPendingId,
    pendingConfirms,
    setShowPendingModal,
    resolvePendingConfirm,
  } = useSceneStore();

  if (!showPendingModal || !currentPendingId) return null;

  const pending = pendingConfirms.find((pc) => pc.id === currentPendingId);
  if (!pending) return null;

  const handleConfirm = () => {
    resolvePendingConfirm(pending.id);
    setShowPendingModal(false);
  };

  const handleDismiss = () => {
    setShowPendingModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A1A2E] border border-amber-700/50 rounded-lg shadow-2xl w-[480px] max-w-[90vw]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-700/30">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-400">待确认：相邻点位异常</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <h4 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">原因</h4>
            <p className="text-sm text-zinc-200 leading-relaxed">{pending.reason}</p>
          </div>

          <div>
            <h4 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">影响范围</h4>
            <div className="flex flex-wrap gap-2">
              {pending.impactScope.map((scope, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-300"
                >
                  <MapPin size={10} />
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-600">
            <span>发现时间: {pending.createdAt.slice(0, 16).replace("T", " ")}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-zinc-800/60">
          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 rounded transition-colors"
          >
            稍后处理
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs text-zinc-900 bg-copper hover:bg-copper/90 rounded font-medium transition-colors"
          >
            确认已处理
          </button>
        </div>
      </div>
    </div>
  );
}
