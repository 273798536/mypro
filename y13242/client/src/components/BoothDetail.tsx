import { useState, useEffect } from 'react';
import type { Booth, BoothNote, HistoryRecord } from '../types';
import { boothsApi } from '../services/api';

interface Props {
  boothId: number;
  onClose: () => void;
  onUpdated: (booth: Booth) => void;
  onNoteAdded: () => void;
}

type TabType = 'info' | 'history' | 'notes' | 'edit';

const fieldLabels: Record<string, string> = {
  record: '记录',
  booth_number: '摊位号',
  label_name: '厂牌名称',
  contact_person: '联系人',
  phone: '电话',
  song_name: '曲目名称',
  song_alias: '曲目别名',
  rehearsal_info: '排练信息',
  authorization_note: '授权备注',
  status: '状态',
  final_conclusion: '最终结论',
  manual_annotation: '人工批注',
  delivery_checklist: '交付清单',
};

const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'reviewing', label: '审核中' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
];

const noteTypeOptions = [
  { value: 'rehearsal', label: '排练备注' },
  { value: 'authorization', label: '授权备注' },
  { value: 'issue', label: '问题记录' },
  { value: 'general', label: '通用备注' },
];

export default function BoothDetail({ boothId, onClose, onUpdated, onNoteAdded }: Props) {
  const [booth, setBooth] = useState<(Booth & { notes: BoothNote[]; history: HistoryRecord[] }) | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [loading, setLoading] = useState(true);
  const [newNoteType, setNewNoteType] = useState('rehearsal');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editForm, setEditForm] = useState<Partial<Booth>>({});
  const [editComment, setEditComment] = useState('');

  const loadBooth = async () => {
    setLoading(true);
    try {
      const data = await boothsApi.getById(boothId);
      setBooth(data);
      setEditForm({
        booth_number: data.booth_number,
        label_name: data.label_name,
        contact_person: data.contact_person || '',
        phone: data.phone || '',
        song_name: data.song_name || '',
        song_alias: data.song_alias || '',
        rehearsal_info: data.rehearsal_info || '',
        authorization_note: data.authorization_note || '',
        status: data.status,
        final_conclusion: data.final_conclusion || '',
        manual_annotation: data.manual_annotation || '',
        delivery_checklist: data.delivery_checklist || '',
      });
    } catch (err) {
      console.error('加载详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooth();
  }, [boothId]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      await boothsApi.addNote(boothId, newNoteType, newNoteContent, '小孟');
      setNewNoteContent('');
      loadBooth();
      onNoteAdded();
    } catch (err) {
      console.error('添加备注失败:', err);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await boothsApi.update(boothId, {
        ...editForm,
        operator: '小孟',
        comment: editComment || '修改记录',
      });
      setBooth({ ...(booth as any), ...updated });
      onUpdated(updated);
      setActiveTab('info');
      setEditComment('');
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  if (loading || !booth) {
    return (
      <div className="detail-modal-overlay" onClick={onClose}>
        <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="detail-body">
            <div className="loading">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <span className="booth-number">{booth.booth_number}</span>
            <h2 style={{ marginTop: '6px' }}>{booth.label_name}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="detail-body">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              📋 基本信息
            </button>
            <button
              className={`tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📜 历史记录 ({booth.history?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              💬 备注 ({booth.notes?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveTab('edit')}
            >
              ✏️ 编辑
            </button>
          </div>

          {activeTab === 'info' && (
            <div>
              <div className="detail-section">
                <h3>基本信息</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="label">摊位号</div>
                    <div className="value">{booth.booth_number}</div>
                  </div>
                  <div className="info-item">
                    <div className="label">状态</div>
                    <div className="value">
                      <span className={`status-badge ${booth.status}`}>
                        {statusOptions.find((s) => s.value === booth.status)?.label || booth.status}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="label">联系人</div>
                    <div className="value">{booth.contact_person || '—'}</div>
                  </div>
                  <div className="info-item">
                    <div className="label">电话</div>
                    <div className="value">{booth.phone || '—'}</div>
                  </div>
                  <div className="info-item">
                    <div className="label">曲目名称</div>
                    <div className="value">{booth.song_name || '—'}</div>
                  </div>
                  <div className="info-item">
                    <div className="label">曲目别名</div>
                    <div className="value">{booth.song_alias || '—'}</div>
                  </div>
                </div>
              </div>

              {(booth.rehearsal_info || booth.authorization_note) && (
                <div className="detail-section">
                  <h3>排练与授权</h3>
                  {booth.rehearsal_info && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                        🎤 排练信息
                      </div>
                      <div style={{ fontSize: '14px', background: '#eff6ff', padding: '10px', borderRadius: '6px' }}>
                        {booth.rehearsal_info}
                      </div>
                    </div>
                  )}
                  {booth.authorization_note && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                        📄 授权备注
                      </div>
                      <div style={{ fontSize: '14px', background: '#d1fae5', padding: '10px', borderRadius: '6px' }}>
                        {booth.authorization_note}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {booth.final_conclusion && (
                <div className="conclusion-box" style={{ marginTop: 0 }}>
                  <span className="label">📋 最终结论</span>
                  {booth.final_conclusion}
                </div>
              )}

              {booth.manual_annotation && (
                <div className="annotation-box" style={{ marginTop: '12px' }}>
                  <span className="label">✏️ 人工批注</span>
                  {booth.manual_annotation}
                </div>
              )}

              {booth.delivery_checklist && (
                <div className="delivery-box" style={{ marginTop: '12px' }}>
                  <span className="label">📦 交付清单</span>
                  {booth.delivery_checklist}
                </div>
              )}

              {booth.final_conclusion && booth.manual_annotation && booth.delivery_checklist && (
                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#10b981' }}>
                  🔗 正常记录 ↔ 最终结论 ↔ 人工批注 ↔ 交付清单 — 全部互相对应
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="detail-section" style={{ marginBottom: 0 }}>
                <h3>操作历史</h3>
                {booth.history && booth.history.length > 0 ? (
                  <div className="history-timeline">
                    {booth.history.map((record) => (
                      <div key={record.id} className="history-item">
                        <div className="history-dot"></div>
                        <div className="history-content">
                          <div className="history-field">
                            {fieldLabels[record.field_name] || record.field_name}
                          </div>
                          {record.field_name === 'record' ? (
                            <div className="history-change">
                              <span className="new">{record.new_value === 'created' ? '记录已创建' : record.new_value}</span>
                            </div>
                          ) : (
                            <div className="history-change">
                              <span className="old">{record.old_value || '(空)'}</span>
                              {' → '}
                              <span className="new">{record.new_value || '(空)'}</span>
                            </div>
                          )}
                          {record.comment && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              💬 {record.comment}
                            </div>
                          )}
                          <div className="history-meta">
                            <span>操作人：{record.operator}</span>
                            <span>{new Date(record.changed_at).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">暂无历史记录</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <div className="detail-section" style={{ marginBottom: 0 }}>
                <h3>备注列表</h3>
                {booth.notes && booth.notes.length > 0 ? (
                  <div className="notes-list">
                    {booth.notes.map((note) => (
                      <div key={note.id} className={`note-item ${note.note_type}`}>
                        <div className="note-type">
                          {noteTypeOptions.find((o) => o.value === note.note_type)?.label || note.note_type}
                        </div>
                        <div className="note-content">{note.content}</div>
                        <div className="note-meta">
                          <span>{note.author}</span>
                          <span>{new Date(note.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">暂无备注</div>
                )}

                <div className="note-add-form">
                  <select
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value)}
                  >
                    {noteTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="输入备注内容..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddNote}>
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div>
              <div className="detail-section" style={{ marginBottom: 0 }}>
                <h3>编辑记录</h3>
                <div className="edit-form-grid">
                  <div className="form-group">
                    <label>摊位号</label>
                    <input
                      type="text"
                      value={editForm.booth_number || ''}
                      onChange={(e) => setEditForm({ ...editForm, booth_number: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>状态</label>
                    <select
                      value={editForm.status || 'pending'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>厂牌名称</label>
                    <input
                      type="text"
                      value={editForm.label_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, label_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>联系人</label>
                    <input
                      type="text"
                      value={editForm.contact_person || ''}
                      onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>电话</label>
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>曲目名称</label>
                    <input
                      type="text"
                      value={editForm.song_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, song_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>曲目别名</label>
                    <input
                      type="text"
                      value={editForm.song_alias || ''}
                      onChange={(e) => setEditForm({ ...editForm, song_alias: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>排练信息</label>
                    <textarea
                      value={editForm.rehearsal_info || ''}
                      onChange={(e) => setEditForm({ ...editForm, rehearsal_info: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>授权备注</label>
                    <textarea
                      value={editForm.authorization_note || ''}
                      onChange={(e) => setEditForm({ ...editForm, authorization_note: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>最终结论</label>
                    <textarea
                      value={editForm.final_conclusion || ''}
                      onChange={(e) => setEditForm({ ...editForm, final_conclusion: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>人工批注</label>
                    <textarea
                      value={editForm.manual_annotation || ''}
                      onChange={(e) => setEditForm({ ...editForm, manual_annotation: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>交付清单</label>
                    <textarea
                      value={editForm.delivery_checklist || ''}
                      onChange={(e) => setEditForm({ ...editForm, delivery_checklist: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>修改说明（写入历史）</label>
                    <input
                      type="text"
                      placeholder="例如：修正了曲目别名"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setActiveTab('info')}>
                    取消
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveEdit}>
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
