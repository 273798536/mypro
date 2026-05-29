import { AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

interface OverloadModalProps {
  overloadDisplay: {
    memberId: string;
    reason: string;
    force: number;
    stressRatio: number;
    vehiclePosition: number;
  };
  onDismiss: () => void;
}

export default function OverloadModal({ overloadDisplay, onDismiss }: OverloadModalProps) {
  const testResult = useGameStore((s) => s.testResult);
  const hasFailed = testResult != null && testResult.failedMemberIds.length > 0;

  const forceLabel = overloadDisplay.force > 0 ? '拉力' : overloadDisplay.force < 0 ? '压力' : '零力';
  const stressPercent = (overloadDisplay.stressRatio * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg border-2 border-red-500 bg-slate-900 p-6 font-mono shadow-2xl shadow-red-500/20">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <h2 className="text-xl font-bold text-red-400">⚠ 杆件过载</h2>
        </div>

        <div className="space-y-3 rounded border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-400">杆件编号</span>
            <span className="font-bold text-red-300">{overloadDisplay.memberId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">车辆位置</span>
            <span className="font-mono text-blue-300">{overloadDisplay.vehiclePosition.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">受力值</span>
            <span className="font-mono text-yellow-300">
              {Math.abs(overloadDisplay.force).toFixed(2)} kN（{forceLabel}）
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">应力比</span>
            <span className="font-mono text-red-300">{stressPercent}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${Math.min(overloadDisplay.stressRatio * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 rounded border border-slate-700 bg-slate-800/30 p-3 text-xs leading-relaxed text-slate-300">
          {overloadDisplay.reason}
        </div>

        <button
          onClick={onDismiss}
          className={`mt-5 w-full rounded py-2.5 text-sm font-bold transition-colors ${
            hasFailed
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          {hasFailed ? '测试结束' : '继续测试'}
        </button>
      </div>
    </div>
  );
}
