import { useState, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { AnnotationMap } from './AnnotationMap';
import type { LocationPoint } from '../types';

export function PlanDetail() {
  const {
    currentView,
    updatePlanField,
    addAnnotation,
    addFeedback,
    addPhoto,
    confirmPlan,
    loading,
  } = useApp();

  const [editingField, setEditingField] = useState<'sceneSummary' | 'sideNote' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddAnnotation, setShowAddAnnotation] = useState(false);
  const [pendingLoc, setPendingLoc] = useState<LocationPoint | null>(null);
  const [newAnnotation, setNewAnnotation] = useState({
    category: '',
    description: '',
    riskLevel: 'medium' as 'low' | 'medium' | 'high',
  });
  const [newFeedback, setNewFeedback] = useState({ author: '', content: '' });
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentView) {
    return (
      <div className="panel plan-detail empty">
        <div className="empty-state large">
          <div className="empty-icon">🏛️</div>
          <div className="empty-title">老街消防方案比选</div>
          <div className="empty-desc">
            从左侧列表选择方案，或点击「新建方案」开始
            <br />
            <br />
            <strong>使用说明：</strong>
            <br />
            1. 场景标注、侧边说明统一数据源，出口一致
            <br />
            2. 后补材料自动生成版本快照，不会无声覆盖
            <br />
            3. 检测到冲突自动挂起，等待复核人确认
            <br />
            4. 所有变更进入历史，彩排复盘随时可查
          </div>
        </div>
      </div>
    );
  }

  const { plan, annotations, feedbacks, photos, changes } = currentView;
  const canEdit = plan.status !== 'confirmed';
  const hasUnresolvedConflict = plan.conflicts.some(c => !c.resolved);

  const startEdit = (field: 'sceneSummary' | 'sideNote') => {
    if (!canEdit) return;
    setEditingField(field);
    setEditValue(plan[field]);
  };

  const saveEdit = () => {
    if (editingField) {
      updatePlanField(editingField, editValue);
    }
    setEditingField(null);
  };

  const handleMapClick = (loc: LocationPoint) => {
    if (!canEdit) return;
    setPendingLoc(loc);
    setShowAddAnnotation(true);
  };

  const handleAddAnnotation = () => {
    if (!pendingLoc) return;
    addAnnotation({
      location: pendingLoc,
      category: newAnnotation.category,
      description: newAnnotation.description,
      riskLevel: newAnnotation.riskLevel,
    });
    setShowAddAnnotation(false);
    setPendingLoc(null);
    setNewAnnotation({ category: '', description: '', riskLevel: 'medium' });
  };

  const handleAddFeedback = () => {
    if (!newFeedback.author || !newFeedback.content) return;
    addFeedback({
      author: newFeedback.author,
      content: newFeedback.content,
    });
    setShowAddFeedback(false);
    setNewFeedback({ author: '', content: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = () => {
    if (!photoDataUrl) return;
    addPhoto({
      dataUrl: photoDataUrl,
      caption: photoCaption,
      uploadedBy: '操作员',
    });
    setShowAddPhoto(false);
    setPhotoDataUrl('');
    setPhotoCaption('');
  };

  const latestPhotoChange = changes.find(c => c.type === 'add_photo');

  return (
    <div className="plan-detail">
      <div className="detail-header">
        <div>
          <h2>{plan.name}</h2>
          <div className="detail-meta">
            <span>版本 v{plan.version}</span>
            <span>创建人：{plan.createdBy}</span>
            <span>更新：{new Date(plan.updatedAt).toLocaleString()}</span>
            {hasUnresolvedConflict && (
              <span className="badge badge-red pulse">⚠️ 挂起待复核</span>
            )}
          </div>
        </div>
        <div className="detail-actions">
          {canEdit && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowAddFeedback(true)}>
                💬 新增反馈
              </button>
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                📷 补录照片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  handleFileChange(e);
                  if (e.target.files?.[0]) setShowAddPhoto(true);
                }}
              />
              <button
                className="btn btn-primary"
                onClick={confirmPlan}
                disabled={loading || hasUnresolvedConflict}
              >
                ✅ 确认归档
              </button>
            </>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel">
            <div className="panel-header">
              <h3>📍 地图点位</h3>
              {canEdit && (
                <span className="tip">点击地图可添加新标注</span>
              )}
            </div>
            <div className="panel-body map-container">
              <AnnotationMap
                center={plan.location}
                annotations={annotations}
                photos={photos}
                onAddAnnotation={canEdit ? handleMapClick : undefined}
              />
            </div>
            {latestPhotoChange && (
              <div className="photo-change-note">
                <strong>最新补录：</strong>
                {latestPhotoChange.description}（{new Date(latestPhotoChange.timestamp).toLocaleString()}）
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>📝 场景标注</h3>
            </div>
            <div className="panel-body">
              {annotations.length === 0 ? (
                <div className="empty-state small">
                  <div className="empty-desc">暂无标注，点击地图添加</div>
                </div>
              ) : (
                <div className="annotation-list">
                  {annotations.map(a => (
                    <div key={a.id} className="annotation-item">
                      <div className="annotation-head">
                        <span className={`risk-badge risk-${a.riskLevel}`}>
                          {a.riskLevel === 'low' ? '低' : a.riskLevel === 'medium' ? '中' : '高'}
                        </span>
                        <span className="annotation-category">{a.category}</span>
                        <span className="annotation-address">{a.location.address}</span>
                      </div>
                      <div className="annotation-desc">{a.description}</div>
                      {photos.filter(p => p.annotationId === a.id).length > 0 && (
                        <div className="annotation-photos">
                          {photos
                            .filter(p => p.annotationId === a.id)
                            .map(p => (
                              <div key={p.id} className="photo-thumb">
                                <img src={p.dataUrl} alt={p.caption} />
                                <div className="photo-thumb-caption">{p.caption}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="detail-side">
          <div className="panel">
            <div className="panel-header">
              <h3>📄 场景摘要</h3>
              {canEdit && editingField !== 'sceneSummary' && (
                <button className="btn btn-xs" onClick={() => startEdit('sceneSummary')}>
                  编辑
                </button>
              )}
            </div>
            <div className="panel-body">
              {editingField === 'sceneSummary' ? (
                <div className="field-editor">
                  <textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    rows={6}
                    placeholder="输入场景摘要..."
                  />
                  <div className="editor-actions">
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                      保存
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingField(null)}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="field-content">{plan.sceneSummary || '（未填写）'}</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>📌 侧边说明</h3>
              {canEdit && editingField !== 'sideNote' && (
                <button className="btn btn-xs" onClick={() => startEdit('sideNote')}>
                  编辑
                </button>
              )}
            </div>
            <div className="panel-body">
              {editingField === 'sideNote' ? (
                <div className="field-editor">
                  <textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    rows={6}
                    placeholder="输入侧边说明..."
                  />
                  <div className="editor-actions">
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                      保存
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingField(null)}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="field-content">{plan.sideNote || '（未填写）'}</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>💬 居民反馈</h3>
              {feedbacks.length > 0 && (
                <span className="badge badge-blue">{feedbacks.length} 轮</span>
              )}
            </div>
            <div className="panel-body">
              {feedbacks.length === 0 ? (
                <div className="empty-state small">
                  <div className="empty-desc">暂无反馈</div>
                </div>
              ) : (
                <div className="feedback-list">
                  {feedbacks.map(f => (
                    <div key={f.id} className="feedback-item">
                      <div className="feedback-head">
                        <span className="feedback-round">第 {f.round} 轮</span>
                        <span className="feedback-author">{f.author}</span>
                        <span className="feedback-time">
                          {new Date(f.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="feedback-content">{f.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddAnnotation && pendingLoc && (
        <div className="modal" onClick={() => setShowAddAnnotation(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>新增场景标注</h3>
            <div className="modal-body">
              <div className="form-row">
                <label>地点</label>
                <input
                  type="text"
                  value={pendingLoc.address}
                  onChange={e =>
                    setPendingLoc({ ...pendingLoc, address: e.target.value })
                  }
                />
              </div>
              <div className="form-row">
                <label>类别</label>
                <input
                  type="text"
                  value={newAnnotation.category}
                  onChange={e => setNewAnnotation({ ...newAnnotation, category: e.target.value })}
                  placeholder="如：消防栓缺失、疏散通道狭窄"
                />
              </div>
              <div className="form-row">
                <label>描述</label>
                <textarea
                  rows={3}
                  value={newAnnotation.description}
                  onChange={e =>
                    setNewAnnotation({ ...newAnnotation, description: e.target.value })
                  }
                />
              </div>
              <div className="form-row">
                <label>风险等级</label>
                <select
                  value={newAnnotation.riskLevel}
                  onChange={e =>
                    setNewAnnotation({
                      ...newAnnotation,
                      riskLevel: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleAddAnnotation}>
                添加
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAddAnnotation(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddFeedback && (
        <div className="modal" onClick={() => setShowAddFeedback(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>新增居民反馈</h3>
            <div className="modal-body">
              <div className="form-row">
                <label>反馈人</label>
                <input
                  type="text"
                  value={newFeedback.author}
                  onChange={e => setNewFeedback({ ...newFeedback, author: e.target.value })}
                  placeholder="如：张阿姨、李大爷"
                />
              </div>
              <div className="form-row">
                <label>反馈内容</label>
                <textarea
                  rows={5}
                  value={newFeedback.content}
                  onChange={e => setNewFeedback({ ...newFeedback, content: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleAddFeedback}>
                记录
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAddFeedback(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPhoto && (
        <div className="modal" onClick={() => setShowAddPhoto(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>补录现场照片</h3>
            <div className="modal-body">
              {photoDataUrl && (
                <img src={photoDataUrl} className="photo-preview" alt="preview" />
              )}
              <div className="form-row">
                <label>照片说明</label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={e => setPhotoCaption(e.target.value)}
                  placeholder="如：老街口消防栓现状"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleAddPhoto}>
                保存
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAddPhoto(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
