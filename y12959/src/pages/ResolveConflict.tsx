import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Database,
  FileText,
  Info,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  SkipForward,
  UserCheck,
  X,
  CheckSquare,
  List,
  ArrowLeft,
  Link2,
  Copy,
  Eye,
} from 'lucide-react';
import { ConflictService } from '@/services/ConflictService';
import { ResolveService } from '@/services/ResolveService';
import { useAppStore } from '@/store/useAppStore';
import Chip from '@/components/Chip';
import StatusBadge from '@/components/StatusBadge';
import type {
  ConflictRecord,
  ResolveResult,
  ResolveStrategy,
  ResolveStep,
  ResolveStatus,
} from '@/types';
import { getStrategyMeta, formatDateTime, getStatusMeta } from '@/utils/format';
import { cn } from '@/lib/utils';

type BackupScope = 'full_row' | 'changed_fields' | 'custom';

const STEPS: Array<{ key: ResolveStep; label: string; desc: string }> = [
  { key: 'permit', label: '权限校验', desc: '核验操作人权限链' },
  { key: 'backup', label: '备份补录', desc: '写入原始数据备份' },
  { key: 'rollback', label: '回滚记录更新', desc: '生成可恢复快照' },
  { key: 'done', label: '完成', desc: '联动记录与审计归档' },
];

const STRATEGIES: Array<{
  key: ResolveStrategy;
  label: string;
  desc: string;
  icon: typeof SkipForward;
  accent: string;
}> = [
  {
    key: 'skip',
    label: '跳过',
    desc: '不执行写入，让幂等拦截继续生效，适合冲突本身就是预期场景。',
    icon: SkipForward,
    accent: 'bg-slate-50 border-slate-300 text-slate-700',
  },
  {
    key: 'overwrite',
    label: '覆盖',
    desc: '清空旧冲突记录，以当前数据重放写入，适合源数据为唯一可信来源。',
    icon: Save,
    accent: 'bg-danger-50 border-danger-300 text-danger-700',
  },
  {
    key: 'merge',
    label: '合并',
    desc: '按字段映射规则合并，保留双方非空值，适合部分字段需要兼容的场景。',
    icon: CheckSquare,
    accent: 'bg-info-50 border-info-300 text-info-700',
  },
  {
    key: 'manual',
    label: '线下手工',
    desc: '在系统外人工更新数据库或协调下游，系统仅记录处理过程以便追溯。',
    icon: List,
    accent: 'bg-amber-50 border-amber-300 text-amber-700',
  },
];

const BACKUP_SCOPES: Array<{ key: BackupScope; label: string; desc: string }> = [
  { key: 'full_row', label: '整行备份', desc: '备份该行所有列，还原最完整' },
  { key: 'changed_fields', label: '变更字段', desc: '仅备份涉及差异的字段' },
  { key: 'custom', label: '自定义', desc: '按需勾选需要备份的字段' },
];

