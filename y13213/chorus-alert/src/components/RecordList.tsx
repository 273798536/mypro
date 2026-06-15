import { useApp } from '../context/AppContext';
import {
  VoicePartLabels,
  AlertLevelLabels,
  RecordStatusLabels,
  VersionSourceLabels,
} from '../types';
import type { ChorusAlertRecord, AlertLevel, RecordStatus } from '../types';

function getLevelBadgeClass(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return 'badge badge-critical';
    case 'warning':
      return 'badge badge-warning';
    case 'normal':
      return 'badge badge-normal';
    default:
      return 'badge';
  }
}

function getStatusBadgeClass(status: RecordStatus): string {
  switch (status) {
    case 'pending':
      return 'badge badge-status-pending';
    case 'reviewed':
      return 'badge badge-status-reviewed';
    case 'resolved':
      return 'badge badge-status-resolved';
    default:
      return 'badge';
  }
}

function RecordRow({ record }: { record: ChorusAlertRecord }) {
  const { selectRecord, selectedRecordId } = useApp();
  const hasLate = record.screenshots.some((s) => s.isLate);
  const hasOldMaster = record.versionInfo?.source === 'old_master';
  const isSelected = selectedRecordId === record.id;

  return (
    <tr
      className={`record-row ${isSelected ? 'selected' : ''}`}
      onClick={() => selectRecord(isSelected ? null : record.id)}
    >
      <td className="col-title">
        <div className="title-main">{record.title}</div>
        <div className="title-sub">
          <span>{record.rehearsalDate}</span>
          <span>·</span>
          <span>{record.studentName}</span>
        </div>
        {(hasLate || hasOldMaster) && (
          <div className="title-tags">
            {hasLate && <span className="tag tag-late">⏰ 含晚到附件</span>}
            {hasOldMaster && <span className="tag tag-old">📼 旧版母带混入</span>}
          </div>
        )}
      </td>
      <td>
        <span className="badge badge-voice">{VoicePartLabels[record.voicePart]}</span>
      </td>
      <td>
        <span className={getLevelBadgeClass(record.alertLevel)}>
          {AlertLevelLabels[record.alertLevel]}
        </span>
        {record.operatorOverride && (
          <div className="override-hint">🛠 人工调整</div>
        )}
      </td>
      <td>
        <span className={getStatusBadgeClass(record.status)}>
          {RecordStatusLabels[record.status]}
        </span>
      </td>
      <td>
        {record.versionInfo ? (
          <span
            className={
              record.versionInfo.source === 'old_master'
                ? 'badge badge-old-master'
                : 'badge badge-version'
            }
          >
            {VersionSourceLabels[record.versionInfo.source]}
          </span>
        ) : (
          <span className="badge badge-version">—</span>
        )}
      </td>
      <td className="col-notes">
        {record.manualNotes.length > 0 ? (
          <span>📝 {record.manualNotes.length}</span>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
    </tr>
  );
}

export default function RecordList() {
  const { filteredRecords, records } = useApp();

  if (filteredRecords.length === 0) {
    return (
      <div className="record-list">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">
            {records.length === 0 ? '暂无数据' : '没有匹配筛选条件的记录'}
          </div>
          <div className="empty-desc">
            {records.length === 0
              ? '请刷新页面重新加载示例数据，或手动导入排练记录。'
              : '请调整筛选条件后重试。'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="record-list">
      <table className="record-table">
        <thead>
          <tr>
            <th>记录 / 学生 / 排练日期</th>
            <th>声部</th>
            <th>异常等级</th>
            <th>状态</th>
            <th>版本来源</th>
            <th>备注数</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map((r) => (
            <RecordRow key={r.id} record={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
