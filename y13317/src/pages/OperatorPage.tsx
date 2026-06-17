import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  AlertTriangle,
  CheckSquare,
  Send,
  Upload,
  CornerDownLeft,
  Zap,
  Pin,
  GripVertical,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  ChevronDown,
  Search,
  Clock,
  User,
  Sparkles,
  ListChecks,
  Filter,
  X,
  Loader2,
  Check,
  AlertCircle,
  ThumbsUp,
  Calendar,
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  useOperatorStore,
  type MaterialTask,
  type ReleaseItem,
} from '@/store/operatorStore';
import { exportToExcel } from '@/utils/exportUtils';

type RiskFilter = 'all' | 'high' | 'medium' | 'low';
type MissingFilter = 'all' | 'standard_doc' | 'reference_image' | 'spec_sheet';
type DueFilter = 'all' | 'urgent' | 'normal' | 'later';
type GenerateScope = 'material' | 'release' | 'both';

const getWeather = () => {
  const r = Math.random();
  if (r < 0.4) return { icon: <Sun className="w-6 h-6 text-amber-500" />, text: '晴 26°C' };
  if (r < 0.7) return { icon: <Cloud className="w-6 h-6 text-gray-500" />, text: '多云 24°C' };
  if (r < 0.9) return { icon: <CloudSun className="w-6 h-6 text-amber-400" />, text: '晴转多云 25°C' };
  return { icon: <CloudRain className="w-6 h-6 text-industrial-400" />, text: '小雨 22°C' };
};

const riskColorMap = {
  high: {
    ribbon: 'bg-danger-600',
    badge: 'badge-danger',
    border: 'border-danger-200',
    bg: 'bg-danger-50/30',
    label: '高风险',
  },
  medium: {
    ribbon: 'bg-warning-500',
    badge: 'badge-warning',
    border: 'border-warning-200',
    bg: 'bg-warning-50/30',
    label: '中风险',
  },
  low: {
    ribbon: 'bg-amber-400',
    badge: 'badge-amber',
    border: 'border-amber-200',
    bg: 'bg-amber-50/30',
    label: '低风险',
  },
} as const;

const missingTypeLabel: Record<string, string> = {
  standard_doc: '标准文档',
  reference_image: '参考图像',
  spec_sheet: '规格书',
};

const daysRemaining = (dueDateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
};

