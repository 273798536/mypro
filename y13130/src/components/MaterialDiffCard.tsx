import { Material, MaterialType } from '@/types';
import { History, Target, MessageSquare } from 'lucide-react';

const labels: Record<MaterialType, { label: string; Icon: typeof History }> = {
  historical_answer: { label: '历史答案', Icon: History },
  boundary_sample: { label: '边界样本', Icon: Target },
  oral_note: { label: '临时口头说明', Icon: MessageSquare },
};

export default function MaterialDiffCard({ material }: { material: Material }) {
  const { label, Icon } = labels[material.type];
  const changed = material.changedFromPrevious;
  return (
    <div className={`card p-4 flex flex-col gap-3 ${changed ? 'ring-2 ring-amber-400/50 bg-amber-50/30' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={changed ? 'text-amber-600' : 'text-ink-700'} />
          <span className="font-bold text-sm text-ink-900">{label}</span>
          <span className="text-[10px] text-ink-600 font-mono">v{material.version}</span>
        </div>
        <div className="flex items-center gap-2">
          {changed && (
            <span className="tag bg-amber-100 text-amber-700 text-[10px] border border-amber-200">
              口径已变更
            </span>
          )}
          <span className="text-[10px] text-ink-600">{material.lastModified}</span>
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-xs text-ink-800 font-mono leading-relaxed bg-paper-50 border border-paper-200 rounded p-3">
        {material.content}
      </pre>
    </div>
  );
}
