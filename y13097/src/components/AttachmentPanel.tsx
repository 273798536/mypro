import { useState } from 'react';
import type { Attachment, CollisionObject } from '../types';
import {
  FileText,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  History,
  User,
  Link,
} from 'lucide-react';

interface AttachmentPanelProps {
  attachments: Attachment[];
  objects: CollisionObject[];
  selectedAttachmentId: string | null;
  onSelectAttachment: (id: string) => void;
  onHighlightObjects: (objectIds: string[]) => void;
}

const TYPE_LABELS: Record<string, string> = {
  cad_drawing: 'CAD图纸',
  supplement: '补充附件',
  verbal_note: '口头说明',
  official_document: '正式文件',
};

const TYPE_COLORS: Record<string, string> = {
  cad_drawing: '#2e86de',
  supplement: '#f39c12',
  verbal_note: '#e74c3c',
  official_document: '#27ae60',
};

export default function AttachmentPanel({
  attachments,
  objects,
  selectedAttachmentId,
  onSelectAttachment,
  onHighlightObjects,
}: AttachmentPanelProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set()
  );

  const selectedAttachment = attachments.find(
    (a) => a.id === selectedAttachmentId
  );

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

  return (
    <div className="attachment-panel">
      <div className="panel-header">
        <FileText size={18} />
        <h3>材料附件</h3>
        <span className="count-badge">{attachments.length}</span>
      </div>

      <div className="panel-content">
        <div className="attachment-list">
          {attachments.map((att) => {
            const abnormalCount = getAbnormalCount(att.id);
            const isSelected = selectedAttachmentId === att.id;
            const hasVersions = att.versions.length > 1;
            const isExpanded = expandedVersions.has(att.id);

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
                    </div>
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
        </div>

        {selectedAttachment && (
          <div className="attachment-detail">
            <h4>附件详情</h4>
            <p className="detail-notes">{selectedAttachment.notes}</p>

            <div className="detail-section">
              <h5>关联对象</h5>
              <div className="related-objects">
                {getObjectsByAttachment(selectedAttachment.id).map((obj) => (
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
                ))}
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
          </div>
        )}
      </div>
    </div>
  );
}
