import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { useReviewStore } from '../store/useReviewStore';
import { useTideStore } from '../store/useTideStore';
import { useRiskStore } from '../store/useRiskStore';
import { useTaskStore } from '../store/useTaskStore';
import { DataStatus, TaskStatus } from '../types/common';
import { Download, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, Eye, Settings, RefreshCw, FileCheck, Hash, Loader2, AlertOctagon } from 'lucide-react';
import { generateExportFile, downloadFile, generateExportSummary, ExportData } from '../utils/export';
import { getTaskById } from '../data/mockTasks';

export const ExportCenterPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const reviewStore = useReviewStore();
  const tideStore = useTideStore();
  const riskStore = useRiskStore();

  const { reviewBatch, consistencyReport, isLoading: reviewLoading, loadReviewBatch, runConsistencyCheck } = reviewStore;
  const { calculatedRecords: tideRecords, isLoading: tideLoading, loadTideData, runCalculation } = tideStore;
  const { waterRecords, isLoading: riskLoading, loadWaterData, runAssessment } = riskStore;

  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [includeStatus, setIncludeStatus] = useState<DataStatus[]>([
    DataStatus.AVAILABLE,
    DataStatus.PENDING,
    DataStatus.NEED_REVIEW,
  ]);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [includeOriginalTimezone, setIncludeOriginalTimezone] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportResult, setExportResult] = useState<{
    filePath: string;
    dataHash: string;
    recordCount: number;
    fileSize: string;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const isLoading = reviewLoading || tideLoading || riskLoading;

  const task = taskId ? getTaskById(taskId) : null;
  const taskName = task?.name || '未命名任务';

  useEffect(() => {
    if (!taskId) {
      setLoadError('未指定任务ID，请从任务队列选择任务');
      return;
    }

    let mounted = true;
    setLoadError(null);
    setDataLoaded(false);

    const loadAllData = async () => {
      try {
        loadTideData(taskId);
        loadWaterData(taskId);
        loadReviewBatch(taskId);

        await new Promise(resolve => setTimeout(resolve, 300));

        runCalculation(taskId);
        runAssessment(taskId);
        runConsistencyCheck(taskId);

        await new Promise(resolve => setTimeout(resolve, 600));

        if (mounted) {
          setDataLoaded(true);
        }
      } catch (error) {
        if (mounted) {
          setLoadError(error instanceof Error ? error.message : '数据加载失败，请刷新页面重试');
        }
      }
    };

    loadAllData();

    return () => {
      mounted = false;
    };
  }, [taskId, loadTideData, loadWaterData, loadReviewBatch, runCalculation, runAssessment, runConsistencyCheck]);

  const totalRecords = reviewBatch?.entries?.length || 0;
  const availableRecords = reviewBatch?.entries?.filter(e => e.status === DataStatus.AVAILABLE).length || 0;
  const pendingRecords = reviewBatch?.entries?.filter(e => e.status === DataStatus.PENDING).length || 0;
  const reviewRecords = reviewBatch?.entries?.filter(e => e.status === DataStatus.NEED_REVIEW).length || 0;
  const recollectRecords = reviewBatch?.entries?.filter(e => e.status === DataStatus.RECOLLECT).length || 0;

  const tideCount = tideRecords.length;
  const waterCount = waterRecords.length;

  const selectedCount = includeStatus.reduce((sum, status) => {
    switch (status) {
      case DataStatus.AVAILABLE: return sum + availableRecords;
      case DataStatus.PENDING: return sum + pendingRecords;
      case DataStatus.NEED_REVIEW: return sum + reviewRecords;
      case DataStatus.RECOLLECT: return sum + recollectRecords;
      default: return sum;
    }
  }, 0);

  const unresolvedIssues = consistencyReport?.issues?.filter(i => !i.resolved).length || 0;

  const exportData = useMemo((): ExportData | null => {
    if (!taskId || !dataLoaded) return null;
    return {
      taskId,
      taskName,
      tideRecords,
      waterRecords,
      reviewEntries: reviewBatch?.entries || [],
      consistencyReport,
      exportTime: new Date(),
    };
  }, [taskId, taskName, tideRecords, waterRecords, reviewBatch, consistencyReport, dataLoaded]);

  const exportSummary = useMemo(() => {
    if (!exportData) return null;
    return generateExportSummary(exportData, {
      includeStatus,
      includeExplanations,
      includeOriginalTimezone,
      format: exportFormat,
    });
  }, [exportData, includeStatus, includeExplanations, includeOriginalTimezone, exportFormat]);

  const handleStatusToggle = (status: DataStatus) => {
    if (includeStatus.includes(status)) {
      setIncludeStatus(includeStatus.filter(s => s !== status));
    } else {
      setIncludeStatus([...includeStatus, status]);
    }
  };

  const handleExport = () => {
    if (!exportData || selectedCount === 0) {
      if (selectedCount === 0) {
        alert('请至少选择一种数据状态进行导出');
      } else if (!dataLoaded) {
        alert('数据正在加载中，请稍候...');
      }
      return;
    }

    if (unresolvedIssues > 0) {
      const confirmed = window.confirm(
        `存在 ${unresolvedIssues} 处未确认的一致性问题，仍要继续导出吗？\n\n建议先返回复核工作台处理这些问题。`
      );
      if (!confirmed) return;
    }

    setIsExporting(true);
    setExportResult(null);
    setExportSuccess(false);

    try {
      const options = {
        includeStatus,
        includeExplanations,
        includeOriginalTimezone,
        format: exportFormat,
      };

      const file = generateExportFile(exportData, options);

      if (!file.content || file.content.trim().length === 0) {
        throw new Error('导出内容为空，请检查数据是否正常加载');
      }

      const result = downloadFile(file.content, file.filename, file.mimeType);

      const fileSize = new Blob([file.content]).size;
      const fileSizeStr = fileSize < 1024
        ? `${fileSize} B`
        : fileSize < 1024 * 1024
        ? `${(fileSize / 1024).toFixed(1)} KB`
        : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;

      setTimeout(() => {
        setIsExporting(false);

        if (result.success) {
          setExportSuccess(true);
          setExportResult({
            filePath: result.filePath,
            dataHash: exportSummary?.dataHash || '',
            recordCount: exportSummary?.totalRecords || 0,
            fileSize: fileSizeStr,
          });

          if (taskId) {
            useTaskStore.getState().updateTaskStatus(taskId, TaskStatus.EXPORTED);
          }

          setTimeout(() => setExportSuccess(false), 5000);
        } else {
          alert(`导出失败：${result.error || '未知错误'}`);
        }
      }, 800);
    } catch (error) {
      setIsExporting(false);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      alert(`导出失败：${errorMsg}`);
    }
  };

  const handleReload = () => {
    setLoadError(null);
    setDataLoaded(false);
    if (taskId) {
      loadTideData(taskId);
      loadWaterData(taskId);
      loadReviewBatch(taskId);
      runCalculation(taskId);
      runAssessment(taskId);
      runConsistencyCheck(taskId);
      setTimeout(() => setDataLoaded(true), 1000);
    }
  };

  const formatExtension = exportFormat === 'excel' ? 'xls' : exportFormat === 'csv' ? 'csv' : 'txt';

  if (loadError) {
    return (
      <AppLayout title="结果导出" subtitle="数据加载失败">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertOctagon className="w-16 h-16 text-status-recollect mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">数据加载失败</h3>
          <p className="text-slate-600 mb-6 text-center max-w-md">{loadError}</p>
          <div className="flex gap-3">
            <button
              onClick={handleReload}
              className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              返回任务队列
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="结果导出"
      subtitle="明珠海珍品 · 2026年6月巡检 · 数据导出中心"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/tasks/${taskId}/map`)}
            className="text-slate-500 hover:text-ocean-600 transition-colors text-sm flex items-center gap-1"
          >
            ← 返回地图面板
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm">结果导出</span>
          {isLoading && (
            <span className="ml-auto flex items-center gap-2 text-sm text-ocean-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              数据加载中...
            </span>
          )}
          {!isLoading && dataLoaded && (
            <span className="ml-auto flex items-center gap-2 text-sm text-status-available">
              <CheckCircle2 className="w-4 h-4" />
              数据已就绪
            </span>
          )}
        </div>

        {isLoading && (
          <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-ocean-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-ocean-700">正在加载数据...</p>
                <p className="text-xs text-slate-500">潮汐数据、水质数据、复核记录正在同步中，请稍候</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-ocean-900 to-ocean-800 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-6 h-6 text-tide-400" />
                <span className="text-tide-400 text-sm font-medium">导出中心</span>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">
                数据一致性校验通过后导出
              </h2>
              <p className="text-ocean-200 max-w-3xl leading-relaxed">
                本批次共 <span className="text-tide-400 font-bold">{totalRecords}</span> 条复核记录，
                包含潮汐数据 <span className="text-tide-400 font-bold">{tideCount}</span> 条、
                水质数据 <span className="text-tide-400 font-bold">{waterCount}</span> 条。
                其中可用 <span className="text-status-available font-bold">{availableRecords}</span> 条、
                暂缓 <span className="text-status-pending font-bold">{pendingRecords}</span> 条、
                需复核 <span className="text-status-review font-bold">{reviewRecords}</span> 条、
                需重采 <span className="text-status-recollect font-bold">{recollectRecords}</span> 条。
                {unresolvedIssues > 0 && (
                  <span className="text-status-review ml-2">
                    ⚠️ 仍有 {unresolvedIssues} 处不一致未确认
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-display font-bold text-tide-400">
                {selectedCount}
              </div>
              <div className="text-sm text-ocean-300">将导出记录数</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-status-available" />
                <span className="text-sm text-ocean-200">可用数据</span>
              </div>
              <div className="text-2xl font-bold text-white">{availableRecords}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-status-pending" />
                <span className="text-sm text-ocean-200">暂缓处理</span>
              </div>
              <div className="text-2xl font-bold text-white">{pendingRecords}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-status-review" />
                <span className="text-sm text-ocean-200">需场长复核</span>
              </div>
              <div className="text-2xl font-bold text-white">{reviewRecords}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-status-recollect" />
                <span className="text-sm text-ocean-200">建议重采</span>
              </div>
              <div className="text-2xl font-bold text-white">{recollectRecords}</div>
            </div>
          </div>
        </div>

        {unresolvedIssues > 0 && (
          <div className="bg-status-review/10 border border-status-review/30 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-review flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-status-review">
                  ⚠️ 存在 {unresolvedIssues} 处未确认的一致性问题
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  建议先返回复核工作台处理这些不一致项，确认后再导出，以确保导出数据的准确性。
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/tasks/${taskId}/review`)}
                  className="px-4 py-2 bg-status-review text-white text-sm rounded-lg hover:bg-status-review/90 transition-colors"
                >
                  去处理
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && dataLoaded && totalRecords === 0 && tideCount === 0 && waterCount === 0 && (
          <div className="bg-status-pending/10 border border-status-pending/30 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-status-pending flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-status-pending">
                  ⚠️ 未加载到任何数据
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  当前任务 {taskId} 暂无数据，请检查任务是否正确，或点击下方按钮重新加载。
                </p>
              </div>
              <button
                onClick={handleReload}
                className="px-4 py-2 bg-ocean-600 text-white text-sm rounded-lg hover:bg-ocean-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重新加载
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-ocean-500" />
              导出设置
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">导出格式</label>
                <div className="flex gap-3">
                  {[
                    { id: 'excel' as const, label: 'Excel', icon: FileSpreadsheet, desc: '可用Excel打开' },
                    { id: 'csv' as const, label: 'CSV', icon: FileText, desc: '通用文本格式' },
                    { id: 'pdf' as const, label: 'PDF报告', icon: FileText, desc: '纯文本格式' },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => setExportFormat(fmt.id)}
                        disabled={isLoading}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          exportFormat === fmt.id
                            ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{fmt.label}</span>
                        <span className="text-xs text-slate-400">{fmt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">包含数据状态</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { status: DataStatus.AVAILABLE, label: '可用数据' },
                    { status: DataStatus.PENDING, label: '暂缓处理' },
                    { status: DataStatus.NEED_REVIEW, label: '需复核' },
                    { status: DataStatus.RECOLLECT, label: '需重采' },
                  ].map((item) => (
                    <label
                      key={item.status}
                      className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={includeStatus.includes(item.status)}
                        onChange={() => handleStatusToggle(item.status)}
                        disabled={isLoading}
                        className="w-4 h-4 text-ocean-600 rounded focus:ring-ocean-500"
                      />
                      <StatusBadge status={item.status} size="sm" />
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExplanations}
                    onChange={(e) => setIncludeExplanations(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 text-ocean-600 rounded focus:ring-ocean-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">包含解释说明</span>
                    <p className="text-xs text-slate-500">导出每条记录的计算说明和异常解释，方便汇报</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeOriginalTimezone}
                    onChange={(e) => setIncludeOriginalTimezone(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 text-ocean-600 rounded focus:ring-ocean-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">包含原始时区</span>
                    <p className="text-xs text-slate-500">同时导出原始时区和校正后时区，便于追溯</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-ocean-500" />
              导出预览
            </h3>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-slate-600 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">文件名</span>
                  <span className="font-mono text-right">
                    明珠海珍品_{taskId}_YYYYMMDD_HHMMSS.{formatExtension}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">导出记录</span>
                  <span className="font-mono">{exportSummary?.totalRecords || 0} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">潮汐数据</span>
                  <span className="font-mono">{exportSummary?.tideCount || tideCount} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">水质数据</span>
                  <span className="font-mono">{exportSummary?.waterCount || waterCount} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">复核记录</span>
                  <span className="font-mono">{exportSummary?.reviewCount || totalRecords} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">包含说明</span>
                  <span className={includeExplanations ? 'text-status-available' : 'text-slate-400'}>
                    {includeExplanations ? '是' : '否'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">原始时区</span>
                  <span className={includeOriginalTimezone ? 'text-status-available' : 'text-slate-400'}>
                    {includeOriginalTimezone ? '包含' : '不包含'}
                  </span>
                </div>
                {exportSummary?.dataHash && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> 数据校验码
                    </span>
                    <span className="font-mono text-xs text-ocean-600">{exportSummary.dataHash}</span>
                  </div>
                )}
              </div>
            </div>

            {consistencyReport && (
              <div className={`rounded-lg p-4 mb-4 ${
                consistencyReport.isConsistent
                  ? 'bg-status-available/10 border border-status-available/30'
                  : 'bg-status-review/10 border border-status-review/30'
              }`}>
                <div className="flex items-start gap-2">
                  {consistencyReport.isConsistent ? (
                    <CheckCircle2 className="w-5 h-5 text-status-available flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-status-review flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      consistencyReport.isConsistent ? 'text-status-available' : 'text-status-review'
                    }`}>
                      {consistencyReport.isConsistent
                        ? '✅ 一致性校验通过'
                        : `⚠️ ${unresolvedIssues} 处不一致未确认`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {consistencyReport.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {exportResult && (
              <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-ocean-600" />
                  <span className="text-sm font-medium text-ocean-700">导出详情</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>保存路径</span>
                    <span className="font-mono">{exportResult.filePath}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>文件大小</span>
                    <span className="font-mono">{exportResult.fileSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>记录数量</span>
                    <span className="font-mono">{exportResult.recordCount} 条</span>
                  </div>
                  <div className="flex justify-between">
                    <span>数据校验码</span>
                    <span className="font-mono text-ocean-600">{exportResult.dataHash}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  💡 校验码用于验证数据完整性，同批次数据多次导出应生成相同校验码
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={isExporting || selectedCount === 0 || isLoading || !dataLoaded}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md font-medium"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在生成导出文件...
                  </>
                ) : exportSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    导出成功！
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    数据加载中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    导出 {selectedCount} 条记录
                  </>
                )}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleReload}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新数据
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                >
                  返回任务队列
                </button>
              </div>
            </div>

            {exportSuccess && (
              <div className="mt-4 p-4 bg-status-available/10 rounded-lg border border-status-available/30">
                <p className="text-sm text-status-available font-medium">
                  ✅ 导出成功！文件已保存至：
                </p>
                <p className="text-xs text-slate-600 mt-1 font-mono">
                  {exportResult?.filePath}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
