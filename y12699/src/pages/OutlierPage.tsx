import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PointCloudScene from '@/components/PointCloudScene';
import { useAppStore } from '@/store';
import { outlierFormulaInfo } from '@/utils/formulas';
import {
  CheckCircle2, Circle, Sparkles, Ruler, AlertTriangle,
  Calculator, ArrowRight, FileText
} from 'lucide-react';

export default function OutlierPage() {
  const navigate = useNavigate();
  const {
    outlierPoints, selectedOutlierId, selectOutlier, toggleOutlierReview, measurementRecords
  } = useAppStore();

  const rightPanelRef = useRef<HTMLDivElement>(null);
  const reviewed = outlierPoints.filter(p => p.reviewed).length;
  const allReviewed = outlierPoints.length > 0 && reviewed === outlierPoints.length;

  const scrollToCard = (id: string) => {
    setTimeout(() => {
      const el = rightPanelRef.current?.querySelector(`[data-outlier-id="${id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-3 border-b border-industrial-600 flex items-center justify-between bg-industrial-800/40">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">同屏复核视图</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-alert-orange" />
                待复核离群点
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pass-green" />
                已复核
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                当前选中高亮
              </span>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400">
            本轮复核进度: {reviewed} / {outlierPoints.length}
          </div>
        </div>
        <div className="flex-1 relative">
          <PointCloudScene showOutliers highlightOutlierId={selectedOutlierId} />

          <div className="absolute bottom-4 left-4 w-72 industrial-card p-3 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-medium">统计滤波公式</span>
            </div>
            <code className="text-slate-400 font-mono block">{outlierFormulaInfo.formula}</code>
            <div className="mt-2 text-slate-500">{outlierFormulaInfo.range}</div>
          </div>
        </div>

        <div className="h-[160px] border-t border-industrial-600 bg-industrial-800/40 overflow-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wide">本轮纳入的测量记录（同一批次复核链）</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {measurementRecords.map(m => (
              <div key={m.id} className="p-3 bg-industrial-900 rounded-industrial border border-industrial-600">
                <div className="text-xs text-slate-400 mb-1">{m.measurePoint}</div>
                <div className="font-mono text-base text-slate-100">{m.measuredValue_mm.toFixed(2)} <span className="text-xs text-slate-500">mm</span></div>
                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                  <span>{m.operator}</span>
                  <span>{m.measuredAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={rightPanelRef} className="w-[380px] flex-shrink-0 border-l border-industrial-600 bg-industrial-800/40 overflow-auto">
        <div className="p-5 border-b border-industrial-600 sticky top-0 bg-industrial-800 z-10">
          <h2 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-alert-orange" />
            离群点明细
          </h2>
          <p className="text-xs text-slate-500">点击卡片查看三维高亮，勾选完成复核</p>

          <div className="mt-4 p-3 bg-industrial-900 rounded-industrial border border-industrial-600">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">单位与范围</span>
            </div>
            <div className="text-xs text-slate-300">{outlierFormulaInfo.units}</div>
            <div className="flex items-start gap-2 mt-3">
              <AlertTriangle className="w-3.5 h-3.5 text-alert-orange flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                {outlierFormulaInfo.failureCases.map((c, i) => (
                  <div key={i} className="text-slate-400">{c}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {outlierPoints.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-pass-green/50" />
              <div className="text-sm">本批次未检测到离群点</div>
            </div>
          )}

          {outlierPoints.map(p => {
            const selected = selectedOutlierId === p.id;
            return (
              <div
                key={p.id}
                data-outlier-id={p.id}
                onClick={() => { selectOutlier(selected ? null : p.id); scrollToCard(p.id); }}
                className={`industrial-card p-4 cursor-pointer transition-all ${
                  selected ? 'border-slate-400 shadow-lg shadow-black/30' : ''
                } ${p.reviewed ? 'opacity-80' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleOutlierReview(p.id); }}
                      className="text-slate-400 hover:text-pass-green"
                    >
                      {p.reviewed
                        ? <CheckCircle2 className="w-5 h-5 text-pass-green" />
                        : <Circle className="w-5 h-5" />
                      }
                    </button>
                    <div>
                      <div className="font-mono text-sm text-slate-100">#{p.id.toUpperCase()}</div>
                      <div className={`text-xs ${p.reviewed ? 'text-pass-green' : 'text-alert-orange'}`}>
                        {p.reviewed ? '已复核' : '待复核'}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 text-xs font-mono rounded ${
                    p.deviationSigma >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-alert-orange/20 text-alert-orange'
                  }`}>
                    {p.deviationSigma.toFixed(2)}σ
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <div className="detail-label">X</div>
                    <div className="detail-value">{p.x_mm.toFixed(1)} mm</div>
                  </div>
                  <div>
                    <div className="detail-label">Y</div>
                    <div className="detail-value">{p.y_mm.toFixed(1)} mm</div>
                  </div>
                  <div>
                    <div className="detail-label">Z</div>
                    <div className="detail-value">{p.z_mm.toFixed(1)} mm</div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="detail-label mb-0.5">疑似原因</div>
                  <div className="text-xs text-slate-300 leading-relaxed">{p.suspectedCause}</div>
                </div>
                <div>
                  <div className="detail-label mb-0.5">建议处理</div>
                  <div className="text-xs text-slate-300 leading-relaxed">{p.suggestion}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-industrial-600 sticky bottom-0 bg-industrial-800">
          <button
            onClick={() => navigate('/collision')}
            className={`w-full industrial-btn-primary flex items-center justify-center gap-2 ${!allReviewed && outlierPoints.length > 0 ? 'opacity-50' : ''}`}
          >
            进入碰撞检测
            <ArrowRight className="w-4 h-4" />
          </button>
          {!allReviewed && outlierPoints.length > 0 && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              仍有 {outlierPoints.length - reviewed} 个离群点待复核
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
