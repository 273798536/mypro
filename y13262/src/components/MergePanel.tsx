import { useState } from 'react';
import { GitMerge, Check, Undo2, Link2 } from 'lucide-react';
import type { Complaint, MergeRecord } from '../../shared/types';

interface MergePanelProps {
  complaints: Complaint[];
  mergeRecord: MergeRecord | null;
  onMerge: (complaint_ids: string[], merged_location: string, merge_basis: string) => void;
  onConfirm: (merge_id: string) => void;
  onUnmerge: (merge_id: string) => void;
}

export default function MergePanel({
  complaints,
  mergeRecord,
  onMerge,
  onConfirm,
  onUnmerge,
}: MergePanelProps) {
  const [mergeBasis, setMergeBasis] = useState('');
  const [mergedLocation, setMergedLocation] = useState('');

  const suggestedMerges = complaints.filter(
    (c, i, arr) => arr.some((other, j) => j !== i && other.location_normalized === c.location_normalized)
  );

  const groupedByLocation = suggestedMerges.reduce<Record<string, Complaint[]>>((acc, c) => {
    const key = c.location_normalized;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (mergeRecord?.confirmed_at) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          <Check size={18} style={{ color: 'var(--color-success)' }} />
          已确认归并
        </h3>

        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
          <div className="text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>归并位置：</span>
            <span className="font-medium">{mergeRecord.merged_location}</span>
          </div>
          <div className="text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>归并依据：</span>
            <span>{mergeRecord.merge_basis}</span>
          </div>
          <div className="text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>确认人：</span>
            <span>{mergeRecord.confirmed_by || '—'}</span>
          </div>
          <div className="text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>确认时间：</span>
            <span>{mergeRecord.confirmed_at ? new Date(mergeRecord.confirmed_at).toLocaleString('zh-CN') : '—'}</span>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>原始位置：</p>
            {mergeRecord.original_locations.map((loc) => (
              <div key={loc.complaint_id} className="flex items-center gap-2 text-sm py-1">
                <Link2 size={12} style={{ color: 'var(--color-accent)' }} />
                <span>{loc.location_raw}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onUnmerge(mergeRecord.id)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-danger)' }}
        >
          <Undo2 size={14} />
          取消归并
        </button>
      </div>
    );
  }

  if (mergeRecord) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          <GitMerge size={18} style={{ color: 'var(--color-accent)' }} />
          待确认归并
        </h3>

        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
          <div className="text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>归并位置：</span>
            <span className="font-medium">{mergeRecord.merged_location}</span>
          </div>
          <div className="text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>归并依据：</span>
            <span>{mergeRecord.merge_basis}</span>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>原始位置：</p>
            {mergeRecord.original_locations.map((loc) => (
              <div key={loc.complaint_id} className="flex items-center gap-2 text-sm py-1">
                <Link2 size={12} style={{ color: 'var(--color-accent)' }} />
                <span>{loc.location_raw}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(mergeRecord.id)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Check size={14} />
            确认归并
          </button>
          <button
            onClick={() => onUnmerge(mergeRecord.id)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-danger)' }}
          >
            <Undo2 size={14} />
            取消归并
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
        <GitMerge size={18} style={{ color: 'var(--color-primary)' }} />
        建议归并
      </h3>

      {Object.keys(groupedByLocation).length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          暂无相同位置的投诉可归并
        </p>
      ) : (
        Object.entries(groupedByLocation).map(([location, group]) => (
          <div
            key={location}
            className="rounded-lg border p-4 space-y-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
          >
            <p className="text-sm font-medium">{location}</p>
            {group.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm pl-3">
                <Link2 size={12} style={{ color: 'var(--color-accent)' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>原始位置：</span>
                <span>{c.location_raw}</span>
              </div>
            ))}

            <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <input
                type="text"
                placeholder="归并后位置名称"
                value={mergedLocation}
                onChange={(e) => setMergedLocation(e.target.value)}
                className="w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--color-border)' }}
              />
              <input
                type="text"
                placeholder="归并依据"
                value={mergeBasis}
                onChange={(e) => setMergeBasis(e.target.value)}
                className="w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--color-border)' }}
              />
              <button
                onClick={() => {
                  onMerge(
                    group.map((c) => c.id),
                    mergedLocation || location,
                    mergeBasis || '相同位置'
                  );
                  setMergedLocation('');
                  setMergeBasis('');
                }}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <GitMerge size={14} />
                创建归并
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
