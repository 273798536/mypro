import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, Database, Clock, AlertTriangle,
  FileText, User, Calendar, Tag, Zap,
} from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import { AnomalyBadge, SeverityBadge, StatusBadge } from '@/components/StatusBadges';
import TicketLink from '@/components/TicketLink';
import SourceTraceSection from '@/components/SourceTraceSection';
import {
  ANOMALY_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS,
} from '@/types/ledger';
import type { AnomalyType, Severity, RecordStatus } from '@/types/ledger';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const record = useLedgerStore((s) => s.getRecordById(id || ''));
  const updateRecord = useLedgerStore((s) => s.updateRecord);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(record ? { ...record } : null);

  if (!record || !form) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">记录不存在</p>
        <Link to="/" className="text-brand underline text-sm">返回列表</Link>
      </div>
    );
  }

  const handleSave = () => {
    if (!id || !form) return;
    updateRecord(id, form);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ ...record });
    setEditing(false);
  };

  const FieldRow = ({
    label,
    icon: Icon,
    children,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }) => (
    <div className="flex items-start">
      <div className="w-32 flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-500 pt-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-brand"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="btn flex items-center gap-1">
              <X className="w-4 h-4" />
              取消
            </button>
            <button onClick={handleSave} className="btn-primary flex items-center gap-1">
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-primary flex items-center gap-1">
            <Edit3 className="w-4 h-4" />
            编辑记录
          </button>
        )}
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-serif text-xl font-semibold text-brand mb-2 font-mono">
              {record.view_name}
            </h2>
            <p className="text-xs text-slate-500">
              记录 ID: <span className="font-mono">{record.id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnomalyBadge type={record.anomaly_type} />
            <SeverityBadge severity={record.severity} />
            <StatusBadge status={record.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <FieldRow label="刷新时间" icon={Clock}>
            {editing ? (
              <input
                type="text"
                value={form.refresh_time}
                onChange={(e) => setForm({ ...form, refresh_time: e.target.value })}
                className="input-field w-full font-mono text-sm"
              />
            ) : (
              <span className="font-mono text-sm text-slate-800">{record.refresh_time}</span>
            )}
          </FieldRow>

          <FieldRow label="异常类型" icon={AlertTriangle}>
            {editing ? (
              <select
                value={form.anomaly_type}
                onChange={(e) => setForm({ ...form, anomaly_type: e.target.value as AnomalyType })}
                className="input-field w-full"
              >
                {Object.entries(ANOMALY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <AnomalyBadge type={record.anomaly_type} />
            )}
          </FieldRow>

          <FieldRow label="严重程度" icon={AlertTriangle}>
            {editing ? (
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}
                className="input-field w-full"
              >
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <SeverityBadge severity={record.severity} />
            )}
          </FieldRow>

          <FieldRow label="处理状态" icon={Tag}>
            {editing ? (
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as RecordStatus })}
                className="input-field w-full"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <StatusBadge status={record.status} />
            )}
          </FieldRow>

          <FieldRow label="关联工单" icon={Database}>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="工单编号"
                  value={form.ticket_id || ''}
                  onChange={(e) => setForm({ ...form, ticket_id: e.target.value })}
                  className="input-field w-full font-mono text-xs"
                />
                <input
                  type="text"
                  placeholder="工单摘要"
                  value={form.ticket_summary || ''}
                  onChange={(e) => setForm({ ...form, ticket_summary: e.target.value })}
                  className="input-field w-full text-xs"
                />
                <input
                  type="text"
                  placeholder="工单链接"
                  value={form.ticket_link || ''}
                  onChange={(e) => setForm({ ...form, ticket_link: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>
            ) : (
              <TicketLink
                ticketId={record.ticket_id}
                ticketSummary={record.ticket_summary}
                ticketLink={record.ticket_link}
              />
            )}
          </FieldRow>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <SourceTraceSection record={record} />

        <div className="card p-5">
          <h3 className="section-title">处理与结论</h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                处理意见
              </div>
              {editing ? (
                <textarea
                  value={form.handling_opinion || ''}
                  onChange={(e) => setForm({ ...form, handling_opinion: e.target.value })}
                  rows={3}
                  placeholder="描述具体处理措施..."
                  className="input-field w-full resize-none"
                />
              ) : (
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 min-h-[60px]">
                  {record.handling_opinion || <span className="text-slate-400">未填写</span>}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                <Zap className="w-3.5 h-3.5" />
                最终结论（业务可见）
              </div>
              {editing ? (
                <textarea
                  value={form.conclusion || ''}
                  onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
                  rows={3}
                  placeholder="给业务同事看的结论说明..."
                  className="input-field w-full resize-none"
                />
              ) : (
                <p className="text-sm text-slate-800 bg-emerald-50/50 border border-emerald-200 p-3 min-h-[60px]">
                  {record.conclusion || <span className="text-slate-400">未填写</span>}
                </p>
              )}
            </div>

            {record.anomaly_type === 'slow_query' && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  慢查询归因
                </div>
                {editing ? (
                  <textarea
                    value={form.slow_query_analysis || ''}
                    onChange={(e) => setForm({ ...form, slow_query_analysis: e.target.value })}
                    rows={2}
                    placeholder="月底/课前补充慢查询归因分析..."
                    className="input-field w-full resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-700 bg-blue-50/50 border border-blue-200 p-3">
                    {record.slow_query_analysis || <span className="text-slate-400">月底或课前补充</span>}
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <User className="w-3.5 h-3.5" />
                  处理人
                </div>
                {editing ? (
                  <input
                    type="text"
                    value={form.handler || ''}
                    onChange={(e) => setForm({ ...form, handler: e.target.value })}
                    className="input-field w-full"
                  />
                ) : (
                  <span className="text-sm text-slate-700 font-mono">
                    {record.handler || '—'}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  处理时间
                </div>
                {editing ? (
                  <input
                    type="text"
                    value={form.handled_at || ''}
                    onChange={(e) => setForm({ ...form, handled_at: e.target.value })}
                    className="input-field w-full font-mono text-xs"
                  />
                ) : (
                  <span className="text-sm text-slate-700 font-mono">
                    {record.handled_at || '—'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400 flex justify-between">
        <span>创建时间: {record.created_at}</span>
        <span>更新时间: {record.updated_at}</span>
      </div>
    </div>
  );
}
