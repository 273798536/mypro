import { History, User, FileText, Clock } from 'lucide-react';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';
import { formatDate } from '../../utils/dataTransformer';
import { CURRENCY_SYMBOLS } from '../../types';

export function CorrectionTimeline() {
  const { selectedRecordId, getRecordById, showCorrections, toggleCorrections } = useCashFlowStore();
  const record = selectedRecordId ? getRecordById(selectedRecordId) : undefined;

  if (!record) return null;
  if (!showCorrections && record.corrections.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <button
        onClick={toggleCorrections}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">修正痕迹</h3>
        </div>
        <span className="text-xs text-white/40">{showCorrections ? '收起' : '展开'}</span>
      </button>

      {showCorrections && (
        <>
          {record.corrections.length > 0 ? (
            <div className="relative pl-4">
              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-white/20" />
              {record.corrections.map((correction, i) => (
                <div key={correction.id} className="relative mb-4 last:mb-0">
                  <div className="absolute -left-[9px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#0c1826]" />
                  <div className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">修正 #{i + 1}</span>
                      <div className="flex items-center gap-1 text-xs text-white/40">
                        <User className="w-3 h-3" />
                        <span>{correction.operator}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <span className={`font-mono ${correction.newValue < correction.oldValue ? 'text-red-400' : 'text-emerald-400'}`}>
                        {CURRENCY_SYMBOLS[record.currency]}{correction.oldValue.toLocaleString()}
                      </span>
                      <span className="text-white/30">→</span>
                      <span className={`font-mono ${correction.newValue < correction.oldValue ? 'text-red-400' : 'text-emerald-400'}`}>
                        {CURRENCY_SYMBOLS[record.currency]}{correction.newValue.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mb-1">{correction.reason}</p>
                    <div className="flex items-center gap-1 text-xs text-white/30">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(correction.correctedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40 text-center py-4">暂无修正记录</p>
          )}

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
              <FileText className="w-3 h-3" />
              <span>来源追溯</span>
            </div>
            <p className="text-xs text-white/50">原始来源: {record.sourceDoc}</p>
          </div>
        </>
      )}
    </div>
  );
}