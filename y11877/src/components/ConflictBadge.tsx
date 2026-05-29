import type { ConflictSource, PendingAction } from '@/utils/types';

const conflictLabels: Record<ConflictSource, { label: string; color: string }> = {
  intersection_mismatch: { label: '交点计算冲突', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  reflection_angle_deviation: { label: '反射角偏差', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  boundary_exceeded: { label: '边界越出', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  angle_unit_conflict: { label: '角度单位冲突', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  parallel_no_intersection: { label: '平行无交', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  extension_line_intersection: { label: '延长线交点', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const actionLabels: Record<PendingAction, { label: string; color: string }> = {
  verify_parallel_intent: { label: '→ 请确认平行是否为预期', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  check_extension_validity: { label: '→ 请确认延长线交点是否有效', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25' },
  confirm_angle_unit: { label: '→ 请确认角度单位是否正确', color: 'bg-pink-500/15 text-pink-300 border-pink-500/25' },
};

interface Props {
  sources: ConflictSource[];
  action: PendingAction | null;
}

export default function ConflictBadge({ sources, action }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((s) => {
        const cfg = conflictLabels[s];
        return (
          <span
            key={s}
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cfg.color}`}
          >
            {cfg.label}
          </span>
        );
      })}
      {action && (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${actionLabels[action].color}`}
        >
          {actionLabels[action].label}
        </span>
      )}
    </div>
  );
}
