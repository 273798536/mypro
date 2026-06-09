import { History, User, Clock, Target, Info } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { formatDate } from '../../utils/helpers';
import type { AuditEntry } from '../../types';

const operationTypeLabels: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  review: '复核',
  approve: '审批',
  reject: '驳回',
};

const targetTypeLabels: Record<string, string> = {
  measurement: '测量点',
  model: '三维模型',
  slice: '点云切片',
  conclusion: '结论报告',
  parameter: '参数配置',
};

const operationColors: Record<string, string> = {
  create: 'bg-success',
  update: 'bg-info',
  delete: 'bg-danger',
  review: 'bg-warning',
  approve: 'bg-success',
  reject: 'bg-danger',
};

export function AuditPanel() {
  const { auditRecords } = useAppStore();

  const getInitials = (name: string) => {
    return name.slice(0, 1);
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <History size={18} className="text-ice-blue" />
        <h3 className="font-display text-lg text-gradient">审计追溯</h3>
        <span className="ml-auto text-xs text-text-muted">{auditRecords.length} 条记录</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
        {auditRecords.map((record, index) => (
          <AuditEntryItem
            key={record.id}
            record={record}
            isLast={index === auditRecords.length - 1}
            getInitials={getInitials}
          />
        ))}
      </div>

      <div className="pt-2 border-t border-ice-blue/20">
        <div className="flex items-start gap-2 text-xs text-text-muted">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>所有操作记录不可删除，仅可追加。离群点复核记录包含：修改人、修改时间、修改原因。</p>
        </div>
      </div>
    </div>
  );
}

function AuditEntryItem({
  record,
  isLast,
  getInitials,
}: {
  record: AuditEntry;
  isLast: boolean;
  getInitials: (name: string) => string;
}) {
  return (
    <div className="relative pl-8 pb-4">
      {!isLast && (
        <div className="absolute left-[14px] top-8 bottom-0 w-0.5 timeline-connector" />
      )}
      
      <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-bg-tertiary border border-ice-blue/40 flex items-center justify-center text-xs font-bold text-ice-blue">
        {getInitials(record.operator.name)}
      </div>

      <div className="bg-bg-tertiary/40 rounded-lg p-3 border border-ice-blue/10 hover:border-ice-blue/30 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs rounded font-medium text-white ${operationColors[record.operation.type]}`}>
              {operationTypeLabels[record.operation.type]}
            </span>
            <span className="text-sm font-medium text-text-primary">
              {targetTypeLabels[record.operation.target.type]}: {record.operation.target.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted mb-2 flex-wrap">
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{record.operator.name}</span>
            <span className="text-text-muted/60">({record.operator.department})</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatDate(record.timestamp)}</span>
          </div>
        </div>

        <div className="bg-bg-primary/40 rounded p-2 text-xs text-text-secondary mb-2">
          <div className="flex items-start gap-1">
            <Target size={12} className="mt-0.5 shrink-0 text-ice-blue" />
            <span>{record.reason}</span>
          </div>
        </div>

        {record.changes.length > 0 && (
          <div className="space-y-1">
            {record.changes.slice(0, 3).map((change, idx) => (
              <div key={idx} className="text-xs flex items-center gap-2 flex-wrap">
                <span className="text-text-muted">{change.field}:</span>
                {change.before !== null && change.before !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-danger/20 text-danger line-through">
                    {String(change.before)}
                  </span>
                )}
                {change.before !== null && change.before !== undefined && change.after !== null && change.after !== undefined && (
                  <span className="text-text-muted">→</span>
                )}
                {change.after !== null && change.after !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-success/20 text-success">
                    {String(change.after)}
                  </span>
                )}
              </div>
            ))}
            {record.changes.length > 3 && (
              <div className="text-xs text-text-muted">等 {record.changes.length} 项变更</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
