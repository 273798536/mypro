import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { complaintsAPI, photosAPI } from '../api';
import { statusMap, typeMap, formatDate, resultMap } from '../utils';
import PhotoGallery from '../components/PhotoGallery';
import VersionTimeline from '../components/VersionTimeline';
import ApiPanel from '../components/ApiPanel';
import MapView from '../components/MapView';

function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewResult, setReviewResult] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [apiCalls, setApiCalls] = useState([]);
  const [rerunResult, setRerunResult] = useState(null);
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const startTime = Date.now();
      const res = await complaintsAPI.getDetail(id);
      const duration = Date.now() - startTime;
      
      setComplaint(res.data);
      
      setApiCalls(prev => [...prev, {
        method: 'GET',
        name: '投诉详情',
        url: `/api/complaints/${id}`,
        response: res.data,
        duration
      }]);
    } catch (error) {
      console.error('加载投诉详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewResult) return;

    try {
      const calculationSnapshot = {
        ruleVersion: complaint.rule_version,
        reviewedAt: new Date().toISOString(),
        factors: complaint.location_normalization ? [complaint.location_normalization.matched_alias] : []
      };

      const startTime = Date.now();
      const res = await complaintsAPI.review(id, {
        result: reviewResult,
        comment: reviewComment,
        calculation_snapshot: calculationSnapshot
      });

      setApiCalls(prev => [...prev, {
        method: 'POST',
        name: '提交复核',
        url: `/api/complaints/${id}/review`,
        params: { result: reviewResult, comment: reviewComment },
        response: res.data,
        duration: Date.now() - startTime
      }]);

      setShowReviewForm(false);
      setReviewResult('');
      setReviewComment('');
      loadDetail();
    } catch (error) {
      console.error('提交复核失败:', error);
    }
  };

  const handleRerun = async () => {
    try {
      const startTime = Date.now();
      const res = await complaintsAPI.rerun(id);
      
      setRerunResult(res.data.result);
      
      setApiCalls(prev => [...prev, {
        method: 'POST',
        name: '重跑计算口径',
        url: `/api/complaints/${id}/rerun`,
        params: { rule_id: complaint.calculation_rule_id },
        response: res.data,
        duration: Date.now() - startTime
      }]);
    } catch (error) {
      console.error('重跑计算口径失败:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('complaint_id', id);
    formData.append('is_supplement', 1);
    formData.append('supplement_note', '现场补录照片');

    try {
      const startTime = Date.now();
      const res = await photosAPI.upload(formData);
      
      setApiCalls(prev => [...prev, {
        method: 'POST',
        name: '上传照片',
        url: '/api/photos/upload',
        response: res.data,
        duration: Date.now() - startTime
      }]);
      
      loadDetail();
    } catch (error) {
      console.error('上传照片失败:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>加载中...</div>;
  }

  if (!complaint) {
    return <div className="empty-state">投诉不存在</div>;
  }

  return (
    <div>
      <div className="page-title">
        <div>
          投诉复核 - {complaint.complaint_no}
          {complaint.is_duplicate && (
            <span className="duplicate-badge">重复投诉</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setShowExamples(true)}
          >
            📑 放样例
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleRerun}
          >
            🔄 重跑
          </button>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setShowApiPanel(!showApiPanel)}
          >
            🔌 查看接口返回
          </button>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/complaints')}
          >
            ← 返回列表
          </button>
        </div>
      </div>

      {rerunResult && (
        <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div className="card-title">
            📊 计算口径重跑结果
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => setRerunResult(null)}
            >
              关闭
            </button>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <label>规则版本</label>
              <div className="value">{rerunResult.ruleVersion}</div>
            </div>
            <div className="info-item">
              <label>时段匹配</label>
              <div className="value">
                {rerunResult.peakHourMatch ? (
                  <span className="tag tag-success">是</span>
                ) : (
                  <span className="tag tag-danger">否</span>
                )}
              </div>
            </div>
            <div className="info-item">
              <label>匹配因素</label>
              <div className="value">
                {rerunResult.factorsMatched.map(f => (
                  <span key={f} className="tag tag-info">{f}</span>
                ))}
              </div>
            </div>
            <div className="info-item">
              <label>严重程度</label>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {rerunResult.severityScore}/10
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'white', borderRadius: '6px' }}>
            <strong>建议：</strong>{rerunResult.recommendation}
          </div>
        </div>
      )}

      {showApiPanel && (
        <div className="card">
          <div className="card-title">
            🔌 接口返回记录
          </div>
          <ApiPanel apiCalls={apiCalls} />
        </div>
      )}

      <div className="detail-layout">
        <div>
          <div className="card">
            <div className="card-title">
              基本信息
              <span className={`status-badge ${statusMap[complaint.status]?.class}`}>
                {statusMap[complaint.status]?.text}
              </span>
            </div>

            {complaint.location_normalization && (
              <div className="location-normalize">
                <div className="original">
                  原始填写：{complaint.original_location_text}
                  <span className="tag" style={{ marginLeft: '0.5rem' }}>用户输入</span>
                </div>
                <div className="standard">
                  ✓ 标准名称：{complaint.standard_name}
                  {complaint.location_normalization.matched && (
                    <span className="tag tag-success" style={{ marginLeft: '0.5rem' }}>
                      匹配: {complaint.location_normalization.matched_alias}
                    </span>
                  )}
                </div>
                {complaint.location_aliases && complaint.location_aliases.length > 0 && (
                  <div className="aliases">
                    其他别名：
                    {complaint.location_aliases.map((alias, idx) => (
                      <span key={idx} className="tag tag-info" style={{ marginLeft: '0.3rem' }}>
                        {alias.alias_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="info-grid">
              <div className="info-item">
                <label>投诉类型</label>
                <div className="value">
                  <span className="tag tag-info">
                    {typeMap[complaint.complaint_type] || complaint.complaint_type}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <label>行政区</label>
                <div className="value">{complaint.district || '-'}</div>
              </div>
              <div className="info-item">
                <label>学校</label>
                <div className="value">{complaint.school_name || '-'}</div>
              </div>
              <div className="info-item">
                <label>上报人</label>
                <div className="value">{complaint.reported_by || '-'}</div>
              </div>
              <div className="info-item">
                <label>上报时间</label>
                <div className="value">{formatDate(complaint.reported_at)}</div>
              </div>
              <div className="info-item">
                <label>计算口径</label>
                <div className="value">
                  {complaint.rule_name} (v{complaint.rule_version})
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.6rem', color: '#374151' }}>
                投诉描述
              </h4>
              <p style={{ 
                padding: '1rem', 
                background: '#f8fafc', 
                borderRadius: '6px',
                lineHeight: '1.7'
              }}>
                {complaint.description}
              </p>
            </div>

            {complaint.duplicate_of_complaint && (
              <div style={{ 
                marginTop: '1rem',
                padding: '1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px'
              }}>
                <div style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem' }}>
                  ⚠️ 此投诉为重复投诉
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  关联主投诉：
                  <span style={{ 
                    color: '#1e40af', 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }} onClick={() => navigate(`/complaints/${complaint.duplicate_of}`)}>
                    {complaint.duplicate_of_complaint.complaint_no}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                  {complaint.duplicate_of_complaint.description}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="tabs">
              <div 
                className={`tab ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                📷 巡检材料 ({complaint.photos?.length || 0})
              </div>
              <div 
                className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                📝 备注记录 ({complaint.notes?.length || 0})
              </div>
              <div 
                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                📜 版本历史
              </div>
              <div 
                className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                ✅ 复核记录 ({complaint.review_records?.length || 0})
              </div>
            </div>

            {activeTab === 'photos' && (
              <div>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <label className="btn btn-sm btn-primary">
                    📤 补录现场照片
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                {complaint.photos && complaint.photos.length > 0 ? (
                  <PhotoGallery photos={complaint.photos} />
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📷</div>
                    <div>暂无照片</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                {complaint.notes && complaint.notes.length > 0 ? (
                  complaint.notes.map(note => (
                    <div 
                      key={note.id} 
                      className={`note-item ${!note.is_latest ? 'old-version' : ''}`}
                    >
                      <div className="note-meta">
                        <span>
                          v{note.version} · {note.creator_name}
                          {!note.is_latest && <span className="tag">历史版本</span>}
                        </span>
                        <span>{formatDate(note.created_at)}</span>
                      </div>
                      <div className="note-content">{note.content}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <div>暂无备注</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <VersionTimeline 
                history={complaint.version_history || []}
                supplementRecords={complaint.supplement_records || []}
              />
            )}

            {activeTab === 'reviews' && (
              <div>
                {complaint.review_records && complaint.review_records.length > 0 ? (
                  complaint.review_records.map(record => (
                    <div key={record.id} className="card" style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '0.8rem'
                      }}>
                        <span className={`btn btn-sm ${resultMap[record.result]?.class}`}>
                          {resultMap[record.result]?.text}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                          {record.reviewer_name} · {formatDate(record.reviewed_at)}
                        </span>
                      </div>
                      {record.comment && (
                        <p style={{ fontSize: '0.9rem', color: '#374151' }}>
                          {record.comment}
                        </p>
                      )}
                      {record.calculation_snapshot && (
                        <div style={{ 
                          marginTop: '0.8rem', 
                          padding: '0.8rem', 
                          background: '#f8fafc', 
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace'
                        }}>
                          <div style={{ color: '#6b7280', marginBottom: '0.3rem' }}>计算口径快照：</div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(record.calculation_snapshot, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">✅</div>
                    <div>暂无复核记录</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-title">地图点位</div>
            <MapView 
              latitude={complaint.latitude}
              longitude={complaint.longitude}
              standardName={complaint.standard_name}
              supplementRecords={complaint.supplement_records}
            />
            
            {complaint.supplement_records && complaint.supplement_records.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.6rem', color: '#92400e' }}>
                  🔄 补录变更记录
                </h4>
                {complaint.supplement_records.map(record => (
                  <div key={record.id} className="supplement-item">
                    <div className="supplement-header">
                      <span>{record.file_name}</span>
                      <span style={{ color: '#6b7280' }}>
                        {record.supplementer_name} · {formatDate(record.supplemented_at)}
                      </span>
                    </div>
                    <div className="changes">
                      {record.changes.action === 'add_supplement' && (
                        <div>
                          <span className="tag tag-success">新增照片</span>
                          照片数量从 {record.changes.previousPhotoCount} 张变为 {record.changes.newPhotoCount} 张
                        </div>
                      )}
                      {record.changes.action === 'update_point' && (
                        <div>
                          <span className="tag tag-warning">点位调整</span>
                          偏移 {record.changes.distanceMeters} 米
                          <div style={{ marginTop: '0.3rem', fontSize: '0.8rem' }}>
                            从 ({record.changes.oldLatitude}, {record.changes.oldLongitude})
                            <br/>
                            到 ({record.changes.newLatitude}, {record.changes.newLongitude})
                          </div>
                        </div>
                      )}
                      {record.changes.supplementNote && (
                        <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#6b7280' }}>
                          说明：{record.changes.supplementNote}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">复核操作</div>
            
            {!showReviewForm ? (
              complaint.status === 'duplicate' ? (
                <div style={{ 
                  padding: '1rem', 
                  background: '#fef2f2', 
                  borderRadius: '6px',
                  color: '#991b1b',
                  textAlign: 'center'
                }}>
                  ⚠️ 此投诉已标记为重复投诉，无需单独复核
                </div>
              ) : (
                <div className="review-actions">
                  <button 
                    className="btn btn-success"
                    onClick={() => { setShowReviewForm(true); setReviewResult('pass'); }}
                  >
                    ✓ 通过
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => { setShowReviewForm(true); setReviewResult('fail'); }}
                  >
                    ✗ 不通过
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={() => { setShowReviewForm(true); setReviewResult('duplicate'); }}
                  >
                    🔄 标记重复
                  </button>
                </div>
              )
            ) : (
              <div className="review-form">
                <div style={{ marginBottom: '0.8rem' }}>
                  <span className={`btn btn-sm ${resultMap[reviewResult]?.class}`}>
                    处理结果：{resultMap[reviewResult]?.text}
                  </span>
                </div>
                <textarea 
                  placeholder="请输入复核意见..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-outline"
                    onClick={() => { setShowReviewForm(false); setReviewResult(''); setReviewComment(''); }}
                  >
                    取消
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleReview}
                  >
                    确认提交
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">计算口径</div>
            <div style={{ fontSize: '0.9rem', color: '#374151' }}>
              <div style={{ marginBottom: '0.8rem' }}>
                <strong>{complaint.rule_name}</strong>
                <span className="tag tag-info" style={{ marginLeft: '0.5rem' }}>
                  v{complaint.rule_version}
                </span>
              </div>
              {complaint.rule_content && (
                <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '6px' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>高峰时段：</strong>
                    {complaint.rule_content.peakHours.map((h, i) => (
                      <span key={i} className="tag tag-info" style={{ marginRight: '0.3rem' }}>
                        {h}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>判定因素：</strong>
                    {complaint.rule_content.factors.map((f, i) => (
                      <span key={i} className="tag tag-warning" style={{ marginRight: '0.3rem' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <div>
                    <strong>拥堵阈值：</strong>{complaint.rule_content.congestionThreshold} 个因素
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExamples && (
        <div className="modal-overlay" onClick={() => setShowExamples(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📑 同类型历史案例</h3>
              <button className="modal-close" onClick={() => setShowExamples(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>CP-2026-004（已解决）</strong>
                  <span className="status-badge status-resolved">已解决</span>
                </div>
                <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
                  第三小学北门人行横道没有红绿灯，学生过马路很危险
                </p>
                <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: '#f0fdf4', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.3rem' }}>处理方案：</div>
                  已协调交警部门在人行横道增设临时红绿灯，学生上下学时段启用。
                </div>
              </div>
              
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>CP-2026-002（待复核）</strong>
                  <span className="status-badge status-pending">待复核</span>
                </div>
                <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
                  下午放学时间，学校门口车辆排队长达500米
                </p>
                <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: '#fffbeb', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.3rem' }}>建议参考：</div>
                  建议协调学校实施错峰放学，在周边道路设置临时停靠点。
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                💡 以上案例按类型和地点相似度排序，供复核参考
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintDetail;
