import { useState } from 'react';
import { FileSearch, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useSurfaceStore } from '@/store/useSurfaceStore';
import type { ExtremumPoint, ResultStatus } from '@/types';

const STATUS_CONFIG: Record<ResultStatus, { icon: typeof CheckCircle2; color: string; label: string; bg: string }> = {
  confirmed: { icon: CheckCircle2, color: 'text-emerald-400', label: '可直接用', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  needs_review: { icon: AlertTriangle, color: 'text-amber-400', label: '需确认', bg: 'bg-amber-400/10 border-amber-400/20' },
  error: { icon: XCircle, color: 'text-red-400', label: '报错', bg: 'bg-red-400/10 border-red-400/20' },
};

const TYPE_COLORS: Record<string, string> = {
  maximum: 'text-red-400',
  minimum: 'text-blue-400',
  saddle: 'text-amber-400',
};

const TYPE_LABELS: Record<string, string> = {
  maximum: '极大值',
  minimum: '极小值',
  saddle: '鞍点',
};

function ConclusionCard({ point, index }: { point: ExtremumPoint; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[point.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className={`rounded-lg border p-2 ${statusCfg.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-300">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <StatusIcon size={14} className={statusCfg.color} />
          <span className={`text-xs font-semibold ${TYPE_COLORS[point.type]}`}>
            {TYPE_LABELS[point.type]}
          </span>
          <span className="text-xs font-mono text-gray-400">
            ({point.x.toFixed(3)}, {point.y.toFixed(3)})
          </span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusCfg.color} ${statusCfg.bg}`}>
          {statusCfg.label}
        </span>
      </div>

      {expanded && (
        <div className="mt-2 pl-7 space-y-1.5 text-xs text-gray-400">
          <div>
            <span className="text-gray-500">函数值 z =</span>{' '}
            <span className="font-mono text-gray-300">{point.z.toFixed(6)}</span>
          </div>

          <div className="border-t border-[#1a2a3a] pt-1.5">
            <div className="text-gray-500 font-medium mb-1">溯源信息</div>
            <div className="space-y-0.5 pl-2">
              <div><span className="text-gray-600">表达式:</span> <span className="font-mono text-[#00e5c8]/80">{point.trace.expression}</span></div>
              <div><span className="text-gray-600">X范围:</span> <span className="font-mono">[{point.trace.xRange[0]}, {point.trace.xRange[1]}]</span></div>
              <div><span className="text-gray-600">Y范围:</span> <span className="font-mono">[{point.trace.yRange[0]}, {point.trace.yRange[1]}]</span></div>
              <div><span className="text-gray-600">采样密度:</span> <span className="font-mono">{point.trace.samplingDensity}×{point.trace.samplingDensity}</span></div>
              <div><span className="text-gray-600">梯度模:</span> <span className="font-mono">{point.trace.gradientMagnitude.toFixed(6)}</span></div>
              <div><span className="text-gray-600">Hessian特征值:</span> <span className="font-mono">[{point.trace.hessianEigenvalues[0].toFixed(4)}, {point.trace.hessianEigenvalues[1].toFixed(4)}]</span></div>
            </div>
          </div>

          {point.message && (
            <div className="border-t border-[#1a2a3a] pt-1.5">
              <div className="text-amber-400/80">{point.message}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConclusionPanel() {
  const extrema = useSurfaceStore((s) => s.extrema);
  const parseError = useSurfaceStore((s) => s.parseError);
  const config = useSurfaceStore((s) => s.config);

  const confirmed = extrema.filter((e) => e.status === 'confirmed');
  const needsReview = extrema.filter((e) => e.status === 'needs_review');
  const errors = extrema.filter((e) => e.status === 'error');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#00e5c8] uppercase tracking-wider">
        <FileSearch size={16} />
        分析结论
      </div>

      {parseError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-red-400">
            <XCircle size={12} />
            表达式报错 — 暂不可算
          </div>
          <p className="text-xs text-red-300/70 mt-1">{parseError.message}</p>
          <p className="text-xs text-red-300/50 mt-0.5">💡 {parseError.suggestion}</p>
        </div>
      )}

      {extrema.length === 0 && !parseError && (
        <div className="text-xs text-gray-500 text-center py-4">
          在当前参数范围内未检测到极值点
        </div>
      )}

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {confirmed.map((pt, i) => (
          <ConclusionCard key={`c-${i}`} point={pt} index={i} />
        ))}
        {needsReview.map((pt, i) => (
          <ConclusionCard key={`r-${i}`} point={pt} index={confirmed.length + i} />
        ))}
        {errors.map((pt, i) => (
          <ConclusionCard key={`e-${i}`} point={pt} index={confirmed.length + needsReview.length + i} />
        ))}
      </div>

      {extrema.length > 0 && (
        <div className="flex gap-2 text-[10px] pt-1 border-t border-[#1a2a3a]">
          <span className="text-emerald-400">✅ {confirmed.length} 可直接用</span>
          <span className="text-amber-400">⚠ {needsReview.length} 需确认</span>
          <span className="text-red-400">❌ {errors.length} 报错</span>
        </div>
      )}
    </div>
  );
}
