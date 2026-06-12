import { Upload, Pencil, CheckCircle, ChevronRight } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { ACTION_LABELS, ActionType } from '@/types';

function ActionIcon({ action }: { action: ActionType }) {
  if (action === 'import') return <Upload size={12} />;
  if (action === 'revise') return <Pencil size={12} />;
  return <CheckCircle size={12} />;
}

export default function VersionTimeline() {
  const { versions, activeVersionId, setActiveVersion } = useReviewStore();
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="glass-panel p-4" style={{ width: 280 }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-cyan-glow/20 flex items-center justify-center">
          <ChevronRight size={14} className="text-cyan-glow" />
        </div>
        <span className="font-display font-semibold text-ocean-50 text-sm">版本历史</span>
        <span className="text-[10px] text-ocean-400 ml-auto">{versions.length} 个版本</span>
      </div>

      <div className="divider-glow mb-3" />

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {sortedVersions.map((v, idx) => {
          const isActive = v.id === activeVersionId;
          const diffCount = Object.keys(v.diff).length;
          return (
            <div
              key={v.id}
              className="timeline-node cursor-pointer"
              onClick={() => setActiveVersion(isActive ? null : v.id)}
            >
              <div
                className={`glass-panel p-3 transition-all ${
                  isActive
                    ? 'border-cyan-glow/50 shadow-glow-cyan -translate-x-0.5'
                    : 'opacity-80 hover:opacity-100'
                }`}
                style={{ marginLeft: idx === sortedVersions.length - 1 ? 0 : undefined }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        v.action === 'import'
                          ? 'bg-ocean-500/30 text-ocean-200'
                          : v.action === 'revise'
                          ? 'bg-amber-risk/20 text-amber-risk'
                          : 'bg-cyan-glow/20 text-cyan-glow'
                      }`}
                    >
                      <ActionIcon action={v.action} />
                    </span>
                    <span className="text-xs font-medium text-ocean-100">
                      {ACTION_LABELS[v.action]}
                    </span>
                  </div>
                  <span className="text-[10px] text-ocean-400">
                    {v.createdAt.split(' ')[1]}
                  </span>
                </div>
                <p className="text-[11px] text-ocean-300 leading-snug mb-1.5 line-clamp-2">
                  {v.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-ocean-400">{v.operator}</span>
                  {diffCount > 0 && (
                    <span className="text-[10px] text-cyan-glow">
                      {diffCount} 项变更
                    </span>
                  )}
                </div>
                {isActive && diffCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-ocean-700/50 space-y-1">
                    {Object.entries(v.diff).slice(0, 3).map(([id, d]) => (
                      <div key={id} className="flex items-center justify-between text-[10px]">
                        <span className="text-ocean-400">{id}</span>
                        <div className="flex items-center gap-1">
                          {d.before?.count !== undefined && (
                            <span className="text-crimson-risk line-through">
                              {d.before.count}
                            </span>
                          )}
                          {d.after?.count !== undefined && d.before?.count !== d.after?.count && (
                            <>
                              <span className="text-ocean-500">→</span>
                              <span className="text-cyan-glow font-semibold">{d.after.count}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {diffCount > 3 && (
                      <p className="text-[10px] text-ocean-500">+{diffCount - 3} 项更多...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
