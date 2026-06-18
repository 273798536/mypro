import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Download,
  Eye,
  FileDown,
  History,
  Link2,
  Pencil,
  PieChart as PieChartIcon,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Users,
  UserX,
  X,
  ArrowRight,
  CalendarRange,
  Filter,
  Hash,
  Clock,
  User,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AuditService } from '@/services/AuditService';
import Chip from '@/components/Chip';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import type {
  OperationLog,
  OperationType,
  PermissionSnapshot,
} from '@/types';
import { formatDateTime, formatRelative } from '@/utils/format';
import { cn } from '@/lib/utils';

const OPERATION_TYPES: Array<{
  key: OperationType;
  label: string;
  icon: typeof Eye;
  color: string;
  desc: string;
}> = [
  { key: 'view', label: '查看', icon: Eye, color: '#64748B', desc: '访问详情页' },
  { key: 'resolve', label: '修正', icon: CheckCircle2, color: '#059669', desc: '处理冲突' },
  { key: 'backup', label: '备份', icon: Database, color: '#2563EB', desc: '写入备份' },
  { key: 'rollback', label: '回滚', icon: RotateCcw, color: '#7C3AED', desc: '执行回滚' },
  { key: 'export', label: '导出', icon: FileDown, color: '#D97706', desc: '导出报表' },
  { key: 'assign', label: '分配', icon: Users, color: '#0891B2', desc: '变更处理人' },
  { key: 'permission_change', label: '权限变更', icon: Shield, color: '#DC2626', desc: '角色/权限变更' },
];

const PERMISSION_SOURCE_LABEL: Record<PermissionSnapshot['permissionSource'], string> = {
  role_grant: '角色授予',
  temporary_authorization: '临时授权',
  inheritance: '继承',
};

const PERMISSION_SOURCE_VARIANT: Record<PermissionSnapshot['permissionSource'], 'primary' | 'warning' | 'info'> = {
  role_grant: 'primary',
  temporary_authorization: 'warning',
  inheritance: 'info',
};