function ProgressBar() {
  const resolveProgress = useAppStore((s) => s.resolveProgress);

  const currentIdx = STEPS.findIndex((s) => s.key === resolveProgress.step);

  const getStepStatus = (idx: number): 'done' | 'active' | 'pending' | 'error' => {
    if (resolveProgress.status === 'error' && idx === currentIdx) return 'error';
    if (resolveProgress.status === 'completed') return idx <= currentIdx ? 'done' : 'pending';
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(idx);
          const Icon =
            status === 'done'
              ? CheckCircle2
              : status === 'error'
              ? AlertTriangle
              : status === 'active' && resolveProgress.status === 'active'
              ? Loader2
              : Circle;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all',
                    status === 'done' && 'bg-success-500 border-success-500 text-white',
                    status === 'active' &&
                      resolveProgress.status === 'active' &&
                      'bg-audit-700 border-audit-700 text-white',
                    status === 'active' &&
                      resolveProgress.status !== 'active' &&
                      'bg-audit-50 border-audit-300 text-audit-500',
                    status === 'pending' && 'bg-white border-audit-200 text-audit-300',
                    status === 'error' && 'bg-danger-500 border-danger-500 text-white'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      status === 'active' &&
                        resolveProgress.status === 'active' &&
                        'animate-spin'
                    )}
                  />
                </div>
                <div className="text-center">
                  <div
                    className={cn(
                      'text-xs font-semibold',
                      status === 'done' && 'text-success-600',
                      status === 'active' && 'text-audit-700',
                      status === 'pending' && 'text-audit-400',
                      status === 'error' && 'text-danger-600'
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="text-[11px] text-audit-400 mt-0.5">{step.desc}</div>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-audit-100" />
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 transition-all duration-500',
                      status === 'done' ? 'w-full bg-success-400' : 'w-0'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WarningBanner({ conflict }: { conflict: ConflictRecord }) {
  const meta = getStatusMeta(conflict.status);
  return (
    <div className="card mb-6 border-amber-300 bg-amber-50/50">
      <div className="p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 mb-1">
            当前冲突状态为「{meta.label}」，不可执行修正操作
          </h3>
          <p className="text-sm text-amber-700">
            {conflict.status === 'resolved'
              ? `该冲突已于 ${formatDateTime(conflict.resolveInfo?.resolvedAt ?? '')} 由 ${conflict.resolveInfo?.resolvedBy ?? ''} 处理完成，若需调整请使用回滚功能。`
              : '原始数据或上下文缺失，无法按正常流程处理，请转交专项处理。'}
          </p>
          {conflict.unavailableReasons && conflict.unavailableReasons.length > 0 && (
            <div className="mt-3 space-y-1">
              {conflict.unavailableReasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                  <X className="w-3.5 h-3.5" />
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConflictHeader({ conflict }: { conflict: ConflictRecord }) {
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="page-title">冲突修正</h1>
            <StatusBadge status={conflict.status} />
            <Chip variant="info" size="sm">
              {conflict.id}
            </Chip>
          </div>
          <div className="text-sm text-audit-500 space-y-1">
            <div>
              订单号 <span className="font-mono text-audit-700">{conflict.orderNo}</span> · 幂等键{' '}
              <span className="font-mono text-audit-700">{conflict.idempotentKey.slice(0, 40)}...</span>
            </div>
            <div>
              迁移任务：<span className="text-audit-700">{conflict.migrationTaskName}</span> · 创建于{' '}
              {formatDateTime(conflict.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conflict.tags.map((t) => (
            <Chip key={t} variant="outline" size="sm">
              {t}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrategyRadio({
  value,
  onChange,
}: {
  value: ResolveStrategy;
  onChange: (v: ResolveStrategy) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="section-title flex items-center gap-2">
        <FileText className="w-4 h-4 text-audit-500" />
        修正策略
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STRATEGIES.map((s) => {
          const checked = value === s.key;
          const Icon = s.icon;
          return (
            <label
              key={s.key}
              className={cn(
                'relative block cursor-pointer rounded-lg border-2 p-4 transition-all',
                checked
                  ? 'border-audit-600 bg-audit-50/60 shadow-sm'
                  : 'border-audit-100 bg-white hover:border-audit-300'
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name="strategy"
                value={s.key}
                checked={checked}
                onChange={() => onChange(s.key)}
              />
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0',
                    s.accent
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-audit-800 text-sm">{s.label}</span>
                    <Chip variant={checked ? 'primary' : 'default'} size="sm">
                      {checked ? '已选' : '备选'}
                    </Chip>
                  </div>
                  <p className="text-xs text-audit-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
              {checked && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-audit-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function FormSection({
  strategy,
  setStrategy,
  remark,
  setRemark,
  withBackup,
  setWithBackup,
  backupScope,
  setBackupScope,
}: {
  strategy: ResolveStrategy;
  setStrategy: (v: ResolveStrategy) => void;
  remark: string;
  setRemark: (v: string) => void;
  withBackup: boolean;
  setWithBackup: (v: boolean) => void;
  backupScope: BackupScope;
  setBackupScope: (v: BackupScope) => void;
}) {
  return (
    <div className="card p-5 mb-6">
      <div className="space-y-6">
        <StrategyRadio value={strategy} onChange={setStrategy} />

        <div className="space-y-2">
          <h2 className="section-title flex items-center gap-2">
            <Info className="w-4 h-4 text-audit-500" />
            修正说明 <span className="text-danger-500">*</span>
          </h2>
          <textarea
            className="input min-h-[100px] resize-y"
            placeholder="请详细描述修正原因、影响范围、后续跟进事项……"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
          <div className="text-[11px] text-audit-400 text-right">
            {remark.length}/500，详细说明便于后续审计追溯
          </div>
        </div>

        <div className="border-t border-audit-100 pt-5 space-y-4">
          <h2 className="section-title flex items-center gap-2">
            <Database className="w-4 h-4 text-audit-500" />
            备份与回滚配置
          </h2>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-audit-300 text-audit-600 focus:ring-audit-500"
              checked={withBackup}
              onChange={(e) => setWithBackup(e.target.checked)}
            />
            <div>
              <div className="text-sm font-medium text-audit-700 group-hover:text-audit-900">
                同步创建备份补录记录
              </div>
              <div className="text-xs text-audit-500 mt-0.5">
                勾选后，系统将在修正前写入一条数据备份，并生成对应的回滚记录支持随时还原
              </div>
            </div>
          </label>

          {withBackup && (
            <div className="space-y-3 ml-7 pl-4 border-l-2 border-audit-100">
              <div className="text-xs font-semibold text-audit-500 uppercase tracking-wider">
                备份范围
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {BACKUP_SCOPES.map((s) => {
                  const checked = backupScope === s.key;
                  return (
                    <label
                      key={s.key}
                      className={cn(
                        'block cursor-pointer rounded-md border p-3 transition-all',
                        checked
                          ? 'border-audit-500 bg-audit-50 ring-1 ring-audit-500/30'
                          : 'border-audit-200 bg-white hover:border-audit-300'
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="backupScope"
                        value={s.key}
                        checked={checked}
                        onChange={() => setBackupScope(s.key)}
                      />
                      <div className="flex items-center gap-2 mb-1">
                        {checked ? (
                          <CheckCircle2 className="w-4 h-4 text-audit-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-audit-300" />
                        )}
                        <span className="text-sm font-semibold text-audit-800">{s.label}</span>
                      </div>
                      <div className="text-xs text-audit-500 ml-6">{s.desc}</div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BackupPreview({
  conflict,
  withBackup,
  backupScope,
  strategy,
}: {
  conflict: ConflictRecord;
  withBackup: boolean;
  backupScope: BackupScope;
  strategy: ResolveStrategy;
}) {
  const meta = getStrategyMeta(strategy);
  const backupFields = useMemo(() => {
    const base = [
      { key: 'orderNo', label: '订单号', value: conflict.orderNo },
      { key: 'snapshotBeforeId', label: '前快照ID', value: conflict.snapshotBeforeId },
      { key: 'snapshotAfterId', label: '后快照ID', value: conflict.snapshotAfterId },
      { key: 'originalStatus', label: '原始状态', value: conflict.status },
      { key: 'strategy', label: '修正策略', value: meta.label },
    ];
    if (backupScope === 'full_row') {
      base.push(
        { key: 'migrationTaskId', label: '迁移任务ID', value: conflict.migrationTaskId },
        { key: 'duplicateAttempts', label: '重试次数', value: String(conflict.duplicateAttempts) },
        { key: 'firstExecuteTime', label: '首次执行', value: formatDateTime(conflict.firstExecuteTime) }
      );
    }
    return base;
  }, [conflict, backupScope, meta]);

  const scopeLabel = BACKUP_SCOPES.find((s) => s.key === backupScope)?.label ?? backupScope;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2">
          <Database className="w-4 h-4 text-audit-500" />
          备份补录预览
        </h2>
        <div className="flex items-center gap-2">
          <Chip variant={withBackup ? 'success' : 'default'} size="sm">
            {withBackup ? '将创建备份' : '跳过备份'}
          </Chip>
          {withBackup && (
            <Chip variant="info" size="sm">
              范围：{scopeLabel}
            </Chip>
          )}
        </div>
      </div>

      {!withBackup ? (
        <div className="text-sm text-audit-500 py-4 text-center">
          未勾选"同步备份补录"，将跳过备份记录创建，仅生成回滚占位记录
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {backupFields.map((f) => (
              <div key={f.key} className="bg-audit-50/60 rounded-md p-3 border border-audit-100">
                <div className="text-[11px] font-semibold text-audit-400 uppercase tracking-wider mb-1">
                  {f.label}
                </div>
                <div className="text-sm text-audit-700 font-mono break-all">{f.value}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-audit-400 border-t border-audit-100 pt-2">
            共 {backupFields.length} 个字段将写入备份表，备份数据将保留原始值供审计与回滚使用
          </div>
        </div>
      )}
    </div>
  );
}

function RollbackPreview({
  conflict,
  strategy,
}: {
  conflict: ConflictRecord;
  strategy: ResolveStrategy;
}) {
  const meta = getStrategyMeta(strategy);
  const rollbacks = [
    {
      field: 'status',
      before: conflict.status,
      after: 'resolved',
      note: '冲突主状态流转',
    },
    {
      field: 'assignee',
      before: conflict.assignee ?? '(未分配)',
      after: useAppStore.getState().currentUser.id,
      note: '处理人标记',
    },
    {
      field: 'resolveInfo.strategy',
      before: '(无)',
      after: meta.label,
      note: '修正策略记录',
    },
    {
      field: 'updatedAt',
      before: formatDateTime(conflict.updatedAt),
      after: '系统时间',
      note: '更新时间戳',
    },
  ];

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-audit-500" />
          回滚记录预览
        </h2>
        <Chip variant="info" size="sm">
          字段级还原
        </Chip>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-52">字段</th>
              <th>Before（还原值）</th>
              <th className="w-10 text-center">→</th>
              <th>After（当前值）</th>
              <th className="w-48">说明</th>
            </tr>
          </thead>
          <tbody>
            {rollbacks.map((r) => (
              <tr key={r.field}>
                <td className="font-mono text-xs text-audit-600">{r.field}</td>
                <td>
                  <span className="inline-block max-w-full px-2 py-1 rounded bg-danger-50 text-danger-700 text-xs font-mono border border-danger-200 truncate">
                    {String(r.before)}
                  </span>
                </td>
                <td className="text-center text-audit-400">
                  <ArrowRight className="w-4 h-4 mx-auto" />
                </td>
                <td>
                  <span className="inline-block max-w-full px-2 py-1 rounded bg-success-50 text-success-700 text-xs font-mono border border-success-200 truncate">
                    {String(r.after)}
                  </span>
                </td>
                <td className="text-xs text-audit-500">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-audit-400 mt-3">
        回滚记录将与备份补录关联，后续可通过回滚功能将各字段恢复至 Before 状态
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflict: ConflictRecord;
  strategy: ResolveStrategy;
  remark: string;
  withBackup: boolean;
  backupScope: BackupScope;
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  conflict,
  strategy,
  remark,
  withBackup,
  backupScope,
}: ConfirmModalProps) {
  const [checked, setChecked] = useState(false);
  const strategyMeta = getStrategyMeta(strategy);
  const scopeLabel = BACKUP_SCOPES.find((s) => s.key === backupScope)?.label ?? backupScope;
  const user = useAppStore((s) => s.currentUser);

  useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-audit-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden animate-fade-in-up">
        <div className="card flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-audit-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-audit-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-audit-600" />
                二次确认：提交冲突修正
              </h2>
              <p className="text-xs text-audit-500 mt-1">
                请仔细核对以下信息，确认后将执行不可逆的联动操作
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost !p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-audit-50/60 rounded-lg border border-audit-100 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-audit-100">
                  <FileText className="w-4 h-4 text-audit-500" />
                  <span className="text-sm font-semibold text-audit-700">操作摘要</span>
                </div>
                <dl className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-audit-500">冲突ID</dt>
                    <dd className="font-mono text-audit-700">{conflict.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-audit-500">订单号</dt>
                    <dd className="font-mono text-audit-700">{conflict.orderNo}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-audit-500">修正策略</dt>
                    <dd>
                      <Chip variant="primary" size="sm">
                        {strategyMeta.label}
                      </Chip>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-audit-500">同步备份</dt>
                    <dd className="text-audit-700">
                      {withBackup ? `是（${scopeLabel}）` : '否'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-audit-500">生成回滚</dt>
                    <dd className="text-audit-700">是（必选）</dd>
                  </div>
                  <div className="pt-2 border-t border-audit-100">
                    <dt className="text-audit-500 mb-1">修正说明</dt>
                    <dd className="text-audit-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                      {remark || <span className="text-danger-500">（未填写）</span>}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-audit-50/60 rounded-lg border border-audit-100 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-audit-100">
                  <Eye className="w-4 h-4 text-audit-500" />
                  <span className="text-sm font-semibold text-audit-700">影响预览</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-md border border-audit-100 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-3.5 h-3.5 text-info-500" />
                      <span className="text-xs font-semibold text-audit-700">备份补录</span>
                      <Chip variant={withBackup ? 'success' : 'warning'} size="sm">
                        {withBackup ? '+1条' : '跳过'}
                      </Chip>
                    </div>
                    <p className="text-[11px] text-audit-500 leading-relaxed">
                      {withBackup
                        ? `将按「${scopeLabel}」写入备份表，保留冲突修正前的完整数据。`
                        : '未启用备份，数据还原将依赖手动恢复。'}
                    </p>
                  </div>
                  <div className="bg-white rounded-md border border-audit-100 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className="w-3.5 h-3.5 text-success-500" />
                      <span className="text-xs font-semibold text-audit-700">回滚记录</span>
                      <Chip variant="success" size="sm">
                        +1条（4字段）
                      </Chip>
                    </div>
                    <p className="text-[11px] text-audit-500 leading-relaxed">
                      生成可恢复的字段级回滚入口，支持一键还原至修正前状态。
                    </p>
                  </div>
                  <div className="bg-white rounded-md border border-audit-100 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="w-3.5 h-3.5 text-audit-500" />
                      <span className="text-xs font-semibold text-audit-700">联动关系</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-audit-500">
                      <span>备份记录</span>
                      <ArrowRight className="w-3.5 h-3.5 text-audit-300" />
                      <span>回滚记录</span>
                      <ArrowRight className="w-3.5 h-3.5 text-audit-300" />
                      <span>冲突主记录</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-audit-50/60 rounded-lg border border-audit-100 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-audit-100">
                  <ShieldCheck className="w-4 h-4 text-audit-500" />
                  <span className="text-sm font-semibold text-audit-700">权限校验链</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-audit-200 flex items-center justify-center text-audit-700 font-bold text-sm">
                      {user.displayName.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-audit-700 truncate">
                        {user.displayName}
                      </div>
                      <div className="text-[11px] text-audit-500">{user.username}</div>
                    </div>
                    <UserCheck className="w-4 h-4 text-success-500" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-audit-500 uppercase tracking-wider">
                      关联角色
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.roleIds.map((rid) => (
                        <Chip key={rid} variant="outline" size="sm">
                          {rid}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-audit-500 uppercase tracking-wider">
                      权限快照（将封存）
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['conflict:resolve', 'backup:create', 'rollback:update', 'history:view'].map(
                        (p) => (
                          <Chip
                            key={p}
                            variant={
                              user.effectivePermissions.includes(p as never)
                                ? 'success'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {p}
                          </Chip>
                        )
                      )}
                    </div>
                  </div>
                  <div className="bg-success-50 border border-success-200 rounded-md p-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-success-700">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      权限校验通过，将生成唯一 permissionSnapshotId 用于审计追溯
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-audit-100 p-4 bg-audit-50/40">
            <label className="flex items-start gap-3 cursor-pointer mb-4 p-3 rounded-lg border-2 border-dashed border-audit-200 hover:border-audit-400 bg-white transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-audit-300 text-audit-600 focus:ring-audit-500"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <div className="text-sm text-audit-700 leading-relaxed">
                <span className="font-semibold">
                  我已知晓备份补录与回滚记录将联动更新
                </span>
                <span className="text-audit-500">
                  ，并确认上述修正策略、说明内容准确无误。我了解该操作将作为审计记录永久保留。
                </span>
              </div>
            </label>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                取消
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!checked || !remark.trim()}
                className={cn(
                  'btn-primary',
                  (!checked || !remark.trim()) &&
                    'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none'
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                确认提交
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  onViewDetail,
  onBackToList,
}: {
  result: ResolveResult;
  onViewDetail: () => void;
  onBackToList: () => void;
}) {
  const copy = (v: string) => {
    navigator.clipboard.writeText(v).catch(() => {});
  };

  const rows: Array<{ key: keyof ResolveResult; label: string; icon: typeof FileText }> = [
    { key: 'resolveInfoId', label: '修正信息ID', icon: FileText },
    { key: 'backupRecordId', label: '备份记录ID', icon: Database },
    { key: 'rollbackRecordId', label: '回滚记录ID', icon: RotateCcw },
    { key: 'operationLogId', label: '操作日志ID', icon: Clock },
    { key: 'permissionSnapshotId', label: '权限快照ID', icon: ShieldCheck },
  ];

  return (
    <div className="card overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-success-500 to-success-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">冲突修正已完成</h2>
            <p className="text-sm text-white/80">
              冲突 {result.conflictId} 已流转至「已处理」，共生成 5 条关联审计记录
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {rows.map((r) => {
            const Icon = r.icon;
            const v = result[r.key];
            return (
              <div
                key={r.key}
                className="flex items-center gap-3 bg-audit-50/60 rounded-lg border border-audit-100 p-3 group hover:border-audit-300 transition-colors"
              >
                <div className="w-9 h-9 rounded-md bg-white border border-audit-200 flex items-center justify-center flex-shrink-0 text-audit-500">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-audit-400 uppercase tracking-wider mb-0.5">
                    {r.label}
                  </div>
                  <div className="text-xs font-mono text-audit-700 truncate" title={v}>
                    {v}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(v)}
                  className="p-1.5 rounded text-audit-400 hover:text-audit-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
                  title="复制ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onBackToList} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
          <button type="button" onClick={onViewDetail} className="btn-primary">
            <Eye className="w-4 h-4" />
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResolveConflict() {
  const { conflictId } = useParams<{ conflictId: string }>();
  const navigate = useNavigate();
  const { resolveProgress, setResolveStep, resetResolveProgress } = useAppStore();

  const [conflict, setConflict] = useState<ConflictRecord | undefined>();
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<ResolveStrategy>('skip');
  const [remark, setRemark] = useState('');
  const [withBackup, setWithBackup] = useState(true);
  const [backupScope, setBackupScope] = useState<BackupScope>('changed_fields');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conflictId) return;
    setLoading(true);
    setTimeout(() => {
      const c = ConflictService.get(conflictId);
      setConflict(c);
      setLoading(false);
    }, 200);
    return () => resetResolveProgress();
  }, [conflictId, resetResolveProgress]);

  const canResolve = conflict && conflict.status !== 'resolved' && conflict.status !== 'unavailable';

  const runSteps = async (): Promise<ResolveResult> => {
    const steps: ResolveStep[] = ['permit', 'backup', 'rollback', 'done'];
    setResolveStep('permit', 'active');
    let result: ResolveResult | null = null;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i] === 'done') {
        if (!result) throw new Error('缺少 resolve 结果');
        await new Promise((r) => setTimeout(r, 600));
        setResolveStep('done', 'active');
        await new Promise((r) => setTimeout(r, 400));
        setResolveStep('done', 'completed');
        return result;
      }
      setResolveStep(steps[i], 'active');
      await new Promise((r) => setTimeout(r, 500));
      if (steps[i] === 'permit') {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (steps[i] === 'backup' && !withBackup) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (steps[i] === 'rollback') {
        result = await ResolveService.resolve(
          conflictId!,
          strategy,
          remark,
          withBackup
        );
      }
      setResolveStep(steps[i], 'completed');
    }
    if (!result) throw new Error('未生成 resolve 结果');
    return result;
  };

  const handleSubmit = async () => {
    if (!canResolve || submitting) return;
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    try {
      const r = await runSteps();
      setResult(r);
      const updated = ConflictService.get(conflictId!);
      if (updated) setConflict(updated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误';
      setError(msg);
      const curStep = resolveProgress.step as ResolveStep;
      setResolveStep(curStep, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-audit-500 animate-spin" />
      </div>
    );
  }

  if (!conflict) {
    return (
      <div className="card p-10">
        <div className="text-center text-audit-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-danger-400" />
          <div className="font-semibold text-audit-700 mb-1">冲突记录不存在</div>
          <div className="text-sm">ID = {conflictId}</div>
        </div>
      </div>
    );
  }

  const statusValid = resolveProgress.status === 'completed' && resolveProgress.step === 'done';

  return (
    <div className="space-y-0">
      <ConflictHeader conflict={conflict} />

      {!canResolve && <WarningBanner conflict={conflict} />}

      {result && statusValid ? (
        <ResultCard
          result={result}
          onViewDetail={() => navigate(`/conflict/${conflict.id}`)}
          onBackToList={() => navigate('/')}
        />
      ) : (
        <>
          <ProgressBar />

          {error && (
            <div className="card mb-6 border-danger-300 bg-danger-50/60 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-danger-800 mb-0.5">提交失败</div>
                <div className="text-sm text-danger-700">{error}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  resetResolveProgress();
                }}
                className="btn-secondary !py-1 !px-3 text-xs"
              >
                重置
              </button>
            </div>
          )}

          {canResolve ? (
            <>
              <FormSection
                strategy={strategy}
                setStrategy={setStrategy}
                remark={remark}
                setRemark={setRemark}
                withBackup={withBackup}
                setWithBackup={setWithBackup}
                backupScope={backupScope}
                setBackupScope={setBackupScope}
              />
              <BackupPreview
                conflict={conflict}
                withBackup={withBackup}
                backupScope={backupScope}
                strategy={strategy}
              />
              <RollbackPreview conflict={conflict} strategy={strategy} />

              <div className="flex items-center justify-end gap-2 pb-8">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  <ArrowLeft className="w-4 h-4" />
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitting || !remark.trim()}
                  className={cn(
                    'btn-primary',
                    (submitting || !remark.trim()) &&
                      'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none'
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {submitting ? '提交中…' : '提交修正'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-end gap-2 pb-8">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>
              <button
                type="button"
                onClick={() => navigate(`/conflict/${conflict.id}`)}
                className="btn-primary"
              >
                <Eye className="w-4 h-4" />
                查看详情
              </button>
            </div>
          )}

          <ConfirmModal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleSubmit}
            conflict={conflict}
            strategy={strategy}
            remark={remark}
            withBackup={withBackup}
            backupScope={backupScope}
          />
        </>
      )}
    </div>
  );
}