const Checkbox: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <span
    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
      checked
        ? 'bg-industrial border-industrial'
        : 'border-gray-300 hover:border-industrial-400 bg-white'
    }`}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
  >
    {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
  </span>
);

const OperatorPage: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    materialTasks,
    releaseItems,
    selectedMaterialTaskIds,
    selectedReleaseIds,
    toggleMaterialTask,
    toggleReleaseItem,
    clearSelectedMaterial,
    clearSelectedRelease,
    approveMaterialTask,
    urgeMaterialTask,
    deferMaterialTask,
    pinMaterialTask,
    reorderMaterialTasks,
    approveReleaseItem,
    rejectReleaseItem,
    approveAllReleases,
    showQuickGenerateDialog,
    setShowQuickGenerateDialog,
  } = useOperatorStore();

  const [weather] = useState(getWeather());
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, []);

  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [missingFilter, setMissingFilter] = useState<MissingFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [taskKeyword, setTaskKeyword] = useState('');
  const [releaseKeyword, setReleaseKeyword] = useState('');

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const [generateScope, setGenerateScope] = useState<GenerateScope>('both');
  const [generating, setGenerating] = useState(false);
  const gridRef = useRef<AgGridReact>(null);

  const highRiskCount = materialTasks.filter((t) => t.riskLevel === 'high').length;

  const filteredTasks = useMemo(() => {
    return materialTasks.filter((t) => {
      if (riskFilter !== 'all' && t.riskLevel !== riskFilter) return false;
      if (missingFilter !== 'all' && !t.missingTypes.includes(missingFilter)) return false;
      const dr = daysRemaining(t.dueDate);
      if (dueFilter === 'urgent' && dr > 2) return false;
      if (dueFilter === 'normal' && (dr <= 2 || dr > 5)) return false;
      if (dueFilter === 'later' && dr <= 5) return false;
      if (taskKeyword.trim()) {
        const kw = taskKeyword.trim().toLowerCase();
        if (
          !t.sampleId.toLowerCase().includes(kw) &&
          !t.defectType.toLowerCase().includes(kw) &&
          !t.missingDescription.toLowerCase().includes(kw)
        )
          return false;
      }
      return true;
    });
  }, [materialTasks, riskFilter, missingFilter, dueFilter, taskKeyword]);

  const filteredRelease = useMemo(() => {
    if (!releaseKeyword.trim()) return releaseItems;
    const kw = releaseKeyword.trim().toLowerCase();
    return releaseItems.filter(
      (r) =>
        r.sampleId.toLowerCase().includes(kw) ||
        r.defectType.toLowerCase().includes(kw) ||
        r.revisedJudgment.toLowerCase().includes(kw) ||
        r.originalReviewer.toLowerCase().includes(kw)
    );
  }, [releaseItems, releaseKeyword]);

  const allMaterialSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t) => selectedMaterialTaskIds.includes(t.id));

  const allReleaseSelected =
    filteredRelease.length > 0 &&
    filteredRelease.every((r) => selectedReleaseIds.includes(r.id));

  const handleBulkApproveMaterial = () => {
    selectedMaterialTaskIds.forEach((id) => approveMaterialTask(id));
    clearSelectedMaterial();
  };
  const handleBulkUrgeMaterial = () => {
    selectedMaterialTaskIds.forEach((id) => urgeMaterialTask(id));
  };
  const handleBulkExportMaterial = () => {
    const rows = filteredTasks
      .filter((t) => selectedMaterialTaskIds.includes(t.id))
      .map((t) => ({
        样本ID: t.sampleId,
        风险等级: riskColorMap[t.riskLevel].label,
        缺陷类型: t.defectType,
        缺失说明: t.missingDescription,
        缺失原因: t.missingReason,
        建议补材料方式: t.suggestedAction,
        建议完成日期: t.dueDate,
        核对人: t.checkedBy,
      }));
    exportToExcel(rows, `待补材料清单_${new Date().toISOString().slice(0, 10)}`, '待补材料');
  };

  const handleBulkExportRelease = () => {
    const rows = filteredRelease
      .filter((r) => selectedReleaseIds.includes(r.id))
      .map((r) => ({
        样本ID: r.sampleId,
        缺陷类型: r.defectType,
        改判结论: r.revisedJudgment,
        放行依据: r.releaseBasis,
        原审核人: r.originalReviewer,
        建议放行时间: r.suggestedReleaseTime,
      }));
    exportToExcel(rows, `可放行清单_${new Date().toISOString().slice(0, 10)}`, '可放行清单');
  };

  const handleQuickGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 700));

    if (generateScope === 'material' || generateScope === 'both') {
      const rows = materialTasks.map((t) => ({
        样本ID: t.sampleId,
        风险等级: riskColorMap[t.riskLevel].label,
        缺陷类型: t.defectType,
        缺失说明: t.missingDescription,
        缺失原因: t.missingReason,
        建议补材料方式: t.suggestedAction,
        建议完成日期: t.dueDate,
        核对人: t.checkedBy,
        还剩天数: `${daysRemaining(t.dueDate)} 天`,
      }));
      exportToExcel(rows, `周姐_待补材料清单_${new Date().toISOString().slice(0, 10)}`, '待补材料');
    }
    if (generateScope === 'release' || generateScope === 'both') {
      const rows = releaseItems.map((r) => ({
        样本ID: r.sampleId,
        缺陷类型: r.defectType,
        改判结论: r.revisedJudgment,
        放行依据说明: r.releaseBasis,
        原审核人: r.originalReviewer,
        建议放行时间: r.suggestedReleaseTime,
        建议下一步: '核对无误后放行，如有疑问点击详情查看',
      }));
      exportToExcel(rows, `周姐_可放行清单_${new Date().toISOString().slice(0, 10)}`, '可放行清单');
    }

    setGenerating(false);
    setShowQuickGenerateDialog(false);
  };

  const releaseColumnDefs: ColDef<ReleaseItem>[] = useMemo(
    () => [
      {
        headerName: '',
        field: 'select',
        width: 50,
        suppressMovable: true,
        pinned: 'left',
        cellRenderer: (params: { data?: ReleaseItem }) => {
          if (!params.data) return null;
          const checked = selectedReleaseIds.includes(params.data.id);
          return (
            <div className="flex items-center justify-center h-full">
              <Checkbox
                checked={checked}
                onChange={() => toggleReleaseItem(params.data!.id)}
              />
            </div>
          );
        },
      },
      {
        headerName: '样本',
        field: 'sampleId',
        width: 180,
        cellRenderer: (params: { data?: ReleaseItem }) => {
          if (!params.data) return null;
          return (
            <div className="flex items-center gap-2 py-1">
              <img
                src={params.data.imageUrl}
                alt=""
                className="w-11 h-9 rounded object-cover border border-gray-200"
              />
              <span className="font-mono text-xs font-medium text-gray-800">
                {params.data.sampleId}
              </span>
            </div>
          );
        },
      },
      {
        headerName: '缺陷',
        field: 'defectType',
        width: 120,
        cellRenderer: (params: { data?: ReleaseItem }) => {
          if (!params.data) return null;
          return <span className="badge badge-warning">{params.data.defectType}</span>;
        },
      },
      {
        headerName: '改判结论',
        field: 'revisedJudgment',
        width: 120,
        cellRenderer: (params: { value?: string }) => {
          const v = params.value;
          const color =
            v === '合格'
              ? 'badge-success'
              : v === '特采'
              ? 'badge-warning'
              : 'badge-primary';
          return <span className={`badge ${color}`}>{v}</span>;
        },
      },
      {
        headerName: '放行依据',
        field: 'releaseBasis',
        flex: 1,
        minWidth: 280,
        cellClass: 'text-xs text-gray-600 leading-relaxed',
      },
      { headerName: '原审核人', field: 'originalReviewer', width: 100 },
      {
        headerName: '放行时间建议',
        field: 'suggestedReleaseTime',
        width: 140,
        cellClass: 'text-xs text-industrial font-medium',
      },
      {
        headerName: '操作',
        field: 'actions',
        width: 200,
        pinned: 'right',
        suppressMovable: true,
        cellRenderer: (params: { data?: ReleaseItem }) => {
          if (!params.data) return null;
          return (
            <div className="flex items-center gap-1 h-full">
              <button
                className="btn btn-success btn-sm !px-2.5 !py-1 text-xs"
                onClick={() => approveReleaseItem(params.data!.id)}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                放行
              </button>
              <button
                className="p-1.5 rounded hover:bg-industrial-50 text-industrial text-xs transition-colors"
                title="查看详情"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-danger-50 text-danger text-xs transition-colors"
                title="打回"
                onClick={() => rejectReleaseItem(params.data!.id)}
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [selectedReleaseIds]
  );

  const onDragStart = useCallback((idx: number) => () => setDragIdx(idx), []);
  const onDragOver = useCallback(
    (idx: number) => (e: React.DragEvent) => {
      e.preventDefault();
      if (dragOverIdx !== idx) setDragOverIdx(idx);
    },
    [dragOverIdx]
  );
  const onDrop = useCallback(
    (idx: number) => () => {
      if (dragIdx !== null && dragIdx !== idx) {
        reorderMaterialTasks(dragIdx, idx);
      }
      setDragIdx(null);
      setDragOverIdx(null);
    },
    [dragIdx, reorderMaterialTasks]
  );
  const onDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-industrial-50/30 to-gray-50">
      {/* 顶部欢迎条 */}
      <div className="bg-gradient-to-r from-industrial via-industrial-700 to-industrial-800 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">
                  周姐，您好！
                  <span className="ml-3 text-amber-300 inline-flex items-center gap-1.5 text-base font-semibold align-middle">
                    <AlertTriangle className="w-4 h-4" />
                    今日待处理 {materialTasks.length} 条
                    {highRiskCount > 0 && (
                      <span className="text-danger-300">
                        ，其中高风险 {highRiskCount} 条，建议优先处理
                      </span>
                    )}
                  </span>
                </h1>
                <p className="text-white/70 mt-1 text-sm">
                  标注负责人工作台 · 快速掌握待补材料与可放行清单进度
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15">
                <Calendar className="w-4.5 h-4.5 opacity-80" />
                <span className="text-sm font-medium">{todayStr}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15">
                {weather.icon}
                <span className="text-sm font-medium">{weather.text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 双 Tab 大 TabBar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex">
            {[
              {
                key: 'material',
                label: '待补材料',
                icon: <AlertCircle className="w-5 h-5" />,
                count: materialTasks.length,
                badgeColor: 'bg-danger text-white',
                activeColor: 'danger',
              },
              {
                key: 'release',
                label: '可放行清单',
                icon: <CheckCircle2 className="w-5 h-5" />,
                count: releaseItems.length,
                badgeColor: 'bg-success text-white',
                activeColor: 'success',
              },
            ].map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as 'material' | 'release')}
                  className={`flex-1 flex items-center justify-center gap-3 py-5 text-lg font-semibold transition-all border-b-4 relative ${
                    active
                      ? t.activeColor === 'danger'
                        ? 'border-danger text-danger bg-danger-50/40'
                        : 'border-success text-success bg-success-50/40'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold shadow-sm ${t.badgeColor}`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 pb-24">
        {/* 待补材料 Tab */}
        {activeTab === 'material' && (
          <div className="space-y-4 animate-fade-in">
            {/* 筛选栏 */}
            <div className="card">
              <div className="card-body">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">筛选：</span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="input pl-9 !py-2 w-64 text-sm"
                      placeholder="搜索样本ID/缺陷/缺失说明..."
                      value={taskKeyword}
                      onChange={(e) => setTaskKeyword(e.target.value)}
                    />
                  </div>

                  {[
                    {
                      key: 'riskFilter',
                      label: '风险等级',
                      value: riskFilter,
                      onChange: (v: string) => setRiskFilter(v as RiskFilter),
                      options: [
                        { v: 'all', l: '全部', color: 'bg-gray-100 text-gray-700' },
                        { v: 'high', l: '高风险', color: 'bg-danger-100 text-danger' },
                        { v: 'medium', l: '中风险', color: 'bg-warning-100 text-warning' },
                        { v: 'low', l: '低风险', color: 'bg-amber-100 text-amber-700' },
                      ],
                    },
                    {
                      key: 'missingFilter',
                      label: '缺失类型',
                      value: missingFilter,
                      onChange: (v: string) => setMissingFilter(v as MissingFilter),
                      options: [
                        { v: 'all', l: '全部', color: 'bg-gray-100 text-gray-700' },
                        { v: 'standard_doc', l: '标准文档', color: 'bg-industrial-100 text-industrial' },
                        { v: 'reference_image', l: '参考图像', color: 'bg-success-100 text-success' },
                        { v: 'spec_sheet', l: '规格书', color: 'bg-amber-100 text-amber-700' },
                      ],
                    },
                    {
                      key: 'dueFilter',
                      label: '截止日期',
                      value: dueFilter,
                      onChange: (v: string) => setDueFilter(v as DueFilter),
                      options: [
                        { v: 'all', l: '全部', color: 'bg-gray-100 text-gray-700' },
                        { v: 'urgent', l: '≤2天内', color: 'bg-danger-100 text-danger' },
                        { v: 'normal', l: '3-5天', color: 'bg-warning-100 text-warning' },
                        { v: 'later', l: '>5天', color: 'bg-success-100 text-success' },
                      ],
                    },
                  ].map((grp) => (
                    <div key={grp.key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{grp.label}：</span>
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {grp.options.map((opt) => (
                          <button
                            key={opt.v}
                            onClick={() => grp.onChange(opt.v)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                              grp.value === opt.v
                                ? 'bg-white shadow-sm text-gray-800'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="ml-auto flex items-center gap-2 text-sm">
                    <span className="text-gray-400">共</span>
                    <span className="font-bold text-industrial text-base">
                      {filteredTasks.length}
                    </span>
                    <span className="text-gray-400">条</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 批量操作栏 */}
            <div
              className={`card transition-all ${
                selectedMaterialTaskIds.length > 0
                  ? 'ring-2 ring-industrial-200 bg-industrial-50/40'
                  : ''
              }`}
            >
              <div className="card-body py-3 flex flex-wrap items-center gap-3">
                <Checkbox
                  checked={allMaterialSelected}
                  onChange={(v) => {
                    if (v) {
                      const ids = filteredTasks.map((t) => t.id);
                      ids.forEach((id) => {
                        if (!selectedMaterialTaskIds.includes(id)) toggleMaterialTask(id);
                      });
                    } else {
                      clearSelectedMaterial();
                    }
                  }}
                />
                <span className="text-sm text-gray-700">
                  已选 <b className="text-industrial">{selectedMaterialTaskIds.length}</b> /{' '}
                  {filteredTasks.length}
                </span>
                <div className="h-5 w-px bg-gray-200" />
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleBulkApproveMaterial}
                  disabled={selectedMaterialTaskIds.length === 0}
                >
                  <CheckSquare className="w-4 h-4" />
                  批量通过 ({selectedMaterialTaskIds.length})
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={handleBulkUrgeMaterial}
                  disabled={selectedMaterialTaskIds.length === 0}
                >
                  <Send className="w-4 h-4" />
                  批量催办
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleBulkExportMaterial}
                  disabled={selectedMaterialTaskIds.length === 0}
                >
                  <Download className="w-4 h-4" />
                  批量导出
                </button>
                {selectedMaterialTaskIds.length > 0 && (
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                    onClick={clearSelectedMaterial}
                  >
                    清除选择
                  </button>
                )}
              </div>
            </div>

            {/* 卡片列表 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredTasks.map((task, idx) => {
                const rc = riskColorMap[task.riskLevel];
                const dr = daysRemaining(task.dueDate);
                const isUrgent = dr <= 2;
                const dragging = dragIdx === idx;
                const overTarget = dragOverIdx === idx && dragIdx !== idx;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={onDragStart(idx)}
                    onDragOver={onDragOver(idx)}
                    onDrop={onDrop(idx)}
                    onDragEnd={onDragEnd}
                    className={`card flex overflow-hidden transition-all ${rc.border} ${
                      dragging ? 'opacity-50 scale-[0.99] shadow-card-hover' : ''
                    } ${overTarget ? 'ring-2 ring-industrial-400 ring-offset-2' : ''} ${
                      rc.bg
                    }`}
                  >
                    {/* 色带 */}
                    <div className={`w-16 flex-shrink-0 ${rc.ribbon} flex flex-col items-center py-4 gap-3`}>
                      <button
                        className="w-7 h-7 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/90 transition-colors cursor-grab active:cursor-grabbing"
                        title="拖拽排序"
                      >
                        <GripVertical className="w-4.5 h-4.5" />
                      </button>
                      <div className="text-white font-bold text-lg leading-none">#{task.priority}</div>
                      <button
                        className="w-7 h-7 rounded-md bg-white/15 hover:bg-white/30 flex items-center justify-center text-white/90 transition-colors"
                        title="置顶"
                        onClick={() => pinMaterialTask(task.id)}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1" />
                      <Checkbox
                        checked={selectedMaterialTaskIds.includes(task.id)}
                        onChange={(v) => {
                          toggleMaterialTask(task.id);
                          if (v) { /* selected */ }
                        }}
                      />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="p-4 pb-2 flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={task.imageUrl}
                            alt=""
                            className="w-20 h-16 rounded-lg object-cover border border-gray-200 shadow-sm flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-sm font-bold text-gray-900">
                                {task.sampleId}
                              </span>
                              <span className={`badge ${rc.badge}`}>{rc.label}</span>
                              <span className="badge badge-gray">{task.defectType}</span>
                              {isUrgent && (
                                <span className="badge badge-danger animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  紧急
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                              {task.missingTypes.map((m) => (
                                <span
                                  key={m}
                                  className="text-xs px-2 py-0.5 bg-industrial-50 text-industrial rounded border border-industrial-100"
                                >
                                  缺{missingTypeLabel[m]}
                                </span>
                              ))}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                              {task.missingDescription}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                            <div
                              className={`text-sm font-bold ${
                                isUrgent
                                  ? 'text-danger'
                                  : dr <= 5
                                  ? 'text-warning'
                                  : 'text-success'
                              }`}
                            >
                              还剩{dr}天
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                          <div className="bg-white/70 rounded-lg px-3 py-2 border border-gray-100">
                            <div className="text-gray-400 mb-1">缺失原因</div>
                            <div className="text-gray-700 leading-relaxed">{task.missingReason}</div>
                          </div>
                          <div className="bg-white/70 rounded-lg px-3 py-2 border border-gray-100">
                            <div className="text-gray-400 mb-1">建议补材料方式</div>
                            <div className="text-gray-700 leading-relaxed">{task.suggestedAction}</div>
                          </div>
                        </div>
                      </div>

                      {/* 底部操作 */}
                      <div className="px-4 py-2.5 border-t border-gray-100 bg-white/50 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          核对人：{task.checkedBy}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => approveMaterialTask(task.id)}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            补完通过
                          </button>
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => urgeMaterialTask(task.id)}
                          >
                            <Send className="w-3.5 h-3.5" />
                            催办接手
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="上传材料"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            上传
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => deferMaterialTask(task.id)}
                          >
                            <CornerDownLeft className="w-3.5 h-3.5" />
                            暂不处理
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredTasks.length === 0 && (
              <div className="card py-20 text-center text-gray-400">
                <ListChecks className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>没有符合条件的待补材料任务</p>
              </div>
            )}
          </div>
        )}

        {/* 可放行清单 Tab */}
        {activeTab === 'release' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card">
              <div className="card-body flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-9 !py-2 w-80 text-sm"
                    placeholder="搜索样本ID/缺陷/改判结论/审核人..."
                    value={releaseKeyword}
                    onChange={(e) => setReleaseKeyword(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Checkbox
                    checked={allReleaseSelected}
                    onChange={(v) => {
                      if (v) {
                        filteredRelease.forEach((r) => {
                          if (!selectedReleaseIds.includes(r.id)) toggleReleaseItem(r.id);
                        });
                      } else {
                        clearSelectedRelease();
                      }
                    }}
                  />
                  <span className="text-sm text-gray-700">
                    已选 <b className="text-success">{selectedReleaseIds.length}</b> /{' '}
                    {filteredRelease.length}
                  </span>
                </div>

                <div className="ml-auto flex items-center gap-2 text-sm">
                  <span className="text-gray-400">共</span>
                  <span className="font-bold text-success text-base">
                    {filteredRelease.length}
                  </span>
                  <span className="text-gray-400">条待放行</span>
                </div>
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <div
                className="ag-theme-alpine w-full"
                style={{ height: 'calc(100vh - 440px)', minHeight: 500 }}
              >
                <AgGridReact
                  ref={gridRef}
                  rowData={filteredRelease}
                  columnDefs={releaseColumnDefs}
                  defaultColDef={{
                    resizable: true,
                    sortable: true,
                    filter: false,
                  }}
                  rowHeight={64}
                  headerHeight={48}
                  suppressRowClickSelection
                  rowSelection="multiple"
                />
              </div>
            </div>

            {/* 底部批量操作栏 */}
            <div
              className={`card transition-all ${
                selectedReleaseIds.length > 0
                  ? 'ring-2 ring-success-200 bg-success-50/40'
                  : ''
              }`}
            >
              <div className="card-body py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Sparkles className="w-4 h-4 text-amber" />
                  <span>
                    放行依据将自动生成，如
                    <code className="mx-1.5 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                      「引用完整、阈值符合 V2、改判符合来源影响」
                    </code>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleBulkExportRelease}
                    disabled={selectedReleaseIds.length === 0}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    批量导出放行单
                    {selectedReleaseIds.length > 0 && (
                      <span className="ml-1">({selectedReleaseIds.length})</span>
                    )}
                  </button>
                  <button
                    className="btn btn-success btn-lg"
                    onClick={() => {
                      if (
                        selectedReleaseIds.length > 0 &&
                        window.confirm(
                          `确认一键放行已选中的 ${selectedReleaseIds.length} 条样本？`
                        )
                      ) {
                        selectedReleaseIds.forEach((id) => approveReleaseItem(id));
                        clearSelectedRelease();
                      } else if (selectedReleaseIds.length === 0) {
                        if (
                          window.confirm(
                            `确认一键放行全部 ${filteredRelease.length} 条待放行样本？`
                          )
                        ) {
                          approveAllReleases();
                          clearSelectedRelease();
                        }
                      }
                    }}
                  >
                    <Zap className="w-5 h-5" />
                    {selectedReleaseIds.length > 0
                      ? `一键放行已选 (${selectedReleaseIds.length})`
                      : `一键放行全部 (${filteredRelease.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右下角悬浮按钮 */}
      <button
        onClick={() => setShowQuickGenerateDialog(true)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-industrial to-industrial-700 text-white rounded-full shadow-glow-industrial hover:shadow-lg hover:scale-[1.03] active:scale-100 transition-all group"
      >
        <Zap className="w-5 h-5 group-hover:animate-pulse" />
        <span className="font-semibold">快速生成处理清单</span>
      </button>

      {/* 快速生成对话框 */}
      {showQuickGenerateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-modal w-[560px] max-w-[94vw] animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-industrial to-industrial-700 text-white flex items-center justify-center shadow-glow-industrial">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">快速生成处理清单</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    一键下载 Excel 清单，包含逐条原因说明和建议下一步
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                onClick={() => setShowQuickGenerateDialog(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <div className="label mb-2.5">选择生成范围</div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      v: 'material',
                      label: '仅待补材料',
                      desc: `${materialTasks.length} 条`,
                      icon: <AlertCircle className="w-4.5 h-4.5" />,
                      color: 'danger',
                    },
                    {
                      v: 'release',
                      label: '仅可放行',
                      desc: `${releaseItems.length} 条`,
                      icon: <CheckCircle2 className="w-4.5 h-4.5" />,
                      color: 'success',
                    },
                    {
                      v: 'both',
                      label: '全部生成',
                      desc: `${materialTasks.length + releaseItems.length} 条`,
                      icon: <ListChecks className="w-4.5 h-4.5" />,
                      color: 'industrial',
                    },
                  ].map((opt) => {
                    const active = generateScope === opt.v;
                    const colorMap: Record<string, string> = {
                      danger: active
                        ? 'bg-danger-50 border-danger-400 text-danger ring-2 ring-danger-200'
                        : 'border-gray-200 text-gray-600 hover:border-danger-200 hover:bg-danger-50/40',
                      success: active
                        ? 'bg-success-50 border-success-400 text-success ring-2 ring-success-200'
                        : 'border-gray-200 text-gray-600 hover:border-success-200 hover:bg-success-50/40',
                      industrial: active
                        ? 'bg-industrial-50 border-industrial-400 text-industrial ring-2 ring-industrial-200'
                        : 'border-gray-200 text-gray-600 hover:border-industrial-200 hover:bg-industrial-50/40',
                    };
                    return (
                      <button
                        key={opt.v}
                        onClick={() => setGenerateScope(opt.v as GenerateScope)}
                        className={`relative flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 transition-all ${colorMap[opt.color]}`}
                      >
                        {opt.icon}
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs opacity-80">{opt.desc}</span>
                        {active && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-industrial text-white flex items-center justify-center text-xs shadow-sm">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-industrial-50/60 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2.5 text-sm">
                  <Sparkles className="w-4.5 h-4.5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1.5">
                    <p className="text-gray-700 font-medium">生成的清单将包含：</p>
                    <ul className="text-gray-600 space-y-1 leading-relaxed pl-1">
                      <li className="flex items-start gap-1.5">
                        <ChevronDown className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <b>待补材料清单.xlsx</b>：逐条「原因说明」和「建议下一步」，不含技术术语
                      </li>
                      <li className="flex items-start gap-1.5">
                        <ChevronDown className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <b>可放行清单.xlsx</b>：放行依据自动生成，逐条建议，方便会议汇报
                      </li>
                      <li className="flex items-start gap-1.5">
                        <ChevronDown className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        文件名将自动加上日期前缀和「周姐_」标记
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                className="btn btn-outline"
                onClick={() => setShowQuickGenerateDialog(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary btn-lg min-w-[160px]"
                onClick={handleQuickGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    立即生成并下载
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorPage;
