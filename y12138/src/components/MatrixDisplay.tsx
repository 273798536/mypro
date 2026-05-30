import { useFilmStore } from '@/store/useFilmStore';
import { cFormat } from '@/utils/complex';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function MatrixDisplay() {
  const { batch, selectedWavelength } = useFilmStore();
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());

  if (!batch || batch.results.length === 0 || selectedWavelength === null) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
        在光谱曲线或明细表中点击一个波长查看传输矩阵
      </div>
    );
  }

  const result = batch.results.find((r) => r.wavelength === selectedWavelength);
  if (!result) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
        未找到所选波长的计算结果
      </div>
    );
  }

  const toggleLayer = (idx: number) => {
    const next = new Set(expandedLayers);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedLayers(next);
  };

  const formatMatrixCell = (val: { re: number; im: number }) => cFormat(val, 4);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-300 tracking-wide">
        传输矩阵 <span className="text-slate-500 font-normal font-mono">λ = {selectedWavelength} nm</span>
      </h3>
      <div className="space-y-1.5 overflow-auto max-h-[320px] pr-1">
        {result.layerMatrices.map((lm, i) => {
          const isExpanded = expandedLayers.has(i);
          return (
            <div key={i} className="rounded border border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleLayer(i)}
                className="w-full flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
              >
                {isExpanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                <span className="text-xs text-slate-400">层 {i + 1}</span>
                <span className="text-xs text-cyan-400 font-mono">{lm.material || `Layer ${i + 1}`}</span>
                <span className="text-[10px] text-slate-500 font-mono ml-auto">
                  n={lm.n} k={lm.k} d={lm.d}nm
                </span>
              </button>
              {isExpanded && (
                <div className="px-3 py-2 bg-[#0d1117]/80">
                  <div className="text-[10px] text-slate-500 mb-1">
                    相位厚度 δ = {formatMatrixCell(lm.delta)}
                  </div>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                    <div className="bg-slate-800/60 rounded px-2 py-1 text-cyan-300">{formatMatrixCell(lm.matrix.m11)}</div>
                    <div className="bg-slate-800/60 rounded px-2 py-1 text-cyan-300">{formatMatrixCell(lm.matrix.m12)}</div>
                    <div className="bg-slate-800/60 rounded px-2 py-1 text-cyan-300">{formatMatrixCell(lm.matrix.m21)}</div>
                    <div className="bg-slate-800/60 rounded px-2 py-1 text-cyan-300">{formatMatrixCell(lm.matrix.m22)}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded border border-amber-700/30 overflow-hidden bg-amber-900/10">
          <div className="px-3 py-1.5 bg-amber-900/20 text-xs text-amber-400 font-semibold">
            累积矩阵 M_total
          </div>
          <div className="px-3 py-2 bg-[#0d1117]/80">
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
              <div className="bg-amber-900/20 rounded px-2 py-1 text-amber-300">{formatMatrixCell(result.cumulativeMatrix.m11)}</div>
              <div className="bg-amber-900/20 rounded px-2 py-1 text-amber-300">{formatMatrixCell(result.cumulativeMatrix.m12)}</div>
              <div className="bg-amber-900/20 rounded px-2 py-1 text-amber-300">{formatMatrixCell(result.cumulativeMatrix.m21)}</div>
              <div className="bg-amber-900/20 rounded px-2 py-1 text-amber-300">{formatMatrixCell(result.cumulativeMatrix.m22)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-600 px-1">
        追溯标识: <span className="font-mono text-slate-500">{result.traceId}</span>
      </div>
    </div>
  );
}
