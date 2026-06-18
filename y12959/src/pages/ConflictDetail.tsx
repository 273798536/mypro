import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  Download,
  Home,
  FileWarning,
  Hash,
  Clock,
  Repeat,
  User,
  Tag,
  Database,
  Shield,
  KeyRound,
  Activity,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Link2,
  Archive,
  RotateCcw,
  ListChecks,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ConflictService } from '@/services/ConflictService';
import { SnapshotService } from '@/services/SnapshotService';
import { TrailService } from '@/services/TrailService';
import { AuditService } from '@/services/AuditService';
import { ExportService } from '@/services/ExportService';
import SeverityBadge from '@/components/SeverityBadge';
import StatusBadge from '@/components/StatusBadge';
import Chip from '@/components/Chip';
import EmptyState from '@/components/EmptyState';
import { formatDateTime, formatRelative, getBlockReasonDetail } from '@/utils/format';
import { cn } from '@/lib/utils';
import type {
  ConflictRecord,
  FieldDiff,
  ExecutionTrail,
  ConflictRecord as ConflictRecordType,
  SnapshotField,
  OperationLog,
  PermissionSnapshot,
  ExplanationContextData,
} from '@/types';

const conflictTypeLabel: Record<ConflictRecord['conflictType'], string> = {
  duplicate_execution: '重复执行',
  schema_mismatch: '表结构不兼容',
  key_collision: '唯一键冲突',
};

const idempotentKeyTypeLabel: Record<ConflictRecord['idempotentKeyType'], string> = {
  order_no: '订单号级幂等',
  biz_id: '业务唯一ID级幂等',
  unique_hash: '内容哈希级幂等',
  composite: '多字段联合幂等',
};

const changeTypeConfig: Record<
  NonNullable<SnapshotField['changeType']>,
  { label: string; textClass: string; bgClass: string; borderClass: string; icon: string }
> = {
  added: {
    label: '新增',
    textClass: 'text-success-700',
    bgClass: 'bg-success-50',
    borderClass: 'border-success-200',
    icon: '+',
  },
  removed: {
    label: '移除',
    textClass: 'text-danger-700',
    bgClass: 'bg-danger-50',
    borderClass: 'border-danger-200',
    icon: '−',
  },
  modified: {
    label: '修改',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    icon: '~',
  },
  unchanged: {
    label: '未变',
    textClass: 'text-slate-500',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    icon: '=',
  },
};

const trailResultConfig: Record<
  ExecutionTrail['result'],
  {
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    iconClass: string;
    Icon: typeof CheckCircle2;
  }
> = {
  blocked: {
    label: '被拦截',
    textClass: 'text-danger-700',
    bgClass: 'bg-danger-50',
    borderClass: 'border-danger-200',
    iconClass: 'text-danger-500',
    Icon: Shield,
  },
  failed: {
    label: '执行失败',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    iconClass: 'text-rose-500',
    Icon: XCircle,
  },
  partial: {
    label: '部分成功',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    iconClass: 'text-amber-500',
    Icon: AlertTriangle,
  },
};

interface ExpandableTrailProps {
  trail: ExecutionTrail;
  onHover: () => void;
  onLeave: () => void;
}

