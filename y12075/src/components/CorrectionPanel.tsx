import { useAppStore } from '../store/appStore';
import { AlertTriangle, AlertCircle, CheckCircle, X, Wrench } from 'lucide-react';

export default function CorrectionPanel() {
  const { corrections, dismissCorrection, applyCorrection } = useAppStore();

  const activeCorrections = corrections.filter((c) => !c.dismissed && !c.applied);

  if (activeCorrections.length === 0) {
    return (
      <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
        <h3 className="text-sm font-semibold text-[#F5F0E8] mb-2 font-['DM_Sans'] flex items-center gap-2">
          <CheckCircle size={14} className="text-green-400" />
          修正建议
        </h3>
        <p className="text-sm text-green-400 text-center py-4">数据完整，无需修正</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
      <h3 className="text-sm font-semibold text-[#F5F0E8] mb-3 font-['DM_Sans'] flex items-center gap-2">
        <Wrench size={14} className="text-[#D4A843]" />
        修正建议
        <span className="ml-auto text-xs bg-[#D4A843] text-[#0a1628] px-2 py-0.5 rounded-full">
          {activeCorrections.length}
        </span>
      </h3>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {activeCorrections.map((correction) => (
          <div
            key={correction.id}
            className={`p-3 rounded border ${
              correction.severity === 'error'
                ? 'bg-red-900/20 border-red-700/50'
                : 'bg-yellow-900/20 border-yellow-700/50'
            }`}
          >
            <div className="flex items-start gap-2">
              {correction.severity === 'error' ? (
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#F5F0E8] font-medium">{correction.message}</p>
                <p className="text-xs text-gray-400 mt-1 break-words">{correction.detail}</p>
              </div>
              <button
                onClick={() => dismissCorrection(correction.id)}
                className="text-gray-500 hover:text-gray-300 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2">
              <button
                onClick={() => applyCorrection(correction.id)}
                className="text-xs px-3 py-1 bg-[#D4A843] text-[#0a1628] rounded hover:bg-[#e8b85a] transition-colors"
              >
                {correction.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
