import type { GradingResult, MirrorSegment, IncidentRay, Verdict } from '@/utils/types';
import { useAppStore } from '@/store/useAppStore';
import ConflictBadge from './ConflictBadge';

interface Props {
  results: GradingResult[];
  mirrors: MirrorSegment[];
  rays: IncidentRay[];
  filter: Verdict | 'all';
}

export default function GradingTable({ results, mirrors, rays, filter }: Props) {
  const selectedResultId = useAppStore((s) => s.selectedResultId);
  const selectResult = useAppStore((s) => s.selectResult);

  const filtered = filter === 'all' ? results : results.filter((r) => r.verdict === filter);

  const verdictIcon = (v: Verdict) => {
    switch (v) {
      case 'pass': return <span className="text-emerald-400">✅</span>;
      case 'error': return <span className="text-red-400">❌</span>;
      case 'pending': return <span className="text-amber-400">⏳</span>;
    }
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        暂无{filter === 'all' ? '' : filter === 'pass' ? '通过' : filter === 'error' ? '错误' : '待确认'}记录
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-[#2d2d44]">
            <th className="text-left py-3 px-3 font-medium">判定</th>
            <th className="text-left py-3 px-3 font-medium">光线→镜面</th>
            <th className="text-left py-3 px-3 font-medium">交点</th>
            <th className="text-left py-3 px-3 font-medium">入射角</th>
            <th className="text-left py-3 px-3 font-medium">反射角</th>
            <th className="text-left py-3 px-3 font-medium">边界</th>
            <th className="text-left py-3 px-3 font-medium">冲突来源</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const ray = rays.find((rr) => rr.id === r.rayId);
            const mirror = mirrors.find((m) => m.id === r.mirrorId);
            const isSelected = selectedResultId === r.id;

            return (
              <tr
                key={r.id}
                onClick={() => selectResult(r.id)}
                className={`border-b border-[#2d2d44]/50 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#f0c040]/10 border-l-2 border-l-[#f0c040]'
                    : 'hover:bg-[#2d2d44]/40 border-l-2 border-l-transparent'
                }`}
              >
                <td className="py-3 px-3">{verdictIcon(r.verdict)}</td>
                <td className="py-3 px-3 font-mono text-xs">
                  <span className="text-[#f0c040]">{r.rayId}</span>
                  <span className="text-gray-600 mx-1">→</span>
                  <span className="text-cyan-400">{r.mirrorId}</span>
                </td>
                <td className="py-3 px-3 font-mono text-xs">
                  {r.intersection
                    ? `(${r.intersection.x.toFixed(2)}, ${r.intersection.y.toFixed(2)})`
                    : r.isParallel
                    ? '—'
                    : '—'}
                </td>
                <td className="py-3 px-3 font-mono text-xs">
                  {r.incidentAngle !== null ? `${r.incidentAngle.toFixed(2)}°` : '—'}
                </td>
                <td className="py-3 px-3 font-mono text-xs">
                  {r.reflectionAngle !== null ? `${r.reflectionAngle.toFixed(2)}°` : '—'}
                </td>
                <td className="py-3 px-3 text-xs">
                  {r.isOnSegment ? (
                    <span className="text-emerald-400">线段上</span>
                  ) : r.isOnExtension ? (
                    <span className="text-amber-400">延长线上</span>
                  ) : r.isParallel ? (
                    <span className="text-gray-500">无交点</span>
                  ) : '—'}
                </td>
                <td className="py-3 px-3">
                  <ConflictBadge sources={r.conflictSources} action={r.pendingAction} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
