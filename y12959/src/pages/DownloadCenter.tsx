import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Filter,
  Eye,
  Calendar,
  Shield,
  Database,
  BarChart3,
  BookOpen,
  HardDriveDownload,
  Settings2,
  ChevronRight,
  AlertTriangle,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { ExportService } from '@/services/ExportService';
import { ConflictService } from '@/services/ConflictService';
import { useAppStore } from '@/store/useAppStore';
import EmptyState from '@/components/EmptyState';
import Chip from '@/components/Chip';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative, formatDate } from '@/utils/format';
import type { ExportFormat, ExportScope, ExportJob } from '@/types';

const FORMAT_META: Record<ExportFormat, {
  label: string;
  ext: string;
  Icon: typeof FileText;
  color: string;
  bgClass: string;
  desc: string;
}> = {
  pdf: {
    label: 'PDF 报告',
    ext: '.pdf',
    Icon: FileText,
    color: '#DC2626',
    bgClass: 'bg-danger-50 border-danger-200 text-danger-700',
    desc: '包含完整图表、解释、审计链的正式文档，适合打印和邮件转交',
  },
  xlsx: {
    label: 'Excel 表格',
    ext: '.xlsx',
    Icon: FileSpreadsheet,
    color: '#059669',
    bgClass: 'bg-success-50 border-success-200 text-success-700',
    desc: '多 sheet 工作簿，含明细表、原始数据，适合数据人员二次分析',
  },
  csv: {
    label: 'CSV 数据',
    ext: '.csv',
    Icon: FileJson,
    color: '#2563EB',
    bgClass: 'bg-info-50 border-info-200 text-info-700',
    desc: '纯文本逗号分隔，兼容各种 ETL 工具和数据库导入',
  },
};

const SCOPE_META: Record<ExportScope, {
  label: string;
  description: string;
  Icon: typeof Filter;
}> = {
  current_filter: {
    label: '当前筛选结果',
    description: '仅导出冲突列表页当前激活的筛选条件命中的记录',
    Icon: Filter,
  },
  all: {
    label: '全部记录',
    description: '导出系统中所有冲突记录（不建议，文件会很大）',
    Icon: Database,
  },
  single: {
    label: '单条记录详解',
    description: '导出指定 conflictId 的完整详情、快照、轨迹、审计链',
    Icon: FileText,
  },
};

const STATUS_META: Record<ExportJob['status'], {
  label: string;
  Icon: typeof Clock;
  color: string;
  bgClass: string;
  description: string;
}> = {
  queued: {
    label: '排队中',
    Icon: Clock,
    color: '#64748B',
    bgClass: 'bg-slate-100 text-slate-600 border-slate-200',
    description: '导出任务已提交，等待处理资源',
  },
  generating: {
    label: '生成中',
    Icon: Loader2,
    color: '#6366F1',
    bgClass: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    description: '正在组装数据、渲染图表、生成文档',
  },
  done: {
    label: '已完成',
    Icon: CheckCircle2,
    color: '#059669',
    bgClass: 'bg-success-50 text-success-600 border-success-200',
    description: '文件已生成，可随时下载',
  },
  failed: {
    label: '生成失败',
    Icon: XCircle,
    color: '#DC2626',
    bgClass: 'bg-danger-50 text-danger-600 border-danger-200',
    description: '导出过程出错，请调整参数后重试',
  },
};

interface IncludeOptions {
  explanations: boolean;
  charts: boolean;
  snapshots: boolean;
  auditSummary: boolean;
}

