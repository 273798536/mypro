import type { SeatRecord } from '../types'
import { StatusBadge } from './StatusBadge'

interface RecordCardProps {
  record: SeatRecord
  onClick: () => void
}

export function RecordCard({ record, onClick }: RecordCardProps) {
  return (
    <div className="record-card" onClick={onClick}>
      <div className="record-card-header">
        <h3 className="record-name">{record.gisPoint.name}</h3>
        <StatusBadge
          status={record.status}
          conflict={record.conflictInfo?.needsConfirmation}
          needMerge={record.needMerge}
        />
      </div>
      <div className="record-card-body">
        <p className="record-street">
          <span className="record-label">街口：</span>
          {record.gisPoint.street}
        </p>
        <p className="record-scheme">
          <span className="record-label">方案：</span>
          {record.scheme}
          <span className="record-version">v{record.schemeVersion}</span>
        </p>
        <div className="record-meta">
          <span>投诉 {record.complaints.length} 条</span>
          <span>材料 {record.materials.length} 份</span>
          <span>导入：{record.importTime.split(' ')[0]}</span>
        </div>
      </div>
      {record.conclusion && (
        <div className="record-card-footer">
          <span className="conclusion-label">结论：</span>
          <span className="conclusion-text">{record.conclusion}</span>
        </div>
      )}
    </div>
  )
}