function DiffTable({
  before,
  after,
}: {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  const rows = useMemo(() => {
    const keys = new Set<string>();
    if (before) Object.keys(before).forEach((k) => keys.add(k));
    if (after) Object.keys(after).forEach((k) => keys.add(k));
    return Array.from(keys).map((k) => ({
      key: k,
      before: before?.[k],
      after: after?.[k],
    }));
  }, [before, after]);

  if (rows.length === 0) {
    return (
      <div className="text-xs text-audit-400 py-2">
        （未记录状态变更）
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-audit-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-audit-50/60">
            <th className="w-40 px-3 py-2 text-left font-semibold text-audit-500 uppercase tracking-wider">
              字段
            </th>
            <th className="px-3 py-2 text-left font-semibold text-audit-500 uppercase tracking-wider">
              Before
            </th>
            <th className="w-10 text-center">
              <ArrowRight className="w-3.5 h-3.5 text-audit-300 mx-auto" />
            </th>
            <th className="px-3 py-2 text-left font-semibold text-audit-500 uppercase tracking-wider">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const changed =
              JSON.stringify(r.before) !== JSON.stringify(r.after);
            const renderV = (v: unknown) => {
              if (v === undefined || v === null) {
                return (
                  <span className="text-audit-300 italic">
                    （空）
                  </span>
                );
              }
              const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
              return (
                <span className="font-mono break-all">
                  {s.length > 60 ? `${s.slice(0, 60)}…` : s}
                </span>
              );
            };
            return (
              <tr
                key={r.key}
                className={cn(
                  'border-t border-audit-100',
                  changed && 'bg-amber-50/30'
                )}
              >
                <td className="px-3 py-2 font-mono text-audit-600">
                  {r.key}
                </td>
                <td className="px-3 py-2 text-audit-700">{renderV(r.before)}</td>
                <td />
                <td className="px-3 py-2 text-audit-700">{renderV(r.after)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PermissionAuditPanel({
  snapshot,
}: {
  snapshot?: PermissionSnapshot;
}) {
  if (!snapshot) {
    return (
      <div className="text-xs text-audit-400 py-2">
        未关联权限快照
      </div>
    );
  }
  return (
    <div className="space-y-3 pt-2 border-t border-dashed border-audit-100">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-audit-500" />
        <span className="text-xs font-semibold text-audit-700">
          权限审计链
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-audit-50/60 rounded-md border border-audit-100 p-3 space-y-1.5">
          <div className="text-[11px] font-semibold text-audit-400 uppercase tracking-wider">
            权限快照ID
          </div>
          <div className="text-xs font-mono text-audit-700 break-all">
            {snapshot.id}
          </div>
        </div>
        <div className="bg-audit-50/60 rounded-md border border-audit-100 p-3 space-y-1.5">
          <div className="text-[11px] font-semibold text-audit-400 uppercase tracking-wider">
            快照有效性
          </div>
          <div>
            <Chip
              variant={snapshot.valid ? 'success' : 'danger'}
              size="sm"
            >
              {snapshot.valid ? '有效' : '失效'}
            </Chip>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-audit-400 uppercase tracking-wider flex items-center gap-2">
          <Hash className="w-3 h-3" />
          角色ID列表（操作时）
        </div>
        <div className="flex flex-wrap gap-1.5">
          {snapshot.roleIdsAtThatTime.map((rid) => (
            <Chip key={rid} variant="outline" size="sm">
              {rid}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-audit-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldQuestion className="w-3 h-3" />
          权限来源
        </div>
        <div className="flex items-center gap-2">
          <Chip
            variant={PERMISSION_SOURCE_VARIANT[snapshot.permissionSource]}
            size="sm"
          >
            {PERMISSION_SOURCE_LABEL[snapshot.permissionSource]}
          </Chip>
          <span className="text-xs text-audit-500">
            封存于 {formatDateTime(snapshot.capturedAt)}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-audit-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-3 h-3" />
          权限清单（共 {snapshot.permissionsAtThatTime.length} 项）
        </div>
        <div className="flex flex-wrap gap-1">
          {snapshot.permissionsAtThatTime.map((p) => (
            <Chip
              key={p}
              variant="default"
              size="sm"
              className="font-mono"
            >
              {p as string}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

interface OperationCardProps {
  log: OperationLog;
  snapshot?: PermissionSnapshot;
  expanded: boolean;
  onToggleExpand: () => void;
  navigate: (path: string) => void;
}

function OperationCard({
  log,
  snapshot,
  expanded,
  onToggleExpand,
  navigate,
}: OperationCardProps) {
  const typeMeta =
    OPERATION_TYPES.find((t) => t.key === log.operationType) ??
    OPERATION_TYPES[0];
  const Icon = typeMeta.icon;
  const hasRelated = log.relatedBackupId && log.relatedRollbackId;
  const copy = (v: string) => {
    navigator.clipboard.writeText(v).catch(() => {});
  };

  return (
    <div className="relative pl-10 pb-6 last:pb-0">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-audit-100" />
      <div
        className={cn(
          'absolute left-0 top-0 w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white shadow-sm z-10',
          'border-audit-200 text-audit-500'
        )}
        style={{ color: typeMeta.color, borderColor: typeMeta.color + '66' }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="card overflow-hidden hover:shadow-card-hover transition-all">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: typeMeta.color + '14',
                    color: typeMeta.color,
                    borderColor: typeMeta.color + '33',
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {typeMeta.label}
                </span>
                <span className="text-sm font-semibold text-audit-800">
                  {log.operatorName}
                </span>
                <div className="w-7 h-7 rounded-full bg-audit-200 flex items-center justify-center text-audit-700 font-bold text-xs">
                  {log.operatorName.slice(0, 1)}
                </div>
                <div className="flex items-center gap-1 text-xs text-audit-400">
                  <Clock className="w-3 h-3" />
                  {formatRelative(log.operatedAt)}
                </div>
              </div>
              <div className="text-[11px] text-audit-400 font-mono flex items-center gap-2 flex-wrap">
                <span className="truncate" title={log.id}>
                  {log.id}
                </span>
                <button
                  type="button"
                  onClick={() => copy(log.id)}
                  className="p-0.5 rounded text-audit-300 hover:text-audit-600 hover:bg-audit-100"
                  title="复制操作ID"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
                <span>·</span>
                <span>{formatDateTime(log.operatedAt)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1.5 rounded-md text-audit-400 hover:text-audit-700 hover:bg-audit-50 transition-colors"
              title={expanded ? '收起详情' : '展开详情'}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {hasRelated && (
            <div className="mb-3 bg-gradient-to-r from-info-50 to-purple-50 rounded-md border border-info-200/60 p-3">
              <div className="text-[11px] font-semibold text-info-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Link2 className="w-3 h-3" />
                补录 ↔ 回滚 联动对应
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 bg-white rounded border border-info-200 px-3 py-2 min-w-0">
                  <div className="text-[10px] text-info-500 uppercase tracking-wider mb-0.5">
                    备份补录
                  </div>
                  <div className="font-mono text-info-700 truncate" title={log.relatedBackupId}>
                    {log.relatedBackupId}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="border-t-2 border-dashed border-info-300 w-8 relative">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                      <ArrowRight className="w-3.5 h-3.5 text-info-400" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white rounded border border-purple-200 px-3 py-2 min-w-0">
                  <div className="text-[10px] text-purple-500 uppercase tracking-wider mb-0.5">
                    回滚记录
                  </div>
                  <div className="font-mono text-purple-700 truncate" title={log.relatedRollbackId}>
                    {log.relatedRollbackId}
                  </div>
                </div>
              </div>
            </div>
          )}

          {log.conflictId && (
            <div className="mb-3 flex items-center gap-2 text-xs">
              <Hash className="w-3 h-3 text-audit-400" />
              <span className="text-audit-500">关联冲突：</span>
              <button
                type="button"
                onClick={() => navigate(`/conflict/${log.conflictId}`)}
                className="font-mono text-audit-700 hover:text-audit-900 hover:underline underline-offset-2"
              >
                {log.conflictId}
              </button>
              <Chip variant="info" size="sm">
                跳转
              </Chip>
            </div>
          )}

          {log.remark && (
            <div className="mb-3 text-xs text-audit-600 bg-audit-50/60 rounded-md border border-audit-100 px-3 py-2 leading-relaxed">
              {log.remark}
            </div>
          )}

          {expanded && (
            <div className="space-y-4 pt-2 border-t border-audit-100 mt-3">
              <div>
                <div className="text-[11px] font-semibold text-audit-500 uppercase tracking-wider mb-2">
                  状态变更对比
                </div>
                <DiffTable before={log.beforeState} after={log.afterState} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-audit-500 uppercase tracking-wider mb-2">
                  操作详情
                </div>
                <div className="bg-audit-50/60 rounded-md border border-audit-100 p-3">
                  <pre className="text-[11px] font-mono text-audit-700 whitespace-pre-wrap break-words leading-relaxed">
                    {JSON.stringify(log.detail, null, 2)}
                  </pre>
                </div>
              </div>
              <PermissionAuditPanel snapshot={snapshot} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeMultiSelect({
  selected,
  onChange,
}: {
  selected: OperationType[];
  onChange: (v: OperationType[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (t: OperationType) => {
    if (selected.includes(t)) {
      onChange(selected.filter((x) => x !== t));
    } else {
      onChange([...selected, t]);
    }
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="select flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selected.length === 0
            ? '全部操作类型'
            : selected.length === OPERATION_TYPES.length
            ? `全部类型（${selected.length}）`
            : `已选 ${selected.length} 种类型`}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-audit-400 flex-shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {selected.length > 0 && selected.length < OPERATION_TYPES.length && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selected.map((s) => {
            const meta = OPERATION_TYPES.find((t) => t.key === s)!;
            return (
              <Chip
                key={s}
                variant="primary"
                size="sm"
                onRemove={() => toggle(s)}
              >
                <meta.icon className="w-3 h-3" />
                {meta.label}
              </Chip>
            );
          })}
        </div>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-audit-200 bg-white shadow-lg p-2 max-h-72 overflow-auto">
          {OPERATION_TYPES.map((t) => {
            const checked = selected.includes(t.key);
            return (
              <label
                key={t.key}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors',
                  checked
                    ? 'bg-audit-50 text-audit-800'
                    : 'hover:bg-audit-50/50 text-audit-600'
                )}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-audit-300 text-audit-600 focus:ring-audit-500"
                  checked={checked}
                  onChange={() => toggle(t.key)}
                />
                <t.icon className="w-4 h-4" style={{ color: t.color }} />
                <span className="flex-1">{t.label}</span>
                <span className="text-[11px] text-audit-400">{t.desc}</span>
              </label>
            );
          })}
          <div className="border-t border-audit-100 mt-1 pt-1 flex gap-2">
            <button
              type="button"
              onClick={() => onChange(OPERATION_TYPES.map((t) => t.key))}
              className="text-xs text-audit-500 hover:text-audit-700 px-2 py-1 rounded hover:bg-audit-50"
            >
              全选
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-audit-500 hover:text-audit-700 px-2 py-1 rounded hover:bg-audit-50"
            >
              清空
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsSummary({ logs }: { logs: OperationLog[] }) {
  const total = logs.length;
  const typeDist = useMemo(() => {
    const map = new Map<OperationType, number>();
    logs.forEach((l) => map.set(l.operationType, (map.get(l.operationType) ?? 0) + 1));
    return OPERATION_TYPES.map((t) => ({
      key: t.key,
      name: t.label,
      value: map.get(t.key) ?? 0,
      color: t.color,
    })).filter((x) => x.value > 0);
  }, [logs]);
  const withBackup = logs.filter(
    (l) => l.relatedBackupId && l.relatedRollbackId
  ).length;
  const hasBackupOrRollback = logs.filter(
    (l) => l.relatedBackupId || l.relatedRollbackId
  ).length;
  const pairRate =
    hasBackupOrRollback > 0
      ? Math.round((withBackup / hasBackupOrRollback) * 100)
      : 0;

  const renderCustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload;
    return (
      <div className="bg-white rounded-md shadow-lg border border-audit-200 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="font-semibold text-audit-700">{p.name}</span>
          <span className="text-audit-500">·</span>
          <span className="text-audit-700 font-mono">
            {p.value} 次
          </span>
        </div>
        <div className="text-audit-400 mt-0.5">
          {total > 0 ? `${((p.value / total) * 100).toFixed(1)}%` : '-'}
        </div>
      </div>
    );
  };

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-audit-500" />
          统计摘要
        </h2>
        <div className="text-xs text-audit-400">
          共匹配 {total} 条操作记录
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-audit-50 to-white rounded-lg border border-audit-100 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-audit-400 uppercase tracking-wider mb-2">
                <History className="w-3.5 h-3.5" />
                总操作数
              </div>
              <div className="text-3xl font-serif font-bold text-audit-800">
                {total}
              </div>
            </div>
            <div className="bg-gradient-to-br from-info-50 to-purple-50 rounded-lg border border-info-200/60 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-info-500 uppercase tracking-wider mb-2">
                <Link2 className="w-3.5 h-3.5" />
                补录-回滚 配对率
              </div>
              <div className="flex items-baseline gap-1">
                <div className="text-3xl font-serif font-bold text-info-700">
                  {pairRate}
                </div>
                <div className="text-xl text-info-500">%</div>
              </div>
              <div className="text-[11px] text-info-500 mt-1">
                {withBackup} 对已配对 / {hasBackupOrRollback} 条涉及备份或回滚
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {typeDist.slice(0, 6).map((t) => (
              <div
                key={t.key}
                className="bg-white rounded-md border border-audit-100 p-2 flex items-center gap-2"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <div className="min-w-0">
                  <div className="text-[11px] text-audit-500 truncate">
                    {t.name}
                  </div>
                  <div className="text-sm font-semibold text-audit-700 font-mono">
                    {t.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-7 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeDist}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={1.5}
                stroke="#fff"
                strokeWidth={2}
              >
                {typeDist.map((t, i) => (
                  <Cell key={i} fill={t.color} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip as never} />
              <Legend
                iconType="circle"
                formatter={(v) => (
                  <span className="text-xs text-audit-600">{v}</span>
                )}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function OperationHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [snapshots, setSnapshots] = useState<PermissionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<OperationType[]>([]);
  const [operatorFilter, setOperatorFilter] = useState('');
  const [conflictIdFilter, setConflictIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [onlyWithAudit, setOnlyWithAudit] = useState(false);
  const [expandAudit, setExpandAudit] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const l = AuditService.listOperationLogs();
      const s = AuditService.listPermissionSnapshots();
      setLogs(l);
      setSnapshots(s);
      setLoading(false);
    }, 300);
  }, []);

  const operators = useMemo(() => {
    const set = new Map<string, string>();
    logs.forEach((l) => set.set(l.operatorId, l.operatorName));
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (typeFilter.length > 0 && !typeFilter.includes(l.operationType)) return false;
      if (operatorFilter && l.operatorId !== operatorFilter) return false;
      if (conflictIdFilter && l.conflictId !== conflictIdFilter.trim()) return false;
      if (dateFrom && l.operatedAt < dateFrom) return false;
      if (dateTo && l.operatedAt > dateTo + 'T23:59:59.999Z') return false;
      if (onlyWithAudit) {
        const snap = snapshots.find((s) => s.id === l.permissionSnapshotId);
        if (!snap) return false;
      }
      return true;
    });
  }, [logs, typeFilter, operatorFilter, conflictIdFilter, dateFrom, dateTo, onlyWithAudit, snapshots]);

  const snapshotMap = useMemo(() => {
    const m = new Map<string, PermissionSnapshot>();
    snapshots.forEach((s) => m.set(s.id, s));
    return m;
  }, [snapshots]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedLogs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedLogs(next);
  };

  const toggleAll = () => {
    if (expandedLogs.size === filteredLogs.length) {
      setExpandedLogs(new Set());
    } else {
      setExpandedLogs(new Set(filteredLogs.map((l) => l.id)));
    }
  };

  const resetFilters = () => {
    setTypeFilter([]);
    setOperatorFilter('');
    setConflictIdFilter('');
    setDateFrom('');
    setDateTo('');
    setOnlyWithAudit(false);
  };

  return (
    <div className="space-y-0 pb-10">
      <div className="card p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="page-title">操作历史</h1>
              <Chip variant="info" size="sm">
                <History className="w-3 h-3" />
                审计追踪
              </Chip>
            </div>
            <p className="text-sm text-audit-500">
              按时间倒序展示所有审计动作，支持权限审计链回溯、补录-回滚联动追溯
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          <div className="lg:col-span-2">
            <label className="label">操作类型（多选）</label>
            <TypeMultiSelect selected={typeFilter} onChange={setTypeFilter} />
          </div>
          <div>
            <label className="label">操作人</label>
            <select
              className="select"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
            >
              <option value="">全部操作人</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">冲突ID</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="如 conf_0001"
              value={conflictIdFilter}
              onChange={(e) => setConflictIdFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              开始日期
            </label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <CalendarRange className="w-3 h-3" />
              结束日期
            </label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-audit-100">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-audit-300 text-audit-600 focus:ring-audit-500"
                checked={onlyWithAudit}
                onChange={(e) => setOnlyWithAudit(e.target.checked)}
              />
              <span className="text-sm text-audit-600 group-hover:text-audit-800">
                仅看带权限审计链的记录
              </span>
              <Chip variant="info" size="sm">
                <ShieldCheck className="w-3 h-3" />
                审计
              </Chip>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-audit-300 text-audit-600 focus:ring-audit-500"
                checked={expandAudit}
                onChange={(e) => setExpandAudit(e.target.checked)}
              />
              <span className="text-sm text-audit-600 group-hover:text-audit-800">
                默认展开权限审计链
              </span>
              {expandAudit && (
                <span className="text-[11px] text-success-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已开启
                </span>
              )}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="btn-ghost"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
            <div className="text-xs text-audit-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              当前匹配 <span className="font-semibold text-audit-700">{filteredLogs.length}</span> 条
            </div>
          </div>
        </div>
      </div>

      {!loading && filteredLogs.length > 0 && (
        <StatsSummary logs={filteredLogs} />
      )}

      {loading ? (
        <div className="card p-10">
          <div className="flex flex-col items-center gap-3 text-audit-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <div className="text-sm">加载审计数据…</div>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          variant="search"
          title="未找到匹配的操作记录"
          description="尝试调整筛选条件，或清除所有过滤器查看完整记录。"
          action={
            <button type="button" onClick={resetFilters} className="btn-primary">
              <RefreshCw className="w-4 h-4" />
              清除筛选条件
            </button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="section-title flex items-center gap-2">
              <History className="w-4 h-4 text-audit-500" />
              时间线视图
            </h2>
            <button type="button" onClick={toggleAll} className="btn-ghost !py-1 !px-3 text-xs">
              {expandedLogs.size === filteredLogs.length ? '全部收起' : '全部展开'}
            </button>
          </div>
          <div className="pt-2">
            {filteredLogs.map((log) => (
              <OperationCard
                key={log.id}
                log={log}
                snapshot={snapshotMap.get(log.permissionSnapshotId)}
                expanded={expandAudit || expandedLogs.has(log.id)}
                onToggleExpand={() => toggleExpand(log.id)}
                navigate={navigate}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