export default function DownloadCenter() {
  const navigate = useNavigate();
  const { currentUser, setExplanationContext } = useAppStore();
  const [tick, setTick] = useState(0);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [scope, setScope] = useState<ExportScope>('current_filter');
  const [singleConflictId, setSingleConflictId] = useState('');
  const [includes, setIncludes] = useState<IncludeOptions>({
    explanations: true,
    charts: true,
    snapshots: true,
    auditSummary: true,
  });
  const [conflictsCount, setConflictsCount] = useState<number | null>(null);

  useEffect(() => {
    const all = ConflictService.list({ pageSize: 10000 });
    setConflictsCount(all.total);
  }, []);

  const reloadJobs = () => {
    setJobs(ExportService.listJobs());
    setTick((t) => t + 1);
  };

  useEffect(() => {
    reloadJobs();
    const timer = setInterval(() => {
      setJobs(ExportService.listJobs());
    }, 1500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreateExport = useMemo(() => {
    if (!currentUser.effectivePermissions.includes('export:run')) return false;
    if (scope === 'single' && !singleConflictId.trim()) return false;
    return true;
  }, [currentUser, scope, singleConflictId]);

  const createExport = () => {
    if (!canCreateExport) return;
    const job = ExportService.createJob({
      format,
      scope,
      singleConflictId: scope === 'single' ? singleConflictId.trim() : undefined,
      includeExplanations: includes.explanations,
      includeCharts: includes.charts,
      includeSnapshots: includes.snapshots,
      includeAuditSummary: includes.auditSummary,
      createdBy: currentUser.id,
    });
    reloadJobs();
    setExplanationContext('chart_hover', {
      chart_hover: {
        metricName: `新建导出任务 [${format.toUpperCase()}]`,
        value: job.fileName,
        timestamp: job.createdAt,
      },
    });
  };

  const handleDownload = (jobId: string) => {
    const name = ExportService.generateMockDownload(jobId);
    if (name) {
      setCopiedId(jobId);
      setTimeout(() => setCopiedId(null), 1200);
      reloadJobs();
    }
  };

  const toggleInclude = (key: keyof IncludeOptions) => {
    setIncludes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalEstimatedRecords = useMemo(() => {
    if (scope === 'single') return 1;
    if (scope === 'all') return conflictsCount ?? 0;
    return Math.max(1, Math.floor((conflictsCount ?? 0) * 0.35));
  }, [scope, conflictsCount]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HardDriveDownload className="h-7 w-7 text-audit-600" />
            下载中心
          </h1>
          <p className="mt-1.5 text-sm text-audit-500 leading-relaxed">
            导出包含明细解释的冲突报告，业务同事不登录系统也能看懂为什么迁移重复执行被拦、哪些记录不可用。
          </p>
        </div>
        <button
          type="button"
          onClick={reloadJobs}
          className="btn-secondary"
          title="刷新列表"
        >
          <RefreshCw className={cn('h-4 w-4', tick > 0 && 'animate-spin')} />
          刷新
        </button>
      </div>

      {!currentUser.effectivePermissions.includes('export:run') && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-amber-800">权限受限</div>
              <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                当前账号【{currentUser.displayName}】没有 <code className="rounded bg-amber-100 px-1">export:run</code> 权限，
                仅可查看历史导出记录。请联系管理员申请临时授权或通过审计只读账号下载归档文件。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-audit-600" />
              导出配置
            </h2>
            <Chip variant="outline" size="sm">
              {currentUser.username}
            </Chip>
          </div>

          <div className="space-y-5">
            <div>
              <div className="label">1. 选择文件格式</div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FORMAT_META) as ExportFormat[]).map((f) => {
                  const meta = FORMAT_META[f];
                  const active = format === f;
                  const { Icon } = meta;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      onMouseEnter={() =>
                        setExplanationContext('chart_hover', {
                          chart_hover: {
                            metricName: `导出格式：${meta.label}`,
                            value: meta.ext,
                            breakdown: {
                              说明: meta.desc.length,
                            } as Record<string, number>,
                          },
                        })
                      }
                      onMouseLeave={() => setExplanationContext(null, null)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-md border-2 px-3 py-3 text-xs font-medium transition-all',
                        active
                          ? 'border-audit-700 bg-audit-700 text-white shadow-sm'
                          : 'border-audit-100 bg-audit-50/40 text-audit-600 hover:border-audit-300 hover:bg-white'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', active ? 'text-white' : '')} style={{ color: active ? undefined : meta.color }} />
                      <span>{meta.label}</span>
                      <span className={cn('text-[10px] opacity-70', active ? 'text-white' : '')}>
                        {meta.ext}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-audit-500">{FORMAT_META[format].desc}</p>
            </div>

            <div>
              <div className="label">2. 选择导出范围</div>
              <div className="space-y-2">
                {(Object.keys(SCOPE_META) as ExportScope[]).map((s) => {
                  const meta = SCOPE_META[s];
                  const active = scope === s;
                  const { Icon } = meta;
                  return (
                    <label
                      key={s}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 transition-all',
                        active
                          ? 'border-audit-500 bg-audit-50/60 shadow-inner-sm'
                          : 'border-audit-100 bg-white hover:border-audit-200 hover:bg-audit-50/30'
                      )}
                    >
                      <input
                        type="radio"
                        name="export_scope"
                        value={s}
                        checked={active}
                        onChange={() => setScope(s)}
                        className="mt-1 h-4 w-4 accent-audit-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-audit-500" />
                          <span className="text-sm font-semibold text-audit-800">
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-audit-500 leading-relaxed">
                          {meta.description}
                        </p>
                        {s === 'single' && active && (
                          <input
                            type="text"
                            value={singleConflictId}
                            onChange={(e) => setSingleConflictId(e.target.value)}
                            placeholder="请输入冲突记录 ID，例如 conf_0001"
                            className="mt-2 input font-mono text-xs"
                          />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="label flex items-center justify-between">
                <span>3. 包含内容</span>
                <span className="text-[10px] font-normal text-audit-400 normal-case">
                  报告自带详细解释，不靠颜色
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { k: 'explanations' as const, label: '明细解释', Icon: BookOpen, desc: '图表、原因、建议文字说明' },
                  { k: 'charts' as const, label: '统计图表', Icon: BarChart3, desc: '趋势、分布、Top榜附数据表' },
                  { k: 'snapshots' as const, label: '表结构快照', Icon: Database, desc: '字段差异+影响说明' },
                  { k: 'auditSummary' as const, label: '权限审计摘要', Icon: Shield, desc: '操作人+权限快照+统计' },
                ]).map(({ k, label, Icon, desc }) => {
                  const on = includes[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleInclude(k)}
                      className={cn(
                        'flex items-start gap-2 rounded-md border-2 p-2.5 text-left transition-all',
                        on
                          ? 'border-success-400 bg-success-50'
                          : 'border-audit-100 bg-white hover:border-audit-200'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                          on
                            ? 'border-success-500 bg-success-500 text-white'
                            : 'border-audit-300 bg-white text-transparent'
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Icon className="h-3.5 w-3.5 text-audit-500" />
                          <span className="text-xs font-semibold text-audit-800">{label}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-audit-500">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-audit-200 bg-gradient-to-br from-audit-50 to-white p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-audit-600">
                <Info className="h-3.5 w-3.5" />
                导出报告内容估算
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-audit-500">覆盖记录数</span>
                  <span className="font-mono font-semibold text-audit-800">
                    {totalEstimatedRecords} 条
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-audit-500">包含章节</span>
                  <span className="font-mono font-semibold text-audit-800">
                    {Object.values(includes).filter(Boolean).length + 2}/9
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-audit-500">预计页数</span>
                  <span className="font-mono font-semibold text-audit-800">
                    ≈ {Math.max(3, Math.ceil(totalEstimatedRecords / 8) * (includes.charts ? 2 : 1))} 页
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-audit-500">文件大小</span>
                  <span className="font-mono font-semibold text-audit-800">
                    ≈ {Math.max(80, totalEstimatedRecords * 12)}{' '}
                    {format === 'pdf' ? 'KB' : format === 'xlsx' ? 'KB' : 'KB'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={createExport}
              disabled={!canCreateExport}
              className={cn(
                'btn-primary w-full justify-center',
                !canCreateExport && 'cursor-not-allowed opacity-60'
              )}
            >
              <HardDriveDownload className="h-4 w-4" />
              生成{FORMAT_META[format].label}
            </button>
            {!canCreateExport && scope === 'single' && !singleConflictId.trim() && (
              <p className="text-center text-xs text-danger-500">
                选择"单条记录详解"时必须输入冲突记录 ID
              </p>
            )}
          </div>
        </section>

        <section className="card p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <Clock className="h-4 w-4 text-audit-600" />
              导出历史
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-audit-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>共 {jobs.length} 个任务</span>
            </div>
          </div>

          {jobs.length === 0 ? (
            <EmptyState
              variant="empty-folder"
              title="暂无导出任务"
              description="在左侧配置导出参数并点击生成，此处将显示所有历史导出记录。"
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-audit-100">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>文件</th>
                    <th>范围 / 记录数</th>
                    <th>包含内容</th>
                    <th>状态</th>
                    <th>创建人 · 时间</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const fmt = FORMAT_META[job.format];
                    const st = STATUS_META[job.status];
                    const StatusIcon = st.Icon;
                    const FormatIcon = fmt.Icon;
                    return (
                      <tr key={job.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
                                fmt.bgClass
                              )}
                            >
                              <FormatIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="truncate font-mono text-xs font-semibold text-audit-800 max-w-[180px]"
                                  title={job.fileName}
                                >
                                  {job.fileName}
                                </span>
                                <Chip variant="outline" size="sm">
                                  {fmt.ext}
                                </Chip>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-audit-400">
                                <span className="font-mono">{job.id}</span>
                                {job.fileSizeKb !== undefined && (
                                  <span>
                                    {(job.fileSizeKb / 1024).toFixed(1)} MB
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-xs text-audit-700">
                            {SCOPE_META[job.scope].label}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-audit-500">
                            <Database className="h-3 w-3" />
                            {job.singleConflictId ? (
                              <span className="font-mono">{job.singleConflictId}</span>
                            ) : (
                              <span>
                                按筛选导出{' '}
                                {job.filterCriteria && Object.keys(job.filterCriteria).length > 0
                                  ? `（${Object.keys(job.filterCriteria).length} 条件）`
                                  : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {job.includeExplanations && (
                              <Chip size="sm" variant="info" className="text-[10px]">
                                明细解释
                              </Chip>
                            )}
                            {job.includeCharts && (
                              <Chip size="sm" variant="primary" className="text-[10px]">
                                图表
                              </Chip>
                            )}
                            {job.includeSnapshots && (
                              <Chip size="sm" variant="warning" className="text-[10px]">
                                快照
                              </Chip>
                            )}
                            {job.includeAuditSummary && (
                              <Chip size="sm" variant="success" className="text-[10px]">
                                审计
                              </Chip>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                                st.bgClass
                              )}
                            >
                              <StatusIcon
                                className={cn(
                                  'h-3 w-3',
                                  job.status === 'generating' && 'animate-spin'
                                )}
                              />
                              {st.label}
                            </span>
                            {job.downloadCount > 0 && (
                              <span className="text-[10px] text-audit-400">
                                ↓{job.downloadCount}
                              </span>
                            )}
                          </div>
                          {job.status === 'done' && job.completedAt && (
                            <div className="mt-1 text-[10px] text-audit-400">
                              完成于 {formatRelative(job.completedAt)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-xs text-audit-700">{job.createdBy}</div>
                          <div className="mt-0.5 text-[11px] text-audit-400">
                            {formatRelative(job.createdAt)}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="btn-ghost !h-8 !px-2 text-xs"
                              title="查看参数详情"
                              onClick={() =>
                                setExplanationContext('chart_hover', {
                                  chart_hover: {
                                    metricName: `导出任务：${job.fileName}`,
                                    value: job.status,
                                    timestamp: job.createdAt,
                                    breakdown: {
                                      格式: Object.keys(FORMAT_META).indexOf(job.format) + 1,
                                      范围: Object.keys(SCOPE_META).indexOf(job.scope) + 1,
                                      下载次数: job.downloadCount,
                                    } as Record<string, number>,
                                  },
                                })
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {job.status === 'done' && (
                              <button
                                type="button"
                                onClick={() => handleDownload(job.id)}
                                className="btn-primary !h-8 !px-3 text-xs"
                              >
                                {copiedId === job.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    已触发
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-3.5 w-3.5" />
                                    下载
                                  </>
                                )}
                              </button>
                            )}
                            {job.status === 'failed' && (
                              <button
                                type="button"
                                onClick={createExport}
                                className="btn-secondary !h-8 !px-3 text-xs"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                重试
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-info-200 bg-info-50/60 p-3">
            <div className="flex items-start gap-2 text-xs text-info-700">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-semibold">导出报告可读性承诺：</span>
                每章开头有"本页说明"，图表必有图例+数据明细表，冲突原因有文字解释，表结构快照附字段差异说明；
                业务同事即使不进系统，仅凭导出 PDF/Excel 也能明白
                <span className="mx-0.5 rounded bg-white px-1 font-semibold">迁移重复执行为什么被拦</span>
                和
                <span className="mx-0.5 rounded bg-white px-1 font-semibold">哪些记录不可用</span>。
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
