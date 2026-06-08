import { useState } from 'react';
import type { AvailabilityStatus, SoundRecord } from '@/types';
import { STATUS_LABELS } from '@/types';
import { SectionTitle, StatusBadge, EmptyState } from '@/components/common/Badges';
import { useRecordsStore } from '@/store/records';
import { useParamLinkage } from '@/hooks/useParamLinkage';
import { formatDateTime } from '@/utils/formatters';
import { MessageSquarePlus, User } from 'lucide-react';

const statusColors: Record<AvailabilityStatus, string> = {
  usable: 'accent-status-usable',
  review_needed: 'accent-status-review',
  unusable: 'accent-status-unusable',
};

export function ProcessNotesPanel({ record }: { record: SoundRecord }) {
  const addNote = useRecordsStore((s) => s.addProcessNote);
  const { changeAndTrace } = useParamLinkage();
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<AvailabilityStatus>(record.availabilityStatus);

  const submit = () => {
    if (!content.trim()) return;
    const who = author.trim() || '匿名';
    if (status !== record.availabilityStatus) {
      changeAndTrace(record.id, 'availabilityStatus', record.availabilityStatus, status, '处理意见更新状态');
    }
    addNote(record.id, { author: who, content: content.trim(), recordId: record.id, statusAfter: status });
    setContent('');
  };

  return (
    <section className="card p-4">
      <SectionTitle>
        <span className="flex items-center gap-1.5">
          <MessageSquarePlus size={13} /> 处理意见
        </span>
      </SectionTitle>

      <div className="mb-4 space-y-2.5">
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <label className="text-[11px] text-hall-textMute">处理人</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="姓名，默认：匿名"
            className="input !py-1 !text-xs"
          />
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <label className="text-[11px] text-hall-textMute">标记为</label>
          <div className="flex items-center gap-4">
            {(['usable', 'review_needed', 'unusable'] as AvailabilityStatus[]).map((s) => (
              <label key={s} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name={`st_${record.id}`} checked={status === s} onChange={() => setStatus(s)} className={statusColors[s]} />
                <StatusBadge status={s} />
              </label>
            ))}
          </div>
        </div>
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="填写处理结论、修改建议或复核意见…"
            rows={3}
            className="input resize-none"
          />
        </div>
        <div className="flex justify-end">
          <button onClick={submit} disabled={!content.trim()} className="btn btn-primary disabled:opacity-50">
            <MessageSquarePlus size={13} /> 提交处理意见
          </button>
        </div>
      </div>

      <div className="border-t border-hall-border pt-3">
        {record.processNotes.length === 0 ? (
          <EmptyState title="暂无处理记录" desc="规划设计师可在上方填写处理意见" />
        ) : (
          <ol className="relative border-l border-hall-border ml-2 space-y-4">
            {record.processNotes.map((n) => (
              <li key={n.id} className="ml-4 relative">
                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-hall-bg2 border-2 border-hall-accent/50" />
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    <User size={12} className="text-hall-textMute" />
                    {n.author}
                  </span>
                  <span className="text-[10px] text-hall-textMute">{formatDateTime(n.createdAt)}</span>
                  <StatusBadge status={n.statusAfter} />
                </div>
                <div className="text-xs text-hall-textDim whitespace-pre-wrap">{n.content}</div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
