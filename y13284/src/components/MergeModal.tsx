import { useMemo } from 'react';
import { X, Merge } from 'lucide-react';
import { useBusinessStore } from '@/stores/useBusinessStore';

export default function MergeModal() {
  const { showMergeModal, setShowMergeModal, mergeSuggestions, complaints, confirmMerge } =
    useBusinessStore();

  const suggestion = useMemo(
    () => mergeSuggestions.find((m) => m.groupId === showMergeModal),
    [mergeSuggestions, showMergeModal]
  );

  const relatedComplaints = useMemo(
    () => (suggestion ? complaints.filter((c) => suggestion.complaintIds.includes(c.id)) : []),
    [suggestion, complaints]
  );

  const diffFields = useMemo(() => {
    const fields = ['occurredAt', 'source', 'status', 'content'];
    return fields.filter((f) => {
      const vals = new Set(relatedComplaints.map((c) => String((c as unknown as Record<string, unknown>)[f])));
      return vals.size > 1;
    });
  }, [relatedComplaints]);

  if (!suggestion) return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso.replace(' ', 'T'));
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-panel-blue border border-white/10 rounded-sm shadow-panel w-[720px] max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Merge size={18} className="text-purple-merge" />
            <span className="text-white font-mono text-base">
              拟归并确认 - {suggestion.intersection}
            </span>
          </div>
          <button
            onClick={() => setShowMergeModal(null)}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-4 mb-5">
            {relatedComplaints.map((c) => (
              <div
                key={c.id}
                className="bg-space-deep/60 border border-white/10 rounded-sm p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 font-mono">{c.id.slice(-8)}</span>
                  <span className="text-xs text-purple-merge border border-purple-merge/30 px-2 py-0.5 rounded-sm">
                    {c.source}
                  </span>
                </div>
                <div className="text-sm text-white/80 font-mono mb-1.5">
                  {formatTime(c.occurredAt)}
                </div>
                <div className="text-xs text-cyan-glow/80 mb-2">状态：{c.status}</div>
                <div className="text-xs text-white/60 leading-relaxed line-clamp-3">
                  {c.content}
                </div>
              </div>
            ))}
          </div>

          <div className="border border-white/10 rounded-sm p-4">
            <div className="text-sm text-white/60 mb-3">差异点列表</div>
            {diffFields.length === 0 ? (
              <div className="text-xs text-white/40">无显著差异</div>
            ) : (
              <div className="space-y-2">
                {diffFields.map((f) => (
                  <div key={f} className="text-xs">
                    <span className="text-amber-warn mr-2">{f}</span>
                    {relatedComplaints.map((c, i) => (
                      <span key={c.id} className="text-white/70">
                        {String((c as unknown as Record<string, unknown>)[f]).slice(0, 40)}
                        {i < relatedComplaints.length - 1 && (
                          <span className="text-white/30 mx-2">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={() => setShowMergeModal(null)}
            className="px-5 py-2 text-sm text-white/70 border border-white/20 hover:bg-white/5 rounded-sm transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => confirmMerge(suggestion.groupId)}
            className="px-5 py-2 text-sm text-white bg-purple-merge hover:bg-purple-merge/80 rounded-sm transition-colors"
          >
            确认归并
          </button>
        </div>
      </div>
    </div>
  );
}