function ExpandableTrail({ trail, onHover, onLeave }: ExpandableTrailProps) {
  const [expanded, setExpanded] = useState(false);
  const resultCfg = trailResultConfig[trail.result];
  const { Icon } = resultCfg;
  const detail = getBlockReasonDetail(trail.blockReason, trail.blockRule);

  return (
    <li className="relative pl-10 pb-8 last:pb-0">
      <div className="absolute left-0 top-1 bottom-0 w-px bg-audit-200 last:hidden" />
      <div
        className={cn(
          'absolute left-0 top-0 z-10 flex h-8 w-8 -translate-x-1/2 rotate-45 items-center justify-center border-2 shadow-sm',
          resultCfg.bgClass,
          resultCfg.borderClass
        )}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <span
          className={cn('-rotate-45 text-xs font-bold', resultCfg.textClass)}
        >
          {trail.attemptNo}
        </span>
      </div>

      <div
        className={cn(
          'rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer',
          'border-audit-100 hover:border-audit-300'
        )}
        onClick={() => setExpanded((e) => !e)}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-audit-800">
              第 {trail.attemptNo} 次尝试
            </span>
            <Chip
              variant={
                trail.result === 'blocked'
                  ? 'danger'
                  : trail.result === 'failed'
                    ? 'danger'
                    : 'warning'
              }
              size="sm"
            >
              <Icon className={cn('h-3 w-3 shrink-0', resultCfg.iconClass)} />
              {resultCfg.label}
            </Chip>
            <span className="inline-flex items-center gap-1 text-xs text-audit-500">
              <Activity className="h-3 w-3" />
              {trail.nodeName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-audit-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(trail.executedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {trail.operator}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>

        <div className="mt-2 rounded-md border border-audit-100 bg-audit-50/60 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-audit-500 mb-0.5">
            拦截原因摘要
          </div>
          <div className="text-sm text-audit-700">{detail.summary}</div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-audit-100 pt-4 animate-fade-in-up">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
                完整入参摘要
              </div>
              <pre className="overflow-auto rounded-md bg-audit-900 p-3 text-[11px] leading-relaxed text-audit-100 scrollbar-thin max-h-40">
                {JSON.stringify(trail.inputSummary, null, 2)}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
                命中规则
              </div>
              <code className="inline-block rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-700 border border-purple-200 font-mono">
                {trail.blockRule}
              </code>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
                日志路径
              </div>
              <code className="inline-block rounded-md bg-audit-50 px-2 py-1 text-xs text-audit-700 border border-audit-200 font-mono break-all">
                {trail.fullLogPath}
              </code>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export default function ConflictDetail() {
  const { conflictId } = useParams<{ conflictId: string }>();
  const navigate = useNavigate();
  const { setExplanationContext, currentUser } = useAppStore();

  const record = useMemo<ConflictRecordType | undefined>(() => {
    if (!conflictId) return undefined;
    return ConflictService.get(conflictId);
  }, [conflictId]);

  const snapshotDiffs = useMemo<FieldDiff[]>(() => {
    if (!record) return [];
    return SnapshotService.compare(record.snapshotBeforeId, record.snapshotAfterId);
  }, [record]);

  const beforeSnapshot = useMemo(() => {
    if (!record) return undefined;
    return SnapshotService.get(record.snapshotBeforeId);
  }, [record]);

  const afterSnapshot = useMemo(() => {
    if (!record) return undefined;
    return SnapshotService.get(record.snapshotAfterId);
  }, [record]);

  const trails = useMemo<ExecutionTrail[]>(() => {
    if (!record) return [];
    return TrailService.listByConflict(record.id);
  }, [record]);

  const auditChain = useMemo(() => {
    if (!record) return null;
    return AuditService.getAuditChain(record.id);
  }, [record]);

  const handleIdempotentHover = (rec: ConflictRecordType) => {
    const data: ExplanationContextData = {
      idempotent_key: {
        key: rec.idempotentKey,
        keyType: rec.idempotentKeyType,
        attempts: rec.duplicateAttempts,
        firstTime: rec.firstExecuteTime,
        lastTime: rec.lastExecuteTime,
      },
    };
    setExplanationContext('idempotent_key', data);
  };

  const handleSnapshotDiffHover = (diff: FieldDiff) => {
    const data: ExplanationContextData = {
      snapshot_diff: {
        fieldName: diff.field.name,
        changeType: diff.changeType,
        oldValue: diff.field.oldValue,
        newValue: diff.field.newValue,
        tableName: afterSnapshot?.tableName ?? beforeSnapshot?.tableName ?? '未知表',
      },
    };
    setExplanationContext('snapshot_diff', data);
  };

  const handleTrailHover = (trail: ExecutionTrail) => {
    const data: ExplanationContextData = {
      trail_node: {
        attemptNo: trail.attemptNo,
        nodeName: trail.nodeName,
        result: trail.result,
        blockReason: trail.blockReason,
        blockRule: trail.blockRule,
      },
    };
    setExplanationContext('trail_node', data);
  };

  const handleClearContext = () => {
    setExplanationContext(null, null);
  };

  const handleExport = () => {
    if (!record) return;
    ExportService.createJob({
      format: 'xlsx',
      scope: 'single',
      singleConflictId: record.id,
      createdBy: currentUser.id,
    });
  };

  if (!record) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-audit-500">
          <button
            type="button"
            onClick={() => navigate('/conflicts')}
            className="inline-flex items-center gap-1.5 rounded-md border border-audit-200 bg-white px-3 py-1.5 text-sm font-medium text-audit-700 transition-colors hover:bg-audit-50"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </button>
        </div>
        <div className="card">
          <EmptyState
            variant="error"
            title="冲突记录不存在"
            description={`无法找到 ID 为「${conflictId ?? '未知'}」的冲突记录，可能已被删除或 ID 错误。`}
            action={
              <button
                type="button"
                onClick={() => navigate('/conflicts')}
                className="inline-flex items-center gap-1.5 rounded-md bg-audit-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-audit-800"
              >
                <FileWarning className="h-4 w-4" />
                返回冲突列表
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up" onMouseLeave={handleClearContext}>
      {/* 顶部操作区 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/conflicts')}
            className="inline-flex items-center gap-1.5 rounded-md border border-audit-200 bg-white px-3 py-1.5 text-sm font-medium text-audit-700 transition-colors hover:bg-audit-50"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </button>
          <nav className="flex items-center gap-1.5 text-sm text-audit-500">
            <Home className="h-3.5 w-3.5 shrink-0" />
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="hover:text-audit-800 transition-colors"
            >
              冲突总览
            </button>
            <span className="text-audit-300">/</span>
            <button
              type="button"
              onClick={() => navigate('/conflicts')}
              className="hover:text-audit-800 transition-colors"
            >
              冲突列表
            </button>
            <span className="text-audit-300">/</span>
            <span className="font-semibold text-audit-800">#{record.id.slice(-8)}</span>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={record.status} />
          <SeverityBadge severity={record.severity} />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Wrench className="h-4 w-4" />
            修正
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-audit-200 bg-white px-3 py-1.5 text-sm font-medium text-audit-700 transition-colors hover:bg-audit-50"
          >
            <Download className="h-4 w-4" />
            导出单条
          </button>
        </div>
      </div>

      {/* 主记录卡 */}
      <section className="card">
        <header className="mb-4 flex items-center justify-between border-b border-audit-100 pb-4">
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-audit-600" />
            <h2 className="section-title">主记录信息</h2>
            <Chip variant="outline" size="sm">
              ID: {record.id}
            </Chip>
          </div>
        </header>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              迁移任务
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-audit-800">
              <Activity className="h-3.5 w-3.5 text-audit-400 shrink-0" />
              {record.migrationTaskName}
              <span className="text-xs text-audit-400">({record.migrationTaskId})</span>
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              订单号
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-audit-800">
              <Hash className="h-3.5 w-3.5 text-audit-400 shrink-0" />
              <code className="rounded bg-audit-50 px-2 py-0.5 font-mono text-xs border border-audit-100">
                {record.orderNo}
              </code>
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              幂等键
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-audit-800">
              <KeyRound className="h-3.5 w-3.5 text-audit-400 shrink-0" />
              <code className="truncate rounded bg-audit-50 px-2 py-0.5 font-mono text-xs border border-audit-100 max-w-[200px]">
                {record.idempotentKey}
              </code>
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              冲突类型
            </dt>
            <dd className="text-sm font-medium text-audit-800">
              <Chip
                variant={
                  record.conflictType === 'schema_mismatch'
                    ? 'warning'
                    : record.conflictType === 'key_collision'
                      ? 'danger'
                      : 'info'
                }
              >
                {conflictTypeLabel[record.conflictType]}
              </Chip>
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              首次 / 最近执行
            </dt>
            <dd className="flex flex-col gap-0.5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-audit-700">
                <Clock className="h-3 w-3 text-audit-400 shrink-0" />
                <span className="text-xs text-audit-500">首次：</span>
                {formatDateTime(record.firstExecuteTime)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-audit-700">
                <Clock className="h-3 w-3 text-audit-400 shrink-0" />
                <span className="text-xs text-audit-500">最近：</span>
                {formatDateTime(record.lastExecuteTime)}
                <span className="text-xs text-audit-400">
                  ({formatRelative(record.lastExecuteTime)})
                </span>
              </span>
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              重复次数
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-audit-800">
              <Repeat className="h-3.5 w-3.5 text-audit-400 shrink-0" />
              <span
                className={cn(
                  'inline-flex h-6 min-w-6 items-center justify-center rounded-md px-2 text-xs font-bold',
                  record.duplicateAttempts >= 5
                    ? 'bg-danger-100 text-danger-700 border border-danger-200'
                    : record.duplicateAttempts >= 3
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-sky-100 text-sky-700 border border-sky-200'
                )}
              >
                {record.duplicateAttempts} 次
              </span>
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              当前负责人
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-audit-800">
              <User className="h-3.5 w-3.5 text-audit-400 shrink-0" />
              {record.currentOwner}
              {record.assignee && record.assignee !== record.currentOwner && (
                <span className="text-xs text-audit-400">
                  (分配: {record.assignee})
                </span>
              )}
            </dd>
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              标签
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {record.tags.length > 0 ? (
                record.tags.map((tag) => (
                  <Chip key={tag} variant="default" size="sm">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Chip>
                ))
              ) : (
                <span className="text-xs text-audit-400">暂无标签</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* 幂等键分析区 */}
      <section
        className="card"
        onMouseEnter={() => handleIdempotentHover(record)}
        onMouseLeave={handleClearContext}
      >
        <header className="mb-4 flex items-center justify-between border-b border-audit-100 pb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-purple-600" />
            <h2 className="section-title">幂等键分析</h2>
          </div>
          <span className="text-[11px] text-audit-400">
            悬停查看规则说明
          </span>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600">
              键类型
            </div>
            <div className="text-sm font-semibold text-purple-800">
              {idempotentKeyTypeLabel[record.idempotentKeyType]}
            </div>
            <div className="mt-1 text-xs text-purple-500">
              ({record.idempotentKeyType})
            </div>
          </div>
          <div className="rounded-lg border border-audit-100 bg-white p-4 lg:col-span-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              键值
            </div>
            <code className="block break-all rounded-md bg-audit-900 p-2 text-xs leading-relaxed text-audit-100 font-mono">
              {record.idempotentKey}
            </code>
          </div>
          <div className="rounded-lg border border-audit-100 bg-white p-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              尝试次数
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-2xl font-bold',
                  record.duplicateAttempts >= 5
                    ? 'text-danger-600'
                    : record.duplicateAttempts >= 3
                      ? 'text-amber-600'
                      : 'text-sky-600'
                )}
              >
                {record.duplicateAttempts}
              </span>
              <span className="text-xs text-audit-500">次</span>
            </div>
            {record.duplicateAttempts >= 5 && (
              <div className="mt-1 text-xs text-danger-600 font-medium">
                ⚠ 高频重试，需关注
              </div>
            )}
          </div>
          <div className="rounded-lg border border-audit-100 bg-white p-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-audit-500">
              首次 / 最近
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1 text-audit-700">
                <span className="text-audit-400">首：</span>
                {formatRelative(record.firstExecuteTime)}
              </div>
              <div className="flex items-center gap-1 text-audit-700">
                <span className="text-audit-400">近：</span>
                {formatRelative(record.lastExecuteTime)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 表结构快照对比区 */}
      <section className="card">
        <header className="mb-4 flex items-center justify-between border-b border-audit-100 pb-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-600" />
            <h2 className="section-title">表结构快照对比</h2>
            <Chip variant="info" size="sm">
              {snapshotDiffs.filter((d) => d.changeType !== 'unchanged').length} 处差异
            </Chip>
          </div>
        </header>

        {snapshotDiffs.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="暂无快照对比数据"
            description="该冲突记录未关联表结构快照，或前后版本完全一致。"
          />
        ) : (
          <>
            {/* 快照元信息 */}
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-audit-200 bg-white/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Chip variant="outline" size="sm">
                    变更前 Before
                  </Chip>
                  {beforeSnapshot && (
                    <span className="text-[11px] text-audit-400">
                      {formatDateTime(beforeSnapshot.capturedAt)}
                    </span>
                  )}
                </div>
                {beforeSnapshot ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-[11px] text-audit-500">表名</dt>
                      <dd className="font-medium text-audit-800">
                        {beforeSnapshot.tableName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-audit-500">版本</dt>
                      <dd className="font-medium text-audit-800 font-mono text-xs">
                        {beforeSnapshot.migrationVersion}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-audit-500">行数量</dt>
                      <dd className="font-medium text-audit-800">
                        {beforeSnapshot.rowCount.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-audit-500">Checksum</dt>
                      <dd className="font-mono text-xs text-audit-700 truncate">
                        {beforeSnapshot.checksum.slice(0, 16)}...
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-audit-400">快照不可用</p>
                )}
              </div>

              <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Chip variant="primary" size="sm">
                    变更后 After
                  </Chip>
                  {afterSnapshot && (
                    <span className="text-[11px] text-indigo-500">
                      {formatDateTime(afterSnapshot.capturedAt)}
                    </span>
                  )}
                </div>
                {afterSnapshot ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-[11px] text-indigo-500">表名</dt>
                      <dd className="font-medium text-indigo-800">
                        {afterSnapshot.tableName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-indigo-500">版本</dt>
                      <dd className="font-medium text-indigo-800 font-mono text-xs">
                        {afterSnapshot.migrationVersion}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-indigo-500">行数量</dt>
                      <dd className="font-medium text-indigo-800">
                        {afterSnapshot.rowCount.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-indigo-500">Checksum</dt>
                      <dd className="font-mono text-xs text-indigo-700 truncate">
                        {afterSnapshot.checksum.slice(0, 16)}...
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-audit-400">快照不可用</p>
                )}
              </div>
            </div>

            {/* 字段对比表 */}
            <div className="overflow-hidden rounded-lg border border-audit-200">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-audit-50 border-b border-audit-200">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-audit-500 w-48">
                        字段名
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-audit-500 w-28">
                        变化类型
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-audit-500">
                        定义变更
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-audit-500">
                        影响说明
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-audit-100">
                    {snapshotDiffs.map((diff) => {
                      const cfg = changeTypeConfig[diff.changeType ?? 'unchanged'];
                      const hasChange = diff.changeType !== 'unchanged';
                      return (
                        <tr
                          key={diff.field.name}
                          className={cn(
                            'transition-colors',
                            hasChange
                              ? `${cfg.bgClass} hover:${cfg.bgClass}/80`
                              : 'bg-white hover:bg-audit-50/50'
                          )}
                          onMouseEnter={() => hasChange && handleSnapshotDiffHover(diff)}
                          onMouseLeave={handleClearContext}
                        >
                          <td className="px-4 py-3 align-top">
                            <code className="font-mono text-xs font-medium text-audit-800">
                              {diff.field.name}
                            </code>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
                                cfg.bgClass,
                                cfg.borderClass,
                                cfg.textClass
                              )}
                            >
                              <span className="font-bold">{cfg.icon}</span>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {diff.changeType === 'unchanged' ? (
                              <span className="text-xs text-audit-500">
                                {diff.field.dataType}
                                {!diff.field.nullable ? ' NOT NULL' : ''}
                                {diff.field.defaultValue
                                  ? ` DEFAULT ${diff.field.defaultValue}`
                                  : ''}
                              </span>
                            ) : diff.changeType === 'added' ? (
                              <span className="text-xs text-audit-700">
                                <span className="text-audit-400">∅</span>
                                <span className="mx-1.5 text-audit-400">→</span>
                                <code className="font-mono rounded bg-success-100 px-1.5 py-0.5 text-success-700 border border-success-200">
                                  {diff.field.dataType}
                                </code>
                              </span>
                            ) : diff.changeType === 'removed' ? (
                              <span className="text-xs text-audit-700">
                                <code className="font-mono rounded bg-danger-100 px-1.5 py-0.5 text-danger-700 line-through border border-danger-200">
                                  {diff.before?.dataType ?? diff.field.dataType}
                                </code>
                                <span className="mx-1.5 text-audit-400">→</span>
                                <span className="text-audit-400">∅</span>
                              </span>
                            ) : (
                              <span className="text-xs text-audit-700">
                                <code className="font-mono rounded bg-audit-100 px-1.5 py-0.5 text-audit-600 line-through border border-audit-200">
                                  {diff.field.oldValue}
                                </code>
                                <span className="mx-1.5 text-amber-600 font-bold">→</span>
                                <code className="font-mono rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 border border-amber-200">
                                  {diff.field.newValue}
                                </code>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {diff.field.impactNote ? (
                              <span className="text-xs text-audit-700 leading-relaxed">
                                {diff.field.impactNote}
                              </span>
                            ) : (
                              <span className="text-xs text-audit-400 italic">
                                无特殊影响说明
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 迁移执行轨迹时间线 */}
      <section className="card">
        <header className="mb-4 flex items-center justify-between border-b border-audit-100 pb-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-600" />
            <h2 className="section-title">迁移执行轨迹</h2>
            <Chip variant="success" size="sm">
              {trails.length} 次记录
            </Chip>
          </div>
          <span className="text-[11px] text-audit-400">
            悬停节点查看详情 · 点击展开完整信息
          </span>
        </header>

        {trails.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="暂无执行轨迹"
            description="该冲突记录尚未生成迁移执行轨迹，可能为静态规则检测。"
          />
        ) : (
          <ol className="relative">
            {trails.map((trail) => (
              <ExpandableTrail
                key={trail.id}
                trail={trail}
                onHover={() => handleTrailHover(trail)}
                onLeave={handleClearContext}
              />
            ))}
          </ol>
        )}
      </section>

      {/* 操作审计链 */}
      <section className="card">
        <header className="mb-4 flex items-center justify-between border-b border-audit-100 pb-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-audit-600" />
            <h2 className="section-title">操作审计链</h2>
          </div>
        </header>

        {!auditChain ||
        (auditChain.logs.length === 0 &&
          auditChain.backups.length === 0 &&
          auditChain.rollbacks.length === 0) ? (
          <EmptyState
            variant="no-data"
            title="暂无审计链数据"
            description="该冲突尚未产生操作日志、备份或回滚记录。"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 操作日志 */}
            <div className="rounded-lg border border-audit-200 bg-white/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-audit-500" />
                <h3 className="text-sm font-semibold text-audit-800">
                  操作日志 ({auditChain.logs.length})
                </h3>
              </div>
              {auditChain.logs.length === 0 ? (
                <p className="text-xs text-audit-400 italic py-4 text-center">
                  暂无操作日志
                </p>
              ) : (
                <ul className="space-y-2">
                  {auditChain.logs.slice(0, 5).map((log: OperationLog) => (
                    <li
                      key={log.id}
                      className="rounded-md border border-audit-100 bg-white p-2.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Chip variant="outline" size="sm">
                          {log.operationType}
                        </Chip>
                        <span className="text-[10px] text-audit-400">
                          {formatRelative(log.operatedAt)}
                        </span>
                      </div>
                      <div className="text-xs text-audit-600">
                        <User className="h-3 w-3 inline mr-1" />
                        {log.operatorName}
                      </div>
                      {log.remark && (
                        <div className="mt-1 text-[11px] text-audit-500 line-clamp-2">
                          {log.remark}
                        </div>
                      )}
                    </li>
                  ))}
                  {auditChain.logs.length > 5 && (
                    <li className="text-center text-xs text-audit-400 pt-1">
                      还有 {auditChain.logs.length - 5} 条记录
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* 备份记录 */}
            <div className="rounded-lg border border-audit-200 bg-white/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Archive className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-audit-800">
                  备份记录 ({auditChain.backups.length})
                </h3>
              </div>
              {auditChain.backups.length === 0 ? (
                <p className="text-xs text-audit-400 italic py-4 text-center">
                  暂无备份记录
                </p>
              ) : (
                <ul className="space-y-2">
                  {auditChain.backups.map(
                    (backup: { id: string; createdAt: string; restored: boolean }) => (
                      <li
                        key={backup.id}
                        className="rounded-md border border-emerald-100 bg-emerald-50/50 p-2.5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <code className="font-mono text-[11px] text-emerald-700 truncate">
                            {backup.id}
                          </code>
                          <Chip
                            variant={backup.restored ? 'warning' : 'success'}
                            size="sm"
                          >
                            {backup.restored ? '已恢复' : '已备份'}
                          </Chip>
                        </div>
                        <div className="text-[10px] text-emerald-600">
                          {formatDateTime(backup.createdAt)}
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>

            {/* 回滚记录 */}
            <div className="rounded-lg border border-audit-200 bg-white/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-audit-800">
                  回滚记录 ({auditChain.rollbacks.length})
                </h3>
              </div>
              {auditChain.rollbacks.length === 0 ? (
                <p className="text-xs text-audit-400 italic py-4 text-center">
                  暂无回滚记录
                </p>
              ) : (
                <ul className="space-y-2">
                  {auditChain.rollbacks.map(
                    (rollback: { id: string; updatedAt: string; status: string }) => (
                      <li
                        key={rollback.id}
                        className="rounded-md border border-amber-100 bg-amber-50/50 p-2.5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <code className="font-mono text-[11px] text-amber-700 truncate">
                            {rollback.id}
                          </code>
                          <Chip
                            variant={
                              rollback.status === 'failed'
                                ? 'danger'
                                : rollback.status === 'verified'
                                  ? 'success'
                                  : 'warning'
                            }
                            size="sm"
                          >
                            {rollback.status}
                          </Chip>
                        </div>
                        <div className="text-[10px] text-amber-600">
                          {formatDateTime(rollback.updatedAt)}
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>

            {/* 权限快照提示 */}
            {auditChain.snapshots.length > 0 && (
              <div className="lg:col-span-3 rounded-lg border border-purple-100 bg-purple-50/40 px-4 py-3 flex items-center gap-3">
                <Shield className="h-4 w-4 text-purple-500 shrink-0" />
                <div className="text-xs text-purple-700">
                  <span className="font-semibold">
                    已关联 {auditChain.snapshots.length} 份权限快照
                  </span>
                  ，用于事后审计每次操作时的权限边界。每一份 PermissionSnapshot 记录了操作人当时的角色与有效权限列表。
                  {auditChain.snapshots
                    .slice(0, 3)
                    .map(
                      (snap: PermissionSnapshot, i: number) => (
                        <code
                          key={snap.id}
                          className="ml-2 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-purple-200 text-purple-600"
                        >
                          {snap.id.slice(-8)}
                          {i <
                            Math.min(auditChain.snapshots.length, 3) - 1 && ','}
                        </code>
                      )
                    )}
                  {auditChain.snapshots.length > 3 && '...'}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
