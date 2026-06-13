import { useState } from 'react';
import type { Attachment, CollisionObject, AttachmentType, AttachmentVersion } from '../types';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  History,
  User,
  Link,
  Plus,
  Save,
  X,
  Upload,
  Edit3,
  Tag,
} from 'lucide-react';

const TYPE_LABELS: Record<AttachmentType, string> = {
  cad_drawing: 'CAD图纸',
  supplement: '补充附件',
  verbal_note: '口头说明',
  official_document: '正式文件',
};

const TYPE_COLORS: Record<AttachmentType, string> = {
  cad_drawing: '#2e86de',
  supplement: '#f39c12',
  verbal_note: '#e74c3c',
  official_document: '#27ae60',
};

interface AttachmentPanelProps {
  attachments: Attachment[];
  objects: CollisionObject[];
  selectedAttachmentId: string | null;
  onSelectAttachment: (id: string) => void;
  onHighlightObjects: (objectIds: string[]) => void;
}

export default function AttachmentPanel({
  attachments,
  objects,
  selectedAttachmentId,
  onSelectAttachment,
  onHighlightObjects,
}: AttachmentPanelProps) {
  const { dispatch, generateId, getCurrentTime } = useApp();
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState<string | null>(null);

  const [newAttachment, setNewAttachment] = useState<Partial<Attachment>>({
    name: '',
    type: 'cad_drawing',
    uploadedBy: '',
    isLateArrival: false,
    notes: '',
  });

  const [newVersion, setNewVersion] = useState<Partial<AttachmentVersion>>({
    description: '',
    changeSummary: '',
    author: '',
    affectedObjectIds: [],
  });

  const selectedAttachment = attachments.find((a) => a.id === selectedAttachmentId);

  function toggleVersion(attId: string) {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(attId)) {
        next.delete(attId);
      } else {
        next.add(attId);
      }
      return next;
    });
  }

  function getObjectsByAttachment(attId: string): CollisionObject[] {
    return objects.filter((obj) => obj.sourceAttachmentId === attId);
  }

  function getAbnormalCount(attId: string): number {
    return objects.filter(
      (obj) => obj.sourceAttachmentId === attId && obj.isAbnormal
    ).length;
  }

  function handleAddAttachment() {
    if (!newAttachment.name?.trim()) {
      alert('请输入附件名称');
      return;
    }
    if (!newAttachment.uploadedBy?.trim()) {
      alert('请输入提交人');
      return;
    }

    const now = getCurrentTime();
    const attId = generateId('att');

    const initialVersion: AttachmentVersion = {
      version: 1,
      timestamp: now,
      author: newAttachment.uploadedBy,
      description: '初始版本',
      changeSummary: newAttachment.notes || '首次提交',
      affectedObjectIds: [],
    };

    const attachment: Attachment = {
      id: attId,
      name: newAttachment.name.trim(),
      type: newAttachment.type as AttachmentType,
      uploadedAt: now,
      uploadedBy: newAttachment.uploadedBy.trim(),
      isLateArrival: newAttachment.isLateArrival || false,
      currentVersion: 1,
      notes: newAttachment.notes || '',
      versions: [initialVersion],
    };

    dispatch({ type: 'ADD_ATTACHMENT', payload: attachment });
    onSelectAttachment(attId);

    setNewAttachment({
      name: '',
      type: 'cad_drawing',
      uploadedBy: '',
      isLateArrival: false,
      notes: '',
    });
    setShowAddForm(false);
  }

  function handleAddVersion() {
    if (!showVersionForm) return;
    if (!newVersion.description?.trim()) {
      alert('请输入版本说明');
      return;
    }
    if (!newVersion.changeSummary?.trim()) {
      alert('请输入变更说明');
      return;
    }
    if (!newVersion.author?.trim()) {
      alert('请输入提交人');
      return;
    }

    const attachment = attachments.find((a) => a.id === showVersionForm);
    if (!attachment) return;

    const version: AttachmentVersion = {
      version: attachment.currentVersion + 1,
      timestamp: getCurrentTime(),
      author: newVersion.author.trim(),
      description: newVersion.description.trim(),
      changeSummary: newVersion.changeSummary.trim(),
      affectedObjectIds: newVersion.affectedObjectIds || [],
    };

    dispatch({
      type: 'ADD_ATTACHMENT_VERSION',
      payload: { attachmentId: showVersionForm, version },
    });

    setNewVersion({
      description: '',
      changeSummary: '',
      author: '',
      affectedObjectIds: [],
    });
    setShowVersionForm(null);
    if (!expandedVersions.has(showVersionForm)) {
      toggleVersion(showVersionForm);
    }
  }

  function toggleAffectedObject(objId: string) {
    const current = newVersion.affectedObjectIds || [];
    const next = current.includes(objId)
      ? current.filter((id) => id !== objId)
      : [...current, objId];
    setNewVersion({ ...newVersion, affectedObjectIds: next });
  }

  function startAddVersion(attId: string) {
    setShowVersionForm(attId);
    setNewVersion({
      description: '',
      changeSummary: '',
      author: '',
      affectedObjectIds: [],
    });
  }

  return (
    <div className="attachment-panel">
      <div className="panel-header">
        <FileText size={18} />
        <h3>材料附件</h3>
        <span className="count-badge">{attachments.length}</span>
      </div>

      <div className="panel-content">
        <div className="entry-actions">
          <button
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Upload size={14} />
            {showAddForm ? '取消' : '录入附件'}
          </button>
        </div>

        {showAddForm && (
          <div className="edit-form">
            <h4>
              <Plus size={16} />
              录入新材料附件
            </h4>

            <div className="form-group">
              <label>附件名称 *</label>
              <input
                type="text"
                value={newAttachment.name}
                onChange={(e) =>
                  setNewAttachment({ ...newAttachment, name: e.target.value })
                }
                placeholder="如：东区规划图 v3.0.dwg"
              />
            </div>

            <div className="form-group">
              <label>附件类型</label>
              <div className="type-options">
                {(Object.keys(TYPE_LABELS) as AttachmentType[]).map((type) => (
                  <label key={type} className="type-option">
                    <input
                      type="radio"
                      name="attachmentType"
                      value={type}
                      checked={newAttachment.type === type}
                      onChange={(e) =>
                        setNewAttachment({
                          ...newAttachment,
                          type: e.target.value as AttachmentType,
                        })
                      }
                    />
                    <span
                      className="type-tag"
                      style={{ backgroundColor: TYPE_COLORS[type] }}
                    >
                      {TYPE_LABELS[type]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>提交人 *</label>
                <input
                  type="text"
                  value={newAttachment.uploadedBy}
                  onChange={(e) =>
                    setNewAttachment({
                      ...newAttachment,
                      uploadedBy: e.target.value,
                    })
                  }
                  placeholder="如：设计院 - 王工"
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={newAttachment.isLateArrival}
                  onChange={(e) =>
                    setNewAttachment({
                      ...newAttachment,
                      isLateArrival: e.target.checked,
                    })
                  }
                />
                <AlertTriangle size={14} color="#f39c12" />
                标记为晚到附件（预审开始后提交）
              </label>
            </div>

            <div className="form-group">
              <label>备注说明</label>
              <textarea
                value={newAttachment.notes}
                onChange={(e) =>
                  setNewAttachment({ ...newAttachment, notes: e.target.value })
                }
                placeholder="简要说明附件内容和用途..."
                rows={2}
              />
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={handleAddAttachment}>
                <Save size={14} />
                录入附件
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                <X size={14} />
                取消
              </button>
            </div>
          </div>
        )}

        <div className="attachment-list">
          {attachments.map((att) => {
            const abnormalCount = getAbnormalCount(att.id);
            const isSelected = selectedAttachmentId === att.id;
            const hasVersions = att.versions.length > 0;
            const isExpanded = expandedVersions.has(att.id);
            const showVersionForThis = showVersionForm === att.id;

            return (
              <div
                key={att.id}
                className={`attachment-item ${isSelected ? 'selected' : ''} ${att.isLateArrival ? 'late-arrival' : ''}`}
                onClick={() => onSelectAttachment(att.id)}
              >
                <div className="attachment-main">
                  <div
                    className="type-tag"
                    style={{ backgroundColor: TYPE_COLORS[att.type] }}
                  >
                    {TYPE_LABELS[att.type]}
                  </div>
                  <div className="attachment-info">
                    <div className="attachment-name">
                      {att.name}
                      {att.isLateArrival && (
                        <span className="late-badge" title="晚到附件">
                          <Clock size={12} />
                          晚到
                        </span>
                      )}
                    </div>
                    <div className="attachment-meta">
                      <span>
                        <User size={12} />
                        {att.uploadedBy}
                      </span>
                      <span>
                        <Clock size={12} />
                        {att.uploadedAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="attachment-stats">
                  <span className="stat-item">
                    对象: {getObjectsByAttachment(att.id).length}
                  </span>
                  {abnormalCount > 0 && (
                    <span className="stat-item abnormal">
                      <AlertTriangle size={12} />
                      异常: {abnormalCount}
                    </span>
                  )}
                  {hasVersions && (
                    <button
                      className="version-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVersion(att.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      v{att.currentVersion} ({att.versions.length}版)
                    </button>
                  )}
                </div>

                {hasVersions && isExpanded && (
                  <div className="version-history">
                    <div className="version-header">
                      <History size={14} />
                      版本历史
                      <button
                        className="btn-small ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          startAddVersion(att.id);
                        }}
                      >
                        <Edit3 size={12} />
                        新增版本
                      </button>
                    </div>

                    {showVersionForThis && (
                      <div
                        className="edit-form"
                        style={{ margin: '10px 0', padding: '12px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h5 style={{ marginBottom: '10px', fontSize: '13px' }}>
                          <Tag size={14} />
                          新增版本 v{att.currentVersion + 1}
                        </h5>

                        <div className="form-group">
                          <label>版本说明 *</label>
                          <input
                            type="text"
                            value={newVersion.description}
                            onChange={(e) =>
                              setNewVersion({
                                ...newVersion,
                                description: e.target.value,
                              })
                            }
                            placeholder="如：标高更新、补充数据等"
                          />
                        </div>

                        <div className="form-group">
                          <label>变更说明（口径变更） *</label>
                          <textarea
                            value={newVersion.changeSummary}
                            onChange={(e) =>
                              setNewVersion({
                                ...newVersion,
                                changeSummary: e.target.value,
                              })
                            }
                            placeholder="具体变更内容，如：M-3山坡标高从250m更新为290m"
                            rows={2}
                          />
                        </div>

                        <div className="form-group">
                          <label>提交人 *</label>
                          <input
                            type="text"
                            value={newVersion.author}
                            onChange={(e) =>
                              setNewVersion({
                                ...newVersion,
                                author: e.target.value,
                              })
                            }
                            placeholder="如：设计院 - 王工"
                          />
                        </div>

                        <div className="form-group">
                          <label>影响的对象（将标记为异常）</label>
                          <div className="affected-objects">
                            {objects.length === 0 ? (
                              <div className="form-hint">暂无对象，先在CAD图层录入中添加</div>
                            ) : (
                              objects.map((obj) => (
                                <label
                                  key={obj.id}
                                  className={`affected-object ${newVersion.affectedObjectIds?.includes(obj.id) ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      newVersion.affectedObjectIds?.includes(
                                        obj.id
                                      ) || false
                                    }
                                    onChange={() => toggleAffectedObject(obj.id)}
                                  />
                                  <span>{obj.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="form-actions">
                          <button
                            className="btn-primary"
                            onClick={handleAddVersion}
                          >
                            <Save size={14} />
                            保存版本
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowVersionForm(null);
                            }}
                          >
                            <X size={14} />
                            取消
                          </button>
                        </div>
                      </div>
                    )}

                    {[...att.versions].reverse().map((ver, idx) => (
                      <div
                        key={ver.version}
                        className={`version-item ${idx === 0 ? 'current' : ''}`}
                      >
                        <div className="version-top">
                          <span className="version-tag">
                            v{ver.version}
                            {idx === 0 && (
                              <span className="current-tag">当前</span>
                            )}
                          </span>
                          <span className="version-time">{ver.timestamp}</span>
                        </div>
                        <div className="version-desc">{ver.description}</div>
                        <div className="version-change">
                          <strong>变更说明：</strong>
                          {ver.changeSummary}
                        </div>
                        <div
                          className="version-affected"
                          onClick={(e) => {
                            e.stopPropagation();
                            onHighlightObjects(ver.affectedObjectIds);
                          }}
                        >
                          <Link size={12} />
                          影响对象 ({ver.affectedObjectIds.length}个)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {attachments.length === 0 && (
            <div className="empty-entry">
              <FileText size={24} color="#ccc" />
              <p>暂无材料附件</p>
              <p className="hint">点击「录入附件」开始添加</p>
            </div>
          )}
        </div>

        {selectedAttachment && !showAddForm && !showVersionForm && (
          <div className="attachment-detail">
            <h4>附件详情</h4>
            <p className="detail-notes">{selectedAttachment.notes || '（无备注）'}</p>

            <div className="detail-section">
              <h5>关联对象</h5>
              <div className="related-objects">
                {getObjectsByAttachment(selectedAttachment.id).length > 0 ? (
                  getObjectsByAttachment(selectedAttachment.id).map((obj) => (
                    <div
                      key={obj.id}
                      className={`related-object ${obj.isAbnormal ? 'abnormal' : ''}`}
                      onMouseEnter={() => onHighlightObjects([obj.id])}
                      onMouseLeave={() => onHighlightObjects([])}
                    >
                      <span className="obj-name">{obj.name}</span>
                      {obj.isAbnormal && (
                        <span className="obj-abnormal-tag">异常</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="form-hint">暂无关联对象，可在CAD图层录入中关联</p>
                )}
              </div>
            </div>

            {selectedAttachment.isLateArrival && (
              <div className="late-warning">
                <AlertTriangle size={16} />
                <div>
                  <strong>晚到附件提示</strong>
                  <p>
                    该附件在预审开始后提交，可能影响初始结论。请重点核查其对碰撞分析结果的影响。
                  </p>
                </div>
              </div>
            )}

            <div className="detail-actions">
              <button
                className="btn-primary"
                onClick={() => startAddVersion(selectedAttachment.id)}
              >
                <Edit3 size={14} />
                记录口径变更
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
