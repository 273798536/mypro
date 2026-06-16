import { AlertTriangle, ArrowRight } from 'lucide-react';

interface OverlimitAlertProps {
  confirmReason: string;
  nextStep: string;
}

export function OverlimitAlert({ confirmReason, nextStep }: OverlimitAlertProps) {
  const reasons = confirmReason.split('\\n').filter((r) => r.trim());

  return (
    <div
      className="
        relative rounded-xl p-5 overflow-hidden
        bg-gradient-to-br from-rose-500/20 via-red-500/15 to-rose-500/10
        border-2
        animate-pulse-subtle
      "
      style={{
        borderImage: 'linear-gradient(135deg, #f43f5e, #ef4444, #dc2626) 1',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-red-500/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-rose-300 font-bold text-base">需人工确认</h3>
            <p className="text-rose-400/70 text-xs mt-0.5">存在异常情况需要人工复核</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-rose-500" />
            确认原因
          </div>
          <ul className="space-y-2">
            {reasons.map((reason, idx) => (
              <li
                key={idx}
                className="
                  flex items-start gap-2.5 text-sm text-rose-200/90
                  bg-rose-500/10 rounded-lg px-3 py-2
                  border border-rose-500/20
                "
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 text-xs flex items-center justify-center font-semibold mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{reason.trim()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 rounded-lg px-4 py-3 border border-amber-500/30">
          <div className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-amber-500" />
            下一步建议
          </div>
          <div className="flex items-start gap-2.5">
            <ArrowRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200/90 leading-relaxed">{nextStep}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(244, 63, 94, 0), 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
