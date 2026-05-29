import { useGameStore } from '@/store/gameStore';
import { X, AlertTriangle } from 'lucide-react';

export default function TimeoutModal() {
  const modal = useGameStore(s => s.state.timeoutReasonModal);
  const dismiss = useGameStore(s => s.dismissTimeoutModal);

  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-red-500/40 rounded-xl p-6 max-w-md mx-4 shadow-2xl shadow-red-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">订单超时</h3>
            <p className="text-zinc-400 text-xs font-mono">{modal.orderId}</p>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">{modal.reason}</p>
        </div>

        {modal.position && (
          <p className="text-zinc-500 text-xs mb-4">
            位置：({modal.position.x}, {modal.position.y})
          </p>
        )}

        <button
          onClick={dismiss}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition-colors"
        >
          <X size={14} />
          关闭
        </button>
      </div>
    </div>
  );
}
