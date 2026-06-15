import React from 'react';
import { formatDate, getFieldLabel, formatValue } from '../utils';

function VersionTimeline({ history, supplementRecords }) {
  const allEvents = [
    ...history.map(h => ({
      ...h,
      type: 'version',
      timestamp: new Date(h.changed_at).getTime()
    })),
    ...supplementRecords.map(s => ({
      ...s,
      type: 'supplement',
      timestamp: new Date(s.supplemented_at).getTime()
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  if (allEvents.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📜</div>
        <div>暂无变更记录</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {allEvents.map((event, idx) => (
        <div key={idx} className="timeline-item">
          <div className="time">
            {formatDate(event.type === 'version' ? event.changed_at : event.supplemented_at)}
            <span className="tag" style={{ marginLeft: '0.5rem' }}>
              {event.type === 'version' ? '变更' : '补录'}
            </span>
          </div>
          
          {event.type === 'version' ? (
            <>
              <div className="field">{getFieldLabel(event.field_name)}</div>
              <div className="change">
                {event.old_value !== null && (
                  <span className="old-value">{formatValue(event.field_name, event.old_value)}</span>
                )}
                →
                <span className="new-value"> {formatValue(event.field_name, event.new_value)}</span>
              </div>
              {event.change_reason && (
                <div className="reason">原因：{event.change_reason}</div>
              )}
              <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                操作人：{event.changer_name}
              </div>
            </>
          ) : (
            <>
              <div className="field">照片补录：{event.file_name}</div>
              <div className="change">
                {event.changes?.action === 'add_supplement' && (
                  <span>新增照片，从 {event.changes.previousPhotoCount} 张变为 {event.changes.newPhotoCount} 张</span>
                )}
                {event.changes?.action === 'update_point' && (
                  <span>
                    地图点位调整：
                    ({event.changes.oldLatitude}, {event.changes.oldLongitude}) 
                    → 
                    ({event.changes.newLatitude}, {event.changes.newLongitude})
                    <span className="tag tag-warning" style={{ marginLeft: '0.3rem' }}>
                      偏移 {event.changes.distanceMeters} 米
                    </span>
                  </span>
                )}
              </div>
              {event.changes?.supplementNote && (
                <div className="reason">说明：{event.changes.supplementNote}</div>
              )}
              <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                补录人：{event.supplementer_name}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default VersionTimeline;
