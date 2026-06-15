import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ChorusAlertRecord } from '../types';
import {
  VoicePartLabels,
  AlertLevelLabels,
  AlertLevel,
  RecordStatusLabels,
  RecordStatus,
  VersionSourceLabels,
} from '../types';

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

function ScreenshotGallery({ record }: { record: ChorusAlertRecord }) {
  const [activeId, setActiveId] = useState<string>(record.screenshots[0]?.id || '');
  const active = record.screenshots.find((s) => s.id === activeId);

  if (record.screenshots.length === 0) {
    return <div className="muted">暂无截图附件</div>;
  }

  return (
    <div className="screenshot-gallery">
      <div className="screenshot-main">
        {active && (
          <>
            <img src={active.dataUrl} alt={active.fileName} />
            {active.isLate && (
              <div className="late-ribbon">⏰ 晚到附件</div>
            )}
          </>
        )}
      </div>
      <div className="screenshot-thumbs">
        {record.screenshots.map((s) => (
          <div
            key={s.id}
            className={`thumb ${s.id === activeId ? 'active' : ''} ${s.isLate ? 'thumb-late' : ''}`}
            onClick={() => setActiveId(s.id)}
          >
            <img src={s.dataUrl} alt="" />
            <div className="thumb-name">{s.fileName}</div>
            {s.isLate && <span className="thumb-tag">晚到</span>}
          </div>
        ))}
      </div>
      {active?.note && (
        <div className="screenshot-note">
          <strong>附件备注：</strong> {active.note}
        </div>
      )}
      {active && (
        <div className="screenshot-meta muted">
          上传时间：{formatDateTime(active.uploadedAt)}
          {active.isLate && <span className="late-hint"> （已标记为晚到附件）</span>}
        </div>
      )}
    </div>
  );
}

function VersionInfoPanel({ record }: { record: ChorusAlertRecord }) {
  if (!record.versionInfo) return null;
  const isOld = record.versionInfo.source === 'old_master';

  return (
    <div className={`version-panel ${isOld ? 'version-old' : ''}`}>
      <div className="version-header">
        <span className="version-icon">{isOld ? '📼' : '🔖'}</span>
        <strong>版本来源检测：{VersionSourceLabels[record.versionInfo.source]}</strong>
      </div>
      <div className="version-body">
        <div className="version-row">
          <span className="muted">原始文件名：</span>
          <span className="mono">{record.versionInfo.originalFileName}</span>
        </div>
        {record.versionInfo.fileHash && (
          <div className="version-row">
            <span className="muted">文件指纹：</span>
            <span className="mono">{record.versionInfo.fileHash}</span>
          </div>
        )}
        <div className="version-row">
          <span className="muted">检测时间：</span>
          <span>{formatDateTime(record.versionInfo.detectedAt)}</span>
        </div>
        <div className="version-row">
          <span className="muted">是否覆盖新版：</span>
          <span className={record.versionInfo.shouldOverride ? 'text-danger' : 'text-safe'}>
            {record.versionInfo.shouldOverride
              ? '已覆盖（不推荐）'
              : '未覆盖 - 保留新版记录，当前仅展示参考'}
          </span>
        </div>
        <div className="version-suggestion">
          <strong>💡 处理建议：</strong>
          <p>{record.versionInfo.suggestion}</p>
        </div>
      </div>
    </div>
  );
}

function ManualNotes({ record }: { record: ChorusAlertRecord }) {
  const { addManualNote, updateManualNote } = useApp();
  const [newContent, setNewContent] = useState('');
  const [author, setAuthor] = useState('阿蓝');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const handleAdd = () => {
    if (!newContent.trim()) return;
    addManualNote(record.id, newContent.trim(), author.trim() || '匿名');
    setNewContent('');
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditingContent(content);
  };

  const saveEdit = () => {
    if (!editingId || !editingContent.trim()) return;
    updateManualNote(record.id, editingId, editingContent.trim());
    setEditingId(null);
    setEditingContent('');
  };

  return (
    <div className="manual-notes">
      <h4>📝 人工备注</h4>
      {record.manualNotes.length === 0 && (
        <div className="muted">暂无备注，演出统筹可在此补充文字说明。</div>
      )}
      <div className="notes-list">
        {record.manualNotes.map((n) => (
          <div key={n.id} className="note-item">
            <div className="note-header">
              <strong>{n.author}</strong>
              <span className="muted">· {formatDateTime(n.updatedAt)}</span>
              {editingId !== n.id && (
                <button className="btn btn-link" onClick={() => startEdit(n.id, n.content)}>
                  编辑
                </button>
              )}
            </div>
            {editingId === n.id ? (
              <div className="note-edit">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={3}
                />
                <div className="note-edit-actions">
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                    保存
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditingContent('');
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="note-content">{n.content}</div>
            )}
          </div>
        ))}
      </div>
      <div className="note-add">
        <div className="note-add-row">
          <input
            type="text"
            placeholder="操作人（如：阿蓝）"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="input-author"
          />
        </div>
        <textarea
          placeholder="输入备注内容，记录学生进步情况或排练建议..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={!newContent.trim()}>
          添加备注
        </button>
      </div>
    </div>
  );
}

