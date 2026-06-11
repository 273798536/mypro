import type { ReviewHistory } from '../types';

export default function ReviewHistoryTimeline({ histories }: { histories: ReviewHistory[] }) {
  if (!histories || histories.length === 0) {
    return <div className="empty">暂无历史变更</div>;
  }

  return (
    <div className="timeline">
      {histories.map((h) => {
        const isSystem = h.changed_by === 'system';
        return (
          <div key={h.id} className={`timeline-item ${isSystem ? 'system' : ''}`}>
            <div className="timeline-meta">
              v{h.version} · {h.created_at} · {isSystem ? '系统自动判定' : `复核人：${h.changed_by || '未记录'}`}
            </div>
            <div className="timeline-title">
              {h.old_conclusion && h.new_conclusion
                ? `${h.old_conclusion} → ${h.new_conclusion}`
                : h.new_conclusion || '结论更新'}
            </div>
            <div className="timeline-body">
              {h.change_reason && <p><strong>变更原因：</strong>{h.change_reason}</p>}
              {h.new_note && <p><strong>新备注/操作指引：</strong>{h.new_note}</p>}
              {h.supplementary_material_added && (
                <p><strong>补充材料：</strong>{h.supplementary_material_added}</p>
              )}
            </div>
            {(h.snapshot_before || h.snapshot_after) && (
              <div className="timeline-snapshots">
                {h.snapshot_before && (
                  <div className="timeline-snap">
                    <h5>变更前快照</h5>
                    <pre>{prettyJson(h.snapshot_before)}</pre>
                  </div>
                )}
                {h.snapshot_after && (
                  <div className="timeline-snap">
                    <h5>变更后快照</h5>
                    <pre>{prettyJson(h.snapshot_after)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function prettyJson(s: string): string {
  try { return JSON.stringify(JSON.parse(s), null, 2); }
  catch { return s; }
}
