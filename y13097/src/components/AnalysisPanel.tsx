import { useState } from 'react';
import type {
  CollisionResult,
  CollisionObject,
  CollisionStatus,
  Attachment,
} from '../types';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  FileText,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface AnalysisPanelProps {
  results: CollisionResult[];
  objects: CollisionObject[];
  attachments: Attachment[];
  filterStatus: CollisionStatus[];
  onFilterChange: (statuses: CollisionStatus[]) => void;
  selectedResultId: string | null;
  onSelectResult: (id: string | null) => void;
  onFocusObject: (objectId: string) => void;
  onSelectAttachment: (attachmentId: string) => void;
}

const STATUS_CONFIG: Record<
  CollisionStatus,
  { label: string; color: string; icon: typeof AlertCircle }
> = {
  danger: { label: '严重冲突', color: '#ee5253', icon: AlertCircle },
  warning: { label: '存在风险', color: '#feca57', icon: AlertTriangle },
  safe: { label: '安全', color: '#10ac84', icon: CheckCircle },
  pending: { label: '待核实', color: '#8395a7', icon: Clock },
};

export default function AnalysisPanel({
  results,
  objects,
  attachments,
  filterStatus,
  onFilterChange,
  selectedResultId,
  onSelectResult,
  onFocusObject,
  onSelectAttachment,
}: AnalysisPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const filteredResults = results.filter(
    (r) => filterStatus.length === 0 || filterStatus.includes(r.status)
  );

  const countByStatus = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const selectedResult = results.find((r) => r.objectId === selectedResultId);
  const selectedObject = objects.find((o) => o.id === selectedResultId);
  const sourceAttachment = attachments.find(
    (a) => a.id === selectedObject?.sourceAttachmentId
  );

  function toggleFilter(status: CollisionStatus) {
    if (filterStatus.includes(status)) {
      onFilterChange(filterStatus.filter((s) => s !== status));
    } else {
      onFilterChange([...filterStatus, status]);
    }
  }

  function toggleSteps(objectId: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  }

  const overallStatus: CollisionStatus =
    countByStatus.danger ? 'danger' : countByStatus.warning ? 'warning' : 'safe';

  return (
    <div className="analysis-panel">
      <div className="panel-header">
        <Zap size={18} />
        <h3>碰撞预审分析</h3>
      </div>

      <div className="overall-status">
        <div
          className="status-indicator"
          style={{ backgroundColor: STATUS_CONFIG[overallStatus].color }}
        >
          {(() => {
            const Icon = STATUS_CONFIG[overallStatus].icon;
            return <Icon size={20} />;
          })()}
        </div>
        <div className="status-info">
          <div className="status-label">
            整体结论：{STATUS_CONFIG[overallStatus].label}
          </div>
          <div className="status-desc">
            共 {results.length} 个对象 · 严重 {countByStatus.danger || 0} · 风险{' '}
            {countByStatus.warning || 0} · 安全 {countByStatus.safe || 0}
          </div>
        </div>
      </div>

      <div className="filter-tabs">
        {(Object.keys(STATUS_CONFIG) as CollisionStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const isActive = filterStatus.includes(status);
          const count = countByStatus[status] || 0;
          const Icon = config.icon;

          return (
            <button
              key={status}
              className={`filter-tab ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? config.color : 'transparent',
                color: isActive ? config.color : '#666',
              }}
              onClick={() => toggleFilter(status)}
            >
              <Icon size={14} />
              {config.label}
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="result-list">
        {filteredResults.length === 0 ? (
          <div className="empty-result">
            <CheckCircle size={32} color="#ccc" />
            <p>没有匹配的结果</p>
          </div>
        ) : (
          filteredResults.map((result) => {
            const obj = objects.find((o) => o.id === result.objectId);
            const config = STATUS_CONFIG[result.status];
            const isSelected = selectedResultId === result.objectId;
            const stepsExpanded = expandedSteps.has(result.objectId);
            const Icon = config.icon;

            return (
              <div
                key={result.objectId}
                className={`result-item ${isSelected ? 'selected' : ''} ${obj?.isAbnormal ? 'abnormal' : ''}`}
                onClick={() => {
                  onSelectResult(result.objectId);
                  onFocusObject(result.objectId);
                }}
              >
                <div className="result-header">
                  <div
                    className="status-dot"
                    style={{ backgroundColor: config.color }}
                  />
                  <div className="result-title">
                    <span className="result-name">{result.objectName}</span>
                    {obj?.isAbnormal && (
                      <span className="abnormal-badge">异常</span>
                    )}
                  </div>
                  <div className="result-status" style={{ color: config.color }}>
                    <Icon size={14} />
                    {config.label}
                  </div>
                </div>

                <div className="result-desc">{result.description}</div>

                {result.overlapDistance > 0 && (
                  <div className="result-metrics">
                    <div className="metric">
                      <span className="metric-label">重叠距离</span>
                      <span className="metric-value">
                        {result.overlapDistance.toFixed(1)} m
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">重叠面积</span>
                      <span className="metric-value">
                        {result.overlapArea.toFixed(0)} m²
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">高度冲突</span>
                      <span className="metric-value">
                        {result.altitudeConflict ? '是' : '否'}
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className="steps-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSteps(result.objectId);
                  }}
                >
                  {stepsExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  下一步操作 ({result.nextSteps.length}项)
                </div>

                {stepsExpanded && (
                  <div className="next-steps">
                    {result.nextSteps.map((step, idx) => (
                      <div key={idx} className="step-item">
                        <div className="step-number">{idx + 1}</div>
                        <div className="step-text">{step}</div>
                      </div>
                    ))}
                  </div>
                )}

                {obj?.isAbnormal && (
                  <div className="abnormal-reason">
                    <AlertTriangle size={14} />
                    <span>异常原因：{obj.abnormalReason}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedResult && selectedObject && sourceAttachment && (
        <div className="result-detail">
          <h4>来源追踪</h4>
          <div className="source-trace">
            <div className="trace-item current">
              <FileText size={16} />
              <div>
                <div className="trace-title">当前对象</div>
                <div className="trace-value">{selectedResult.objectName}</div>
              </div>
            </div>
            <ArrowRight size={16} className="trace-arrow" />
            <div
              className="trace-item clickable"
              onClick={() => onSelectAttachment(sourceAttachment.id)}
            >
              <FileText size={16} />
              <div>
                <div className="trace-title">来源材料</div>
                <div className="trace-value">{sourceAttachment.name}</div>
                <div className="trace-sub">
                  v{sourceAttachment.currentVersion} ·{' '}
                  {sourceAttachment.uploadedBy}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
