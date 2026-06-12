import { ArrowRight, AlertTriangle, X } from 'lucide-react';
import type { ImpactChainResult } from '../../shared/types';

interface ImpactChainProps {
  data: ImpactChainResult;
  onClose: () => void;
}

export default function ImpactChain({ data, onClose }: ImpactChainProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">数据影响链分析</h3>
            <p className="text-sm text-slate-600 mt-1">
              记录 #{data.record_id} · {data.note}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5" />
              风险因素 ({data.risk_factors.length} 项)
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.risk_factors.map((factor, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">受影响结论</h4>
            <div className="space-y-4">
              {data.affected_conclusions.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-800">
                          {item.conclusion}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-rose-600 font-medium">
                          缺失: {item.missing_data}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                        <span className="font-medium text-slate-700">影响说明：</span>
                        {item.impact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-2xl">
            <p className="text-sm text-cyan-800">
              <strong>提示：</strong>补录缺失的数据后，系统将自动重新评估风险，
              受影响的结论也会随之更新。请勿在数据缺失的情况下导出最终报告交付海事处。
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
