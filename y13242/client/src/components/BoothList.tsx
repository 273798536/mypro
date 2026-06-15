import type { Booth, Issue } from '../types';

interface Props {
  booths: Booth[];
  issues: Issue[];
  onSelect: (id: number) => void;
}

const statusMap: Record<string, string> = {
  pending: '待处理',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '已驳回',
};

export default function BoothList({ booths, issues, onSelect }: Props) {
  const hasIssue = (boothId: number) => {
    return issues.some((issue) => issue.booth_ids.includes(boothId));
  };

  const getIssuesForBooth = (boothId: number) => {
    return issues.filter((issue) => issue.booth_ids.includes(boothId));
  };

  if (booths.length === 0) {
    return <div className="empty-state">暂无摊位记录</div>;
  }

  return (
    <div className="booth-list">
      {booths.map((booth) => {
        const boothIssues = getIssuesForBooth(booth.id);
        const hasIssues = boothIssues.length > 0;
        const hasConclusion = !!booth.final_conclusion;
        const hasAnnotation = !!booth.manual_annotation;
        const hasDelivery = !!booth.delivery_checklist;
        const hasLinkedNotes = hasConclusion && (hasAnnotation || hasDelivery || booth.rehearsal_info || booth.authorization_note);

        return (
          <div
            key={booth.id}
            className={`booth-card status-${booth.status} ${hasIssues ? 'has-issue' : ''}`}
            onClick={() => onSelect(booth.id)}
          >
            <div className="booth-header">
              <div>
                <span className="booth-number">{booth.booth_number}</span>
                <div className="booth-label">{booth.label_name}</div>
              </div>
              <span className={`status-badge ${booth.status}`}>
                {statusMap[booth.status] || booth.status}
              </span>
            </div>

            {booth.song_name && (
              <div className="booth-song">
                🎵 {booth.song_name}
                {booth.song_alias && (
                  <span className="alias"> / 别名：{booth.song_alias}</span>
                )}
                {hasIssues && boothIssues.some((i) => i.type === 'duplicate_song_alias') && (
                  <span className="issue-tag">⚠️ 别名重复</span>
                )}
              </div>
            )}

            <div className="booth-meta">
              {booth.contact_person && <span>👤 {booth.contact_person}</span>}
              {booth.phone && <span>📞 {booth.phone}</span>}
              {booth.rehearsal_info && <span>🎤 有排练信息</span>}
              {booth.authorization_note && <span>📄 有授权备注</span>}
            </div>

            {hasLinkedNotes && (
              <div className="link-chain-indicator">
                🔗 记录与结论、批注、交付清单已互相关联
              </div>
            )}

            {hasConclusion && (
              <div className="conclusion-box">
                <span className="label">📋 最终结论</span>
                {booth.final_conclusion}
              </div>
            )}

            {hasAnnotation && (
              <div className="annotation-box">
                <span className="label">✏️ 人工批注</span>
                {booth.manual_annotation}
              </div>
            )}

            {hasDelivery && (
              <div className="delivery-box">
                <span className="label">📦 交付清单</span>
                {booth.delivery_checklist}
              </div>
            )}

            {hasIssues && (
              <div style={{ marginTop: '10px' }}>
                {boothIssues.map((issue, idx) => (
                  <span key={idx} className="issue-tag">
                    {issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    {' '}{issue.message}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
