import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, FileText, Loader2 } from 'lucide-react';
import { useComplaintStore } from '@/stores/complaintStore';
import StatusBadge from '@/components/StatusBadge';
import PhotoGrid from '@/components/PhotoGrid';
import NoteEditor from '@/components/NoteEditor';
import MergePanel from '@/components/MergePanel';
import HistoryTimeline from '@/components/HistoryTimeline';

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentComplaint, loading, fetchComplaint, updateNote, createMerge, confirmMerge, unmerge } = useComplaintStore();

  useEffect(() => {
    if (id) fetchComplaint(id);
  }, [id]);

  if (loading || !currentComplaint) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中...</span>
      </div>
    );
  }

  const { complaint, photos, merge_group, merge_record, history } = currentComplaint;

  const handleSaveNote = async (note: string) => {
    if (id) {
      await updateNote(id, note);
      await fetchComplaint(id);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
        style={{ color: 'var(--color-primary)' }}
      >
        <ArrowLeft size={16} />
        返回列表
      </button>

      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            投诉详情
          </h2>
          <StatusBadge status={complaint.status} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>位置</p>
              <p className="text-sm font-medium">{complaint.location_raw}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>上报时间</p>
              <p className="text-sm font-medium">{new Date(complaint.reported_at).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>来源</p>
              <p className="text-sm font-medium">{complaint.source}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>原始文本</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{complaint.original_text}</p>
        </div>
      </div>

      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <h3 className="text-base font-semibold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          现场照片
        </h3>
        <PhotoGrid photos={photos} />
      </div>

      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <h3 className="text-base font-semibold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          备注
        </h3>
        <NoteEditor complaintId={complaint.id} currentNote={complaint.note} onSave={handleSaveNote} />
      </div>

      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <h3 className="text-base font-semibold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          归并操作
        </h3>
        <MergePanel
          complaints={merge_group || [complaint]}
          mergeRecord={merge_record}
          onMerge={createMerge}
          onConfirm={confirmMerge}
          onUnmerge={unmerge}
        />
      </div>

      {history.length > 0 && (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <h3 className="text-base font-semibold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            备注变更记录
          </h3>
          <HistoryTimeline logs={history.map((h) => ({
            id: h.id,
            merge_group_id: complaint.merge_group_id || '',
            action: 'edit_note' as const,
            before_snapshot: { note: h.old_value },
            after_snapshot: { note: h.new_value },
            operator: h.changed_by,
            operated_at: h.changed_at,
          }))} />
        </div>
      )}
    </div>
  );
}
