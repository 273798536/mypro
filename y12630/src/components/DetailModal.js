import { X, MapPin, FileText, User, Clock, AlertCircle, CheckCircle, ClockIcon, FileImage, Layers } from 'lucide-react';

const DetailModal = ({ record, onClose, onLocateOnMap }) => {
  if (!record) return null;

  const getStatusConfig = (status) => {
    const config = {
      success: { icon: CheckCircle, color: '#22c55e', text: '顺利通过', hint: '可直接使用', hintClass: 'success' },
      pending: { icon: ClockIcon, color: '#f59e0b', text: '待确认', hint: '需康复训练师复核', hintClass: 'pending' },
      error: { icon: AlertCircle, color: '#ef4444', text: '数据异常', hint: '不可用，需重新处理', hintClass: 'error' }
    };
    return config[status] || config.pending;
  };

  const statusConfig = getStatusConfig(record.status);
  const StatusIcon = statusConfig.icon;

  const formatCoord = (coord) => {
    if (!coord || !Array.isArray(coord)) return '-';
    return `[${coord[0]}, ${coord[1]}]`;
  };

  const getDeviationClass = (deviation) => {
    if (!deviation) return '';
    if (deviation <= 0.01) return 'low';
    if (deviation <= 0.05) return 'medium';
    return 'high';
  };

  const cornerLabels = {
    bottomLeft: '左下角',
    bottomRight: '右下角',
    topLeft: '左上角',
    topRight: '右上角'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: statusConfig.color }}>
              <StatusIcon size={18} />
            </span>
            {record.fieldName} - 检测详情
            <span className={`student-hint ${statusConfig.hintClass}`}>
              {statusConfig.hint}
            </span>
          </h3>
          <button className="btn btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-row">
            <span className="detail-label"><FileText size={14} style={{ marginRight: '4px' }} /> 原始行号</span>
            <span className="detail-value">
              <span className="row-number">{record.rowNumber}</span>
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label"><MapPin size={14} style={{ marginRight: '4px' }} /> 地块名称</span>
            <span className="detail-value">{record.fieldName}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label"><FileImage size={14} style={{ marginRight: '4px' }} /> 来源文件</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {record.sourceFile}
            </span>
          </div>

          {record.imageName && (
            <div className="detail-row">
              <span className="detail-label"><FileImage size={14} style={{ marginRight: '4px' }} /> 关联图片</span>
              <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {record.imageName}
              </span>
            </div>
          )}

          {record.sourceNote && (
            <div className="detail-row">
              <span className="detail-label"><Layers size={14} style={{ marginRight: '4px' }} /> 来源备注</span>
              <span className="detail-value" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {record.sourceNote}
              </span>
            </div>
          )}

          <div className="detail-section-title">
          <span style={{ color: statusConfig.color }}>
            <StatusIcon size={14} style={{ marginRight: '4px' }} />
          </span>
          检测结果
        </div>

          <div className="detail-row">
            <span className="detail-label">检测状态</span>
            <span className="detail-value">
              <span className={`status-badge ${record.status}`}>{statusConfig.text}</span>
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">匹配率</span>
            <span className="detail-value" style={{ fontWeight: '600', color: statusConfig.color, fontSize: '1.1rem' }}>
              {record.hitDetection?.matchRate ?? '-'}%
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">最大偏差</span>
            <span className="detail-value" style={{ fontFamily: 'monospace' }}>
              {record.hitDetection?.deviation ?? '-'}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">冲突类型</span>
            <span className="detail-value">
              {record.hitDetection?.conflictType === 'none' ? '无冲突' :
                record.hitDetection?.conflictType === 'minor_deviation' ? '轻微偏差' :
                  record.hitDetection?.conflictType === 'major_mismatch' ? '严重不匹配' :
                    record.hitDetection?.conflictType === 'invalid_data' ? '无效数据' : '未知'}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">检测说明</span>
            <span className="detail-value" style={{ color: '#666' }}>
              {record.hitDetection?.message || '-'}
            </span>
          </div>

          {record.hitDetection?.explanation && (
            <>
              <div className="detail-section-title">
                <span style={{ color: statusConfig.color }}>
                  <AlertCircle size={14} style={{ marginRight: '4px' }} />
                </span>
                冲突解释
              </div>

              <div className="detail-row">
                <span className="detail-label">结论摘要</span>
                <span className="detail-value" style={{ fontWeight: 500, color: statusConfig.color }}>
                  {record.hitDetection.explanation.summary}
                </span>
              </div>

              {record.hitDetection.explanation.details && record.hitDetection.explanation.details.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">详细差异</span>
                  <span className="detail-value">
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#4b5563', lineHeight: '1.6' }}>
                      {record.hitDetection.explanation.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  </span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">处理建议</span>
                <span className="detail-value" style={{ color: '#1e40af', background: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  {record.hitDetection.explanation.action}
                </span>
              </div>
            </>
          )}

          {record.hitDetection?.validationErrors && record.hitDetection.validationErrors.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">数据校验错误</span>
              <span className="detail-value" style={{ color: '#991b1b' }}>
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                  {record.hitDetection.validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </span>
            </div>
          )}

          {record.hitDetection?.cornerDeviations && Object.keys(record.hitDetection.cornerDeviations).length > 0 && (
            <>
              <div className="detail-section-title">各角落偏差详情</div>
              <div className="corner-grid">
                {Object.entries(record.hitDetection.cornerDeviations).map(([corner, dev]) => (
                  <div key={corner} className="corner-item">
                    <div className="corner-label">{cornerLabels[corner] || corner}</div>
                    <div>
                      <span className={`corner-deviation ${getDeviationClass(dev)}`}>
                        偏差: {dev}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="detail-section-title">坐标数据</div>

          <div className="detail-row">
            <span className="detail-label">面积</span>
            <span className="detail-value">{record.area} {record.unit || '亩'}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">底图坐标</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              左下: {formatCoord(record.coordinates?.bottomLeft)}<br />
              右下: {formatCoord(record.coordinates?.bottomRight)}<br />
              左上: {formatCoord(record.coordinates?.topLeft)}<br />
              右上: {formatCoord(record.coordinates?.topRight)}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">标注坐标</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              左下: {formatCoord(record.labelCoordinates?.bottomLeft)}<br />
              右下: {formatCoord(record.labelCoordinates?.bottomRight)}<br />
              左上: {formatCoord(record.labelCoordinates?.topLeft)}<br />
              右上: {formatCoord(record.labelCoordinates?.topRight)}
            </span>
          </div>

          <div className="detail-section-title">操作信息</div>

          <div className="detail-row">
            <span className="detail-label"><User size={14} style={{ marginRight: '4px' }} /> 操作人</span>
            <span className="detail-value">{record.operator}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label"><Clock size={14} style={{ marginRight: '4px' }} /> 检测时间</span>
            <span className="detail-value">{record.createdAt}</span>
          </div>

          {record.remarks && (
            <div className="detail-row">
              <span className="detail-label">备注</span>
              <span className="detail-value">{record.remarks}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {onLocateOnMap && (
            <button className="btn btn-secondary" onClick={() => onLocateOnMap(record)}>
              <MapPin size={14} />
              在地图上查看
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
