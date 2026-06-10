/**
 * 报告导出中心页面
 * 日常主入口：模板选择 → 筛选 → 类Word预览 → 导出
 */

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageSearch,
  GitCompare,
  ShieldCheck,
  Check,
  Search,
  Calendar,
  Hash,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
  Download,
  FileSpreadsheet,
  File,
  Loader2,
  Sparkles,
  Clock,
  BarChart3,
  RotateCcw,
  X,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useReportCenterStore,
  type ReportTemplateCard,
} from '@/store/reportCenterStore';
import { reportService } from '@/services/reportService';
import { useUiStore } from '@/store/uiStore';
import type { ReportType, ExportFormat } from '@/types';

/** 报告模板图标映射 */
const TEMPLATE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PackageSearch,
  GitCompare,
  ShieldCheck,
};

const ReportCenter: React.FC = () => {
  const { showSuccess, showError, showInfo } = useUiStore();

  const {
    templateList,
    selectedTemplate,
    hoveredTemplate,
    filters,
    speciesOptions,
    showAdvancedFilters,
    reportTitle,
    previewPages,
    currentPreviewPage,
    totalPages,
    isGeneratingPreview,
    previewZoom,
    isExportingPdf,
    isExportingExcel,
    exportProgress,
    setHoveredTemplate,
    selectTemplate,
    updateFilters,
    toggleSpeciesSelection,
    clearSpeciesSelection,
    toggleAdvancedFilters,
    resetFilters,
    setReportTitle,
    setPreviewPages,
    goToPreviewPage,
    prevPreviewPage,
    nextPreviewPage,
    setGeneratingPreview,
    setPreviewZoom,
    resetPreview,
    startExportPdf,
    startExportExcel,
    updateExportProgress,
    finishExport,
    resetExport,
    refreshTemplateUsage,
  } = useReportCenterStore();

  /** 物种下拉展开状态 */
  const [speciesDropdownOpen, setSpeciesDropdownOpen] = useState(false);

  /** 已选物种名称列表 */
  const selectedSpeciesNames = useMemo(
    () =>
      speciesOptions
        .filter((s) => filters.selectedSpeciesIds.includes(s.id))
        .map((s) => s.name),
    [speciesOptions, filters.selectedSpeciesIds],
  );

  /** 处理生成预览 */
  const handleGeneratePreview = useCallback(async () => {
    if (!selectedTemplate) {
      showInfo('请先选择报告模板');
      return;
    }
    resetExport();
    setGeneratingPreview(true);
    resetPreview();

    try {
      const template = templateList.find((t) => t.type === selectedTemplate);
      const mockReportNo = `RPT-${selectedTemplate.toUpperCase()}-${Date.now().toString().slice(-6)}`;

      setReportTitle(template ? `${template.name} · ${mockReportNo}` : '');

      await new Promise((r) => setTimeout(r, 400));

      const mockPages = generateMockPreviewPages(selectedTemplate, mockReportNo);
      setPreviewPages(mockPages);
      refreshTemplateUsage(selectedTemplate);
      showSuccess('报告预览已生成');
    } catch (e) {
      showError('生成预览失败，请重试');
    } finally {
      setGeneratingPreview(false);
    }
  }, [selectedTemplate, templateList, resetExport, setGeneratingPreview, resetPreview, setReportTitle, setPreviewPages, refreshTemplateUsage, showInfo, showSuccess, showError]);

  /** 处理导出 */
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (previewPages.length === 0) {
        showInfo('请先生成报告预览');
        return;
      }
      if (format === 'pdf') {
        startExportPdf();
      } else {
        startExportExcel();
      }

      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 150));
        updateExportProgress(i);
      }

      const template = templateList.find((t) => t.type === selectedTemplate);
      const fileName = `${template?.name || '报告'}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      finishExport(`blob://mock/${fileName}`, format);
      showSuccess(`${format.toUpperCase()} 导出完成：${fileName}`);
    },
    [previewPages.length, startExportPdf, startExportExcel, updateExportProgress, finishExport, templateList, selectedTemplate, showInfo, showSuccess],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-6">
      {/* 页面头部 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            报告导出中心
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            选择模板并配置筛选条件，预览并导出专业报告
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <div className="text-slate-500 dark:text-slate-400">
            本周已导出
            <span className="mx-1 font-bold text-slate-800 dark:text-slate-100">85</span>
            份报告
          </div>
        </div>
      </div>

      {/* ========== 模板卡片区域 ========== */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          选择报告模板
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {templateList.map((tpl) => {
            const IconComp = TEMPLATE_ICON_MAP[tpl.iconName] || FileText;
            const isSelected = selectedTemplate === tpl.type;
            const isHovered = hoveredTemplate === tpl.type;
            return (
              <motion.div
                key={tpl.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                onMouseEnter={() => setHoveredTemplate(tpl.type)}
                onMouseLeave={() => setHoveredTemplate(null)}
                onClick={() => selectTemplate(tpl.type)}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-2xl border-2 p-5 transition-all duration-250',
                  isSelected
                    ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/10 dark:bg-slate-900 dark:shadow-blue-500/20'
                    : isHovered
                    ? 'border-slate-300 bg-white shadow-md dark:border-slate-600 dark:bg-slate-900'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                )}
              >
                {/* 选中态蓝框光晕 */}
                {isSelected && (
                  <motion.div
                    layoutId="selectedTemplateGlow"
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent"
                    transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                  />
                )}
                {/* 推荐徽章 */}
                {tpl.isRecommended && (
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    <Sparkles className="h-3 w-3" />
                    推荐
                  </div>
                )}
                {/* 选中打勾 */}
                {isSelected && (
                  <div className="absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}

                <div className="relative">
                  {/* 图标 */}
                  <div
                    className={cn(
                      'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg',
                      tpl.gradient,
                      isSelected ? 'scale-110 shadow-xl' : 'group-hover:scale-105',
                      'transition-transform duration-300',
                    )}
                  >
                    <IconComp className="h-6 w-6" />
                  </div>

                  {/* 名称与描述 */}
                  <h3
                    className={cn(
                      'text-base font-bold transition-colors',
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-800 dark:text-slate-100',
                    )}
                  >
                    {tpl.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {tpl.description}
                  </p>

                  {/* 底部统计 */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {tpl.lastUsedAt
                          ? `上次 ${new Date(tpl.lastUsedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`
                          : '未使用'}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-500 dark:text-slate-300">
                      使用 {tpl.usageCount} 次
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ========== 筛选条件区域 ========== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
            <Search className="h-4 w-4 text-emerald-500" />
            筛选条件
          </h2>
          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              重置
            </button>
            <button
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview || !selectedTemplate}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow hover:shadow-md disabled:opacity-50"
            >
              {isGeneratingPreview ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {isGeneratingPreview ? '生成中...' : '生成预览'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 批号范围 */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Hash className="h-3 w-3 text-slate-400" />
              批号范围
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filters.batchNumberStart}
                onChange={(e) => updateFilters({ batchNumberStart: e.target.value })}
                placeholder="起始批号"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-blue-950/40"
              />
              <span className="text-slate-300">~</span>
              <input
                type="text"
                value={filters.batchNumberEnd}
                onChange={(e) => updateFilters({ batchNumberEnd: e.target.value })}
                placeholder="结束批号"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-blue-950/40"
              />
            </div>
          </div>

          {/* 日期范围 */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Calendar className="h-3 w-3 text-slate-400" />
              日期范围
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateStart}
                onChange={(e) => updateFilters({ dateStart: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-950/40"
              />
              <span className="text-slate-300">~</span>
              <input
                type="date"
                value={filters.dateEnd}
                onChange={(e) => updateFilters({ dateEnd: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-950/40"
              />
            </div>
          </div>

          {/* 物种下拉多选 */}
          <div className="relative space-y-1.5 lg:col-span-2">
            <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <ShieldCheck className="h-3 w-3 text-slate-400" />
              目标物种
              {filters.selectedSpeciesIds.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                  {filters.selectedSpeciesIds.length}
                </span>
              )}
            </label>
            <div
              onClick={() => setSpeciesDropdownOpen((v) => !v)}
              className="flex min-h-[38px] cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:focus-within:ring-blue-950/40"
            >
              {selectedSpeciesNames.length === 0 ? (
                <span className="text-slate-400">选择物种（可多选）</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedSpeciesNames.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      {n}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const opt = speciesOptions.find((s) => s.name === n);
                          if (opt) toggleSpeciesSelection(opt.id);
                        }}
                        className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                  speciesDropdownOpen && 'rotate-180',
                )}
              />
            </div>

            <AnimatePresence>
              {speciesDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                >
                  {filters.selectedSpeciesIds.length > 0 && (
                    <div className="border-b border-slate-100 px-3 py-1.5 dark:border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSpeciesSelection();
                        }}
                        className="text-[11px] text-red-500 hover:underline"
                      >
                        清空全部选择
                      </button>
                    </div>
                  )}
                  {speciesOptions.map((s) => {
                    const checked = filters.selectedSpeciesIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSpeciesSelection(s.id);
                        }}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2 transition',
                          checked
                            ? 'bg-blue-50 dark:bg-blue-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition',
                            checked
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-slate-300 dark:border-slate-600',
                          )}
                        >
                          {checked && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {s.name}
                            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {s.sampleCount} 样本
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-slate-400">
                            别名：{s.aliases.join('、')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 高级筛选展开 */}
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            onClick={toggleAdvancedFilters}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                showAdvancedFilters && 'rotate-180',
              )}
            />
            {showAdvancedFilters ? '收起高级筛选' : '展开高级筛选'}
          </button>
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    关键词搜索
                  </label>
                  <input
                    type="text"
                    value={filters.keyword}
                    onChange={(e) => updateFilters({ keyword: e.target.value })}
                    placeholder="菌株编号 / 备注 / 操作员..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-950/40"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ========== 类 Word 预览区域 ========== */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        {/* 预览工具栏 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
              <FileText className="h-4 w-4 text-violet-500" />
              文档预览
            </h2>
            {reportTitle && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-600 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300">
                {reportTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 缩放控制 */}
            <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => setPreviewZoom(previewZoom - 10)}
                disabled={previewZoom <= 50}
                className="p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <div className="w-14 border-x border-slate-200 px-2 py-1 text-center text-xs font-semibold tabular-nums text-slate-700 dark:border-slate-700 dark:text-slate-200">
                {previewZoom}%
              </div>
              <button
                onClick={() => setPreviewZoom(previewZoom + 10)}
                disabled={previewZoom >= 200}
                className="p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 翻页 */}
            {totalPages > 0 && (
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={prevPreviewPage}
                  disabled={currentPreviewPage <= 1}
                  className="p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="w-20 border-x border-slate-200 px-2 py-1 text-center text-xs font-semibold tabular-nums text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {currentPreviewPage} / {totalPages}
                </div>
                <button
                  onClick={nextPreviewPage}
                  disabled={currentPreviewPage >= totalPages}
                  className="p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* A4 预览画布 */}
        <div className="relative flex min-h-[600px] items-center justify-center">
          {isGeneratingPreview ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <div className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                正在生成报告预览...
              </div>
              <div className="mt-1 text-xs text-slate-400">
                正在整理数据并渲染 {selectedTemplate ? templateList.find((t) => t.type === selectedTemplate)?.name : ''}
              </div>
            </div>
          ) : previewPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-inner dark:bg-slate-900">
                <File className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              </div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                还没有预览内容
              </div>
              <div className="mt-1 max-w-sm text-xs text-slate-400">
                选择报告模板并配置筛选条件后，点击「生成预览」查看类 Word 文档效果
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPreviewPage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                style={{
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                }}
                className="relative w-[794px] shrink-0"
              >
                {/* A4 纸张主体 */}
                <div className="relative overflow-hidden rounded-sm bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] dark:bg-slate-50">
                  {/* 页眉 */}
                  <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-16 pb-5 pt-10 dark:from-slate-100 dark:to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-black tracking-tight text-slate-800">
                            微生物检测数据平台
                          </div>
                          <div className="text-[11px] text-slate-400">
                            MICROBIAL DATA INSPECTION PLATFORM
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] leading-relaxed text-slate-500">
                        <div>文档编号：{reportTitle.split(' · ')[1] || '—'}</div>
                        <div>生成日期：{new Date().toLocaleDateString('zh-CN')}</div>
                        <div>版本号：V1.0</div>
                      </div>
                    </div>
                  </div>

                  {/* 标题 */}
                  <div className="px-16 py-8">
                    <h1 className="text-center text-2xl font-black text-slate-800">
                      {previewPages[currentPreviewPage - 1]?.htmlContent.includes('封面')
                        ? templateList.find((t) => t.type === selectedTemplate)?.name
                        : `${templateList.find((t) => t.type === selectedTemplate)?.name}（第 ${currentPreviewPage} 章）`}
                    </h1>
                    <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                  </div>

                  {/* 内容区域 */}
                  <div className="min-h-[520px] px-16 pb-16 text-sm leading-7 text-slate-700">
                    <ReportPreviewContent
                      templateType={selectedTemplate!}
                      pageNumber={currentPreviewPage}
                      totalPages={totalPages}
                    />
                  </div>

                  {/* 页脚 + 页码 */}
                  <div className="border-t border-slate-200 bg-slate-50/60 px-16 py-3 text-[10px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <div>
                        © 2026 微生物检测数据平台 · 本报告仅供内部使用 · 机密文件
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span>—</span>
                        <span className="font-bold text-slate-500">{currentPreviewPage}</span>
                        <span>/</span>
                        <span>{totalPages}</span>
                        <span>—</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 纸张阴影装饰 */}
                <div className="pointer-events-none absolute -bottom-3 left-4 right-4 h-6 rounded-b-[50%] bg-black/5 blur-lg" />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* ========== 底部导出按钮组 ========== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Download className="h-4 w-4 text-emerald-500" />
              导出报告
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {previewPages.length > 0
                ? `共 ${totalPages} 页，约 ${(totalPages * 0.12).toFixed(1)}MB PDF / ${(totalPages * 0.05).toFixed(1)}MB Excel`
                : '生成预览后即可导出'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 导出进度条 */}
            {(isExportingPdf || isExportingExcel) && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <motion.div
                    animate={{ width: `${exportProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r',
                      isExportingPdf
                        ? 'from-red-400 to-rose-500'
                        : 'from-emerald-400 to-teal-500',
                    )}
                  />
                </div>
                <span className="font-mono text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">
                  {exportProgress}%
                </span>
              </div>
            )}

            {/* PDF 按钮 */}
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExportingPdf || isExportingExcel || previewPages.length === 0}
              className="group flex items-center gap-2 rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:shadow-md hover:shadow-red-500/10 disabled:opacity-50 dark:border-red-900/50 dark:from-red-950/40 dark:to-rose-950/30 dark:text-red-300"
            >
              {isExportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <File className="h-4 w-4" />
              )}
              导出 PDF
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500 group-hover:bg-red-500/20">
                A4
              </span>
            </button>

            {/* Excel 按钮 */}
            <button
              onClick={() => handleExport('excel')}
              disabled={isExportingPdf || isExportingExcel || previewPages.length === 0}
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-xl hover:shadow-emerald-500/35 disabled:opacity-50"
            >
              {isExportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              导出 Excel
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur">
                .xlsx
              </span>
            </button>
          </div>
        </div>

        {/* 上次导出提示 */}
        {(exportProgress === 100 && !isExportingPdf && !isExportingExcel) && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              导出完成！文件已保存到下载目录。
              <button
                onClick={resetExport}
                className="ml-2 text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-200"
              >
                清除此提示
              </button>
            </span>
          </div>
        )}
      </section>
    </div>
  );
};

/** 生成 Mock 预览分页 */
function generateMockPreviewPages(templateType: ReportType, reportNo: string) {
  const pageCount = templateType === 'full_audit' ? 4 : 3;
  return Array.from({ length: pageCount }, (_, i) => ({
    pageNumber: i + 1,
    htmlContent: i === 0 ? '封面' : `章节-${i + 1}`,
    footerText: `报告编号 ${reportNo}`,
  }));
}

/** 预览内容渲染组件 */
const ReportPreviewContent: React.FC<{
  templateType: ReportType;
  pageNumber: number;
  totalPages: number;
}> = ({ templateType, pageNumber }) => {
  const sections = useMemo(() => {
    switch (templateType) {
      case 'batch_trace':
        return {
          1: [
            { h: '一、报告概述', p: '本报告针对培养基批号的生产、检验、使用全流程进行追溯分析，确保每一批次产品均符合质量控制标准。报告数据来源于 LIMS 系统与微生物检测平台，共涉及批次 24 个、样本 1,286 份。' },
            { h: '二、追溯范围', p: '批号范围：BATCH-2026-0001 ~ BATCH-2026-0240；日期范围：2026-01-01 ~ 2026-06-30；涉及生产线：A 线、B 线、C 线；产品类型：营养琼脂、麦康凯琼脂、SS 琼脂、巧克力琼脂 等 12 种。' },
            { h: '三、关键指标总览', p: '整体合格率：98.4%（上升 1.2%）；异常批次：4 个（均已处置）；平均检测周期：3.2 天；平均菌落计数：128 CFU/mL。' },
          ],
          2: [
            { h: '四、批次详情表', table: true },
            { h: '五、风险评估', p: '经综合评估，本追溯周期内未发现重大质量风险。4 个异常批次中，3 个为轻微偏差（包装破损），1 个为培养温度偏离±0.5℃，均已启动纠正预防措施（CAPA）并验证关闭。' },
          ],
          3: [
            { h: '六、结论与建议', p: '追溯范围内产品质量整体稳定，建议：1）继续加强 B 线温度监控；2）将批号 BATCH-2026-0187 作为典型案例纳入培训；3）下季度引入自动赋码系统，提升追溯效率 60%。' },
            { h: '七、附件清单', p: '附件 1：批次检测原始记录.pdf；附件 2：CAPA 处理单.pdf；附件 3：温度趋势图.xlsx。' },
          ],
        };
      case 'species_consistency':
        return {
          1: [
            { h: '一、分析背景', p: '本报告分析物种名称录入的规范性，通过 AI 同义词匹配算法比对历史数据中的录入差异，评估数据一致性水平。共分析历史记录 8,742 条，涉及物种 156 种。' },
            { h: '二、总体一致性', p: '标准名称匹配率：92.3%（提升 3.5%）；待修正记录：673 条（7.7%）；其中：同义词差异 421 条（62.6%）、拼写错误 195 条（29.0%）、录入缺失 57 条（8.4%）。' },
          ],
          2: [
            { h: '三、主要物种匹配详情', table: true },
            { h: '四、典型不一致案例', p: '案例 1：「大肠杆菌」应为「大肠埃希氏菌」（2,145 条）；案例 2：「金葡菌」应为「金黄色葡萄球菌」（1,806 条）；案例 3：「绿脓杆菌」应为「铜绿假单胞菌」（612 条）。' },
          ],
          3: [
            { h: '五、改进建议', p: '建议在录入界面强制使用标准名称下拉框；对高频同义词启用自动纠错（如输入「大肠杆菌」自动提示修正）；每季度开展一次数据清洗专项工作。' },
          ],
        };
      case 'full_audit':
        return {
          1: [
            { h: '一、审计概述', p: '本报告对微生物检测数据的完整生命周期进行全链路审计，涵盖：数据导入、字段修改、版本管理、重复数据去重、人工修正、AI 分析、结论签发等所有环节。审计周期：2026 年 Q1-Q2。' },
            { h: '二、数据量统计', p: '原始导入记录：24,587 条；版本变更：1,245 次；去重合并：892 组；人工修正：356 条；AI 分析调用：428 次；最终生成结论：12,406 份。' },
          ],
          2: [
            { h: '三、操作人审计日志', table: true },
            { h: '四、异常操作分析', p: '检测到异常操作 14 起：批量删除 3 起（误操作）、越权访问 5 起（权限收敛中）、短时间高频修改 6 起（已约谈）。所有异常均已记录并在 24h 内响应。' },
          ],
          3: [
            { h: '五、合规性评估', p: '数据完整性：符合 ALCOA+ 原则；可追溯性：全链路 ID 覆盖率 99.7%；权限合规率：97.2%（2.8% 为历史遗留问题，整改中）。' },
          ],
          4: [
            { h: '六、审计结论', p: '综合评定：合规（A级）。整体数据治理水平良好，建议持续推进权限精细化管理与操作实时告警，争取 2026 Q3 完成 ISO 27001 认证。' },
            { h: '七、签字确认', p: '审计员：_____________  日期：__________；质量负责人：_____________  日期：__________。' },
          ],
        };
    }
  }, [templateType]);

  const content = sections?.[pageNumber as 1 | 2 | 3 | 4] || [];

  return (
    <div className="space-y-6">
      {content.map((s, idx) => (
        <div key={idx}>
          <h2 className="mb-2 border-l-4 border-blue-500 pl-3 text-base font-bold text-slate-800">
            {s.h}
          </h2>
          {s.p && <p className="indent-8 text-[13px] text-slate-700">{s.p}</p>}
          {s.table && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="border border-slate-200 px-3 py-2 text-left">序号</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">
                      {templateType === 'batch_trace' ? '批号' : templateType === 'species_consistency' ? '物种名称' : '操作人'}
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left">
                      {templateType === 'batch_trace' ? '产品类型' : templateType === 'species_consistency' ? '匹配率' : '操作次数'}
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-3 py-1.5 text-slate-500">{i + 1}</td>
                      <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-700">
                        {templateType === 'batch_trace'
                          ? `BATCH-2026-0${String(i + 1).padStart(3, '0')}`
                          : templateType === 'species_consistency'
                          ? ['大肠埃希氏菌', '金黄色葡萄球菌', '枯草芽孢杆菌', '铜绿假单胞菌', '白色念珠菌'][i]
                          : ['张三（质检）', '李四（审核）', '王五（录入）', '赵六（复核）', '孙七（主管）'][i]}
                      </td>
                      <td className="border border-slate-200 px-3 py-1.5 text-slate-600">
                        {templateType === 'batch_trace'
                          ? ['营养琼脂', '麦康凯琼脂', 'SS 琼脂', '巧克力琼脂', 'MRS 肉汤'][i]
                          : templateType === 'species_consistency'
                          ? [`${(99 - i * 2).toFixed(1)}%`, `${(97 - i * 1.5).toFixed(1)}%`, `${(95 - i * 1).toFixed(1)}%`, `${(92 - i).toFixed(1)}%`, `${(88 - i * 0.5).toFixed(1)}%`][i]
                          : [245, 186, 612, 95, 42][i]}
                      </td>
                      <td className="border border-slate-200 px-3 py-1.5">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          i % 3 === 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : i % 3 === 1
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700',
                        )}>
                          {i % 3 === 0 ? '通过' : i % 3 === 1 ? '待复核' : '正常'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReportCenter;
