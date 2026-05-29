import { useState } from 'react';
import type { GradingResult, MirrorSegment, IncidentRay } from '@/utils/types';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import ConflictBadge from './ConflictBadge';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  results: GradingResult[];
  mirrors: MirrorSegment[];
  rays: IncidentRay[];
}

export default function DetailExpandable({ results, mirrors, rays }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const selectResult = useAppStore((s) => s.selectResult);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const verdictLabel = (v: string) => {
    switch (v) {
      case 'pass': return <span className="text-emerald-400">✅ 通过</span>;
      case 'error': return <span className="text-red-400">❌ 错误</span>;
      case 'pending': return <span className="text-amber-400">⏳ 待确认</span>;
      default: return v;
    }
  };

  return (
    <div className="space-y-1">
      {results.map((r) => {
        const ray = rays.find((rr) => rr.id === r.rayId);
        const mirror = mirrors.find((m) => m.id === r.mirrorId);
        const isExpanded = expandedIds.has(r.id);

        return (
          <div
            key={r.id}
            className="rounded-lg border border-[#2d2d44] bg-[#13132a] overflow-hidden"
          >
            <button
              onClick={() => toggle(r.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1e1e38] transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
              <span className="font-mono text-xs text-[#f0c040]">{r.rayId}</span>
              <span className="text-gray-600">→</span>
              <span className="font-mono text-xs text-cyan-400">{r.mirrorId}</span>
              <span className="mx-2">{verdictLabel(r.verdict)}</span>
              {r.intersection && (
                <span className="font-mono text-xs text-gray-400">
                  交点({r.intersection.x.toFixed(2)}, {r.intersection.y.toFixed(2)})
                </span>
              )}
              {r.conflictSources.length > 0 && (
                <span className="text-xs text-red-400/70">
                  {r.conflictSources.length}个冲突
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded bg-[#0d0d1a] p-3">
                    <div className="text-gray-500 mb-1">原始输入 — 入射光线 {r.rayId}</div>
                    {ray && (
                      <div className="font-mono text-gray-300 space-y-0.5">
                        <div>起点: ({ray.originX}, {ray.originY})</div>
                        <div>方向角: {ray.directionAngle} {ray.angleUnit === 'rad' ? 'rad' : '°'}</div>
                        <div>单位标记: {ray.angleUnit}</div>
                      </div>
                    )}
                  </div>
                  <div className="rounded bg-[#0d0d1a] p-3">
                    <div className="text-gray-500 mb-1">原始输入 — 镜面线段 {r.mirrorId}</div>
                    {mirror && (
                      <div className="font-mono text-gray-300 space-y-0.5">
                        <div>起点: ({mirror.startX}, {mirror.startY})</div>
                        <div>终点: ({mirror.endX}, {mirror.endY})</div>
                        {mirror.normalAngle !== undefined && <div>法线角: {mirror.normalAngle}°</div>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded bg-[#0d0d1a] p-3">
                  <div className="text-gray-500 mb-1">计算结果</div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-gray-300 text-xs">
                    <div>交点: {r.intersection ? `(${r.intersection.x.toFixed(4)}, ${r.intersection.y.toFixed(4)})` : '无'}</div>
                    <div>参数 t: {r.paramT?.toFixed(4) ?? '—'}</div>
                    <div>参数 s: {r.paramS?.toFixed(4) ?? '—'}</div>
                    <div>入射角: {r.incidentAngle?.toFixed(2) ?? '—'}°</div>
                    <div>反射角: {r.reflectionAngle?.toFixed(2) ?? '—'}°</div>
                    <div>偏差: {r.angleDeviation?.toFixed(2) ?? '—'}°</div>
                    <div>在线段上: {r.isOnSegment ? '是' : '否'}</div>
                    <div>在延长线上: {r.isOnExtension ? '是' : '否'}</div>
                    <div>平行: {r.isParallel ? '是' : '否'}</div>
                  </div>
                </div>

                {r.conflictSources.length > 0 && (
                  <div className="rounded bg-[#0d0d1a] p-3">
                    <div className="text-gray-500 mb-2">冲突来源与后续动作</div>
                    <ConflictBadge sources={r.conflictSources} action={r.pendingAction} />
                  </div>
                )}

                <div className="rounded bg-[#0d0d1a] p-3">
                  <div className="text-gray-500 mb-1">计算过程明细</div>
                  <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {r.computationDetails}
                  </pre>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      selectResult(r.id);
                      window.location.hash = '/grading';
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#f0c040] border border-[#f0c040]/30 hover:bg-[#f0c040]/10 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    查看光路可视化
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