function JudgmentOverride({ record }: { record: ChorusAlertRecord }) {
  const { updateRecordLevel, updateRecordStatus } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<AlertLevel>(record.alertLevel);
  const [selectedStatus, setSelectedStatus] = useState<RecordStatus>(record.status);
  const [note, setNote] = useState('');

  const applyLevel = () => {
    updateRecordLevel(record.id, selectedLevel, note.trim() || undefined);
    setNote('');
  };

  const applyStatus = () => {
    updateRecordStatus(record.id, selectedStatus);
  };

  return (
    <div className="judgment-override">
      <h4>🛠 统筹操作（阿蓝专用）</h4>
      {record.operatorOverride && (
        <div className="override-history">
          <strong>历史调整记录：</strong>
          <div className="override-history-item">
            <span>操作人：{record.operatorOverride.operator}</span>
            <span>·</span>
            <span>{formatDateTime(record.operatorOverride.timestamp)}</span>
          </div>
          {record.operatorOverride.overrideNote && (
            <div className="override-history-note">
              说明：{record.operatorOverride.overrideNote}
            </div>
          )}
        </div>
      )}
      <div className="override-grid">
        <div className="override-item">
          <label>异常等级调整</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as AlertLevel)}
          >
            {Object.values(AlertLevel).map((v) => (
              <option key={v} value={v}>
                {AlertLevelLabels[v]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="调整说明（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={applyLevel}
            disabled={selectedLevel === record.alertLevel && !note.trim()}
          >
            应用并记入历史
          </button>
        </div>
        <div className="override-item">
          <label>处理状态更新</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as RecordStatus)}
          >
            {Object.values(RecordStatus).map((v) => (
              <option key={v} value={v}>
                {RecordStatusLabels[v]}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={applyStatus}
            disabled={selectedStatus === record.status}
          >
            更新状态
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ recordId }: { recordId: string }) {
  const { history } = useApp();
  const recordHistory = history
    .filter((h) => h.recordId === recordId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const actionTypeLabels: Record<string, string> = {
    create: '📥 创建',
    update_status: '🔄 状态更新',
    update_level: '🏷 等级调整',
    add_note: '📝 新增备注',
    update_note: '✏️ 更新备注',
    detect_version: '🔍 版本检测',
    add_attachment: '📎 附件上传',
    update_judgment: '🛠 人工判断',
  };

  return (
    <div className="history-panel">
      <h4>🕒 操作历史（下一班同事可查看完整过程）</h4>
      {recordHistory.length === 0 ? (
        <div className="muted">暂无历史记录</div>
      ) : (
        <div className="history-timeline">
          {recordHistory.map((h) => (
            <div key={h.id} className="history-item">
              <div className="history-time muted">{formatDateTime(h.timestamp)}</div>
              <div className="history-body">
                <div className="history-action">
                  <span className="history-action-type">
                    {actionTypeLabels[h.actionType] || h.actionType}
                  </span>
                  <span className="history-operator">· {h.operator}</span>
                </div>
                <div className="history-desc">{h.description}</div>
                {h.oldValue && h.newValue && (
                  <div className="history-diff muted">
                    <span className="diff-old">{h.oldValue}</span>
                    <span> → </span>
                    <span className="diff-new">{h.newValue}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecordDetail() {
  const { selectedRecordId, selectRecord, records } = useApp();
  const record = records.find((r) => r.id === selectedRecordId);

  if (!record) {
    return (
      <div className="record-detail empty">
        <div className="empty-detail">
          <div className="empty-detail-icon">👈</div>
          <div className="empty-detail-title">请选择左侧列表中的一条记录</div>
          <div className="empty-detail-desc">
            点击记录行可查看详情：截图、版本标记、人工备注、操作历史等。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="record-detail">
      <div className="detail-header">
        <div>
          <div className="detail-title">{record.title}</div>
          <div className="detail-sub">
            <span className="badge badge-voice">{VoicePartLabels[record.voicePart]}</span>
            <span>·</span>
            <span>{record.studentName}</span>
            <span>·</span>
            <span>{record.rehearsalDate}</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => selectRecord(null)}>
          关闭
        </button>
      </div>

      <div className="detail-body">
        <section>
          <h4>🔎 检测问题</h4>
          <div className="issue-box">{record.detectedIssue}</div>
        </section>

        {record.improvementNote && (
          <section>
            <h4>📈 进步记录 / 排练建议</h4>
            <div className="improvement-box">{record.improvementNote}</div>
          </section>
        )}

        <section>
          <h4>🖼 排练群截图附件</h4>
          <ScreenshotGallery record={record} />
        </section>

        <section>
          <VersionInfoPanel record={record} />
        </section>

        <section>
          <JudgmentOverride record={record} />
        </section>

        <section>
          <ManualNotes record={record} />
        </section>

        <section>
          <HistoryPanel recordId={record.id} />
        </section>
      </div>
    </div>
  );
}
