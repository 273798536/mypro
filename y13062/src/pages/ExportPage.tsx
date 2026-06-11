import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Archive,
  Filter,
  Tag,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/StatusBadge';
import { useTaskStore, anomalyTypeLabel, anomalyLevelLabel, anomalyStatusLabel } from '@/store/taskStore';
import { useWorkbenchStore } from '@/store/workbenchStore';
import { cn } from '@/lib/utils';
import { exportSummaryReport, exportAnomaliesXLSX, exportFullArchive } from '@/utils/exportUtils';

interface ExportType {
  id: 'summary' | 'detail' | 'full';
  label: string;
  desc: string;
  icon: typeof FileText;
  ext: string;
}

const EXPORT_TYPES: ExportType[] = [
  { id: 'summary', label: '异常摘要报告', desc: '仅含异常列表、筛选标记和计算口径', icon: FileText, ext: 'PDF' },
  { id: 'detail', label: '异常详情报告', desc: '含每处异常的完整详情、确认历史、关联材料', icon: FileSpreadsheet, ext: 'PDF+XLSX' },
  { id: 'full', label: '完整预审档案', desc: '含时间线、所有视角快照信息、全部图层清单', icon: Archive, ext: 'ZIP' },
];

export default function ExportPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const task = useTaskStore(s => s.getTask(taskId || ''));
  const initTask = useWorkbenchStore(s => s.initTask);
  const filterState = useWorkbenchStore(s => s.filterState);
  const anomalies = useWorkbenchStore(s => s.anomalies);
  const timeline = useWorkbenchStore(s => s.timeline);
  const exportRecords = useWorkbenchStore(s => s.exportRecords);
  const addExportRecord = useWorkbenchStore(s => s.addExportRecord);

  const [selected, setSelected] = useState<'summary' | 'detail' | 'full'>('detail');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedToast, setExportedToast] = useState(false);

  useEffect(() => {
    if (taskId) initTask(taskId);
  }, [taskId, initTask]);

  const filtered = useMemo(() => {
    const { types, levels, statuses, keyword } = filterState;
    return anomalies.filter(a => {
      if (types.length > 0 && !types.includes(a.type)) return false;
      if (levels.length > 0 && !levels.includes(a.level)) return false;
      if (statuses.length > 0 && !statuses.includes(a.status)) return false;
      if (keyword && !a.wellName.includes(keyword) && !a.wellId.includes(keyword)) return false;
      return true;
    });
  }, [anomalies, filterState]);

  const hasFilter =
    filterState.types.length > 0 ||
    filterState.levels.length > 0 ||
    filterState.statuses.length > 0 ||
    filterState.keyword.length > 0;

  const filterMark = [
    filterState.keyword && `关键词=${filterState.keyword}`,
    filterState.types.length > 0 && `类型=${filterState.types.map(t => anomalyTypeLabel[t]).join('/')}`,
    filterState.levels.length > 0 && `等级=${filterState.levels.map(l => anomalyLevelLabel[l]).join('/')}`,
    filterState.statuses.length > 0 && `状态=${filterState.statuses.map(s => anomalyStatusLabel[s]).join('/')}`,
  ].filter(Boolean).join(' · ');

  const handleExport = async () => {
    if (!task || exporting) return;
    setExporting(true);

    try {
      const mark = filterMark || '全部异常（无筛选）';

      switch (selected) {
        case 'summary':
          exportSummaryReport(filtered, task, filterState);
          break;
        case 'detail':
          exportAnomaliesXLSX(filtered, task, filterState);
          break;
        case 'full':
          await exportFullArchive(filtered, task, filterState, timeline);
          break;
      }

      addExportRecord({
        taskId: task.id,
        filterMark: mark,
        type: selected,
        anomalyCount: filtered.length,
        operator: '阿乔',
      });

      setExportedToast(true);
      setTimeout(() => setExportedToast(false), 3000);
    } finally {
      setExporting(false);
    }
  };

  const taskExports = exportRecords;

  const handleCopyMark = () => {
    navigator.clipboard?.writeText(filterMark || '（无筛选条件）');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!task) return null;

  return (
    <div className="min-h-screen bg-dark-900">
      <AppHeader />

      <main className="relative">
        <div className="grid-bg absolute inset-0 pointer-events-none opacity-30" />

        <div className="relative container max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-danger-500 to-warning flex items-center justify-center shadow-lg shadow-danger-900/30">
                <Download size={22} className="text-white" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-semibold text-primary-50 glow-text">
                  导出中心
                </h2>
                <p className="text-sm text-primary-300/70 mt-0.5">
                  筛选条件、异常标记、视角条件随报告一起保存 — 截图条件不再丢失
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 space-y-5">
              <div className="relative gradient-border rounded-2xl bg-dark-800/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-primary-700/30">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-primary-300" />
                    <h3 className="text-sm font-medium text-primary-100">当前筛选标记</h3>
                    {hasFilter && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-danger/20 text-danger border border-danger/40">
                        已启用筛选
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleCopyMark}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] text-primary-400 hover:text-primary-100 hover:bg-primary-700/20 transition"
                  >
                    {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copied ? '已复制' : '复制标记'}
                  </button>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <MiniStat label="匹配异常" value={filtered.length} color="text-primary-200" />
                    <MiniStat label="总数" value={anomalies.length} color="text-primary-400" />
                    <MiniStat
                      label="待确认"
                      value={filtered.filter(a => a.status === 'unconfirmed').length}
                      color="text-warning"
                    />
                    <MiniStat
                      label="确认异常"
                      value={filtered.filter(a => a.status === 'confirmed_abnormal').length}
                      color="text-danger"
                    />
                  </div>

                  <div className="rounded-lg bg-dark-900/60 border border-primary-700/30 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-primary-400/60 mb-2 flex items-center gap-1">
                      <Tag size={11} />
                      筛选条件描述（将随导出报告保存）
                    </p>
                    {filterMark ? (
                      <p className="text-sm text-primary-100 font-mono break-all leading-relaxed">
                        {filterMark}
                      </p>
                    ) : (
                      <p className="text-sm text-primary-400/70 italic">（未设置筛选条件，将导出全部）</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative gradient-border rounded-2xl bg-dark-800/50 backdrop-blur-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-primary-700/30">
                  <h3 className="text-sm font-medium text-primary-100 flex items-center gap-2">
                    <Download size={16} className="text-primary-300" />
                    选择导出格式
                  </h3>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {EXPORT_TYPES.map(t => {
                      const Icon = t.icon;
                      const active = selected === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelected(t.id)}
                          className={cn(
                            'text-left p-4 rounded-xl border transition relative overflow-hidden',
                            active
                              ? 'bg-primary-600/20 border-primary-500/50'
                              : 'bg-dark-900/40 border-primary-700/30 hover:border-primary-600/50',
                          )}
                        >
                          {active && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-success/20 border border-success/50 flex items-center justify-center">
                              <Check size={12} className="text-success" />
                            </div>
                          )}
                          <Icon
                            size={24}
                            className={cn('mb-3', active ? 'text-primary-200' : 'text-primary-400')}
                          />
                          <p className={cn('text-sm font-medium mb-1', active ? 'text-primary-100' : 'text-primary-200')}>
                            {t.label}
                          </p>
                          <p className="text-xs text-primary-400/70 mb-2 leading-relaxed">{t.desc}</p>
                          <p className="text-[10px] uppercase tracking-wider text-primary-500/80 font-mono">
                            {t.ext}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-lg bg-dark-900/40 border border-primary-700/20 p-4 mb-5">
                    <p className="text-[11px] uppercase tracking-wider text-primary-400/60 mb-2">导出内容预览</p>
                    <ul className="space-y-1.5 text-xs text-primary-200/90">
                      {selected === 'summary' && (
                        <>
                          <li>· 异常数量：{filtered.length} 条</li>
                          <li>· 计算口径：{task.calculationRule}</li>
                          <li>· 筛选标记：{filterMark || '（无）'}</li>
                          <li>· 操作人：阿乔</li>
                        </>
                      )}
                      {selected === 'detail' && (
                        <>
                          <li>· 含摘要全部内容</li>
                          <li>· 每条异常详情、坐标、冲突对象</li>
                          <li>· 人工确认历史与意见</li>
                          <li>· 关联CAD图层/材料清单</li>
                          <li>· 关联视角快照列表</li>
                        </>
                      )}
                      {selected === 'full' && (
                        <>
                          <li>· 含详情全部内容</li>
                          <li>· 完整历史时间线（{taskExports.length > 0 ? '已记录' : '待生成'}）</li>
                          <li>· CAD图层版本与补录说明</li>
                          <li>· 所有视角快照参数</li>
                          <li>· 历次导出记录</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium shadow-lg transition-all',
                      exporting
                        ? 'bg-primary-600/50 text-white/70 cursor-not-allowed shadow-primary-900/20'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-900/50 hover:from-primary-400 hover:to-primary-500',
                    )}
                  >
                    {exporting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        导出{EXPORT_TYPES.find(t => t.id === selected)?.label}
                        <span className="ml-1 text-xs opacity-80">
                          ({filtered.length} 条异常 · 带筛选标记)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-5">
              <div className="relative gradient-border rounded-2xl bg-dark-800/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-primary-700/30">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary-300" />
                    <h3 className="text-sm font-medium text-primary-100">历史导出记录</h3>
                  </div>
                  <span className="text-xs text-primary-400/70">{taskExports.length} 条</span>
                </div>

                <div className="divide-y divide-primary-700/20 max-h-[320px] overflow-y-auto">
                  {taskExports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-primary-500/60">
                      <Archive size={28} className="mb-2 opacity-40" />
                      <p className="text-xs">暂无导出记录</p>
                    </div>
                  ) : (
                    taskExports.map(rec => {
                      const typeInfo = EXPORT_TYPES.find(t => t.id === rec.type)!;
                      const Icon = typeInfo.icon;
                      return (
                        <div key={rec.id} className="px-5 py-3.5 hover:bg-primary-700/5 transition">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0">
                              <Icon size={16} className="text-primary-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm text-primary-100">{typeInfo.label}</p>
                                <ChevronRight size={14} className="text-primary-500 shrink-0" />
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-primary-400/70 mb-1.5">
                                <span>{rec.anomalyCount} 条异常</span>
                                <span>·</span>
                                <span className="flex items-center gap-1"><User size={10} />{rec.operator}</span>
                              </div>
                              <p className="text-[11px] text-primary-500/80 font-mono truncate leading-snug">
                                {rec.filterMark}
                              </p>
                              <div className="mt-1.5 text-[10px] text-primary-500/60 flex items-center gap-1">
                                <Clock size={9} />
                                {rec.exportedAt}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-dark-800/30 border border-primary-700/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                    <AlertTriangle size={15} className="text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-primary-100 font-medium mb-1">标记说明</p>
                    <ul className="space-y-1 text-xs text-primary-300/80 leading-relaxed">
                      <li>· 每次导出会同时保存当时的筛选条件快照</li>
                      <li>· 异常点的确认状态和关联材料一并打包</li>
                      <li>· 负责人复核时可依据历史导出版本追溯</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {exportedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-float">
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-success/20 text-success border border-success/40 shadow-lg backdrop-blur-sm">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">
              报告已生成，包含 {filtered.length} 条异常及筛选标记
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-dark-900/40 border border-primary-700/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-primary-400/60 mb-1">{label}</p>
      <p className={cn('text-xl font-semibold font-serif', color)}>{value}</p>
    </div>
  );
}
