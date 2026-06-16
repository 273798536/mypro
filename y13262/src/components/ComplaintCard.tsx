import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, MessageSquare, GitMerge } from 'lucide-react';
import type { Complaint } from '../../shared/types';
import StatusBadge from './StatusBadge';

interface ComplaintCardProps {
  complaint: Complaint;
}

export default function ComplaintCard({ complaint }: ComplaintCardProps) {
  const navigate = useNavigate();

  const truncated =
    complaint.original_text.length > 80
      ? complaint.original_text.slice(0, 80) + '...'
      : complaint.original_text;

  return (
    <div
      onClick={() => navigate(`/complaint/${complaint.id}`)}
      className="cursor-pointer rounded-xl border p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-sm font-medium truncate">{complaint.location_raw}</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
            {truncated}
          </p>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {new Date(complaint.reported_at).toLocaleDateString('zh-CN')}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={12} />
          {complaint.note ? complaint.note.slice(0, 20) + (complaint.note.length > 20 ? '...' : '') : '无备注'}
        </span>
        {complaint.merge_group_id && (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
            <GitMerge size={12} />
            已归并
          </span>
        )}
      </div>
    </div>
  );
}
