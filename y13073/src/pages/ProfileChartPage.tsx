import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileChart } from '../components/chart/ProfileChart';
import { Timeline } from '../components/timeline/Timeline';
import { FilterPanel } from '../components/filter/FilterPanel';
import { TracePanel } from '../components/trace/TracePanel';
import { ViewManager } from '../components/viewManagement/ViewManager';
import { GuidePanel } from '../components/guide/GuidePanel';
import { useDataStore } from '../store/dataStore';
import { useFilterStore } from '../store/filterStore';
import { useViewStore } from '../store/viewStore';
import { filterRecords } from '../utils/dataProcessor';
import { ANOMALY_TYPE_OPTIONS, PROCESS_STATUS_OPTIONS } from '../utils/constants';
import { Play, RefreshCw, FileSpreadsheet, Settings, HelpCircle, Upload, AlertTriangle, Download } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { downloadCsv, recordsToCsv } from '../utils/csvParser';

export const ProfileChartPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const records = useDataStore((s) => s.records);
  const anomalies = useDataStore((s) => s.anomalies);
  const timelineGaps = useDataStore((s) => s.timelineGaps);
  const isLoading = useDataStore((s) => s.isLoading);
  const warnings = useDataStore((s) => s.warnings);
  const loadDemoData = useDataStore((s) => s.loadDemoData);
  const loadCsvData = useDataStore((s) => s.loadCsvData);
  const reprocessData = useDataStore((s) => s.reprocessData);
  const clearData = useDataStore((s) => s.clearData);

  const conditions = useFilterStore((s) => s.conditions);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const chartState = useViewStore((s) => s.chartState);
  const showGuide = useViewStore((s) => s.showGuide);
  const toggleGuide = useViewStore((s) => s.toggleGuide);
  const setShowGuide = useViewStore((s) => s.setShowGuide);

  const addToast = useToastStore((s) => s.addToast);

  const hasShownGuide = useRef(false);

  useEffect(() => {
    if (records.length === 0) {
      loadDemoData();
      if (!hasShownGuide.current) {
        setTimeout(() => setShowGuide(true), 500);
        hasShownGuide.current = true;
      }
    }
  }, [records.length, loadDemoData, setShowGuide]);

  const filteredRecords = useMemo(() => {
    return filterRecords(records, conditions);
  }, [records, conditions]);

  const filteredAnomalies = useMemo(() => {
    const filteredIds = new Set(filteredRecords.map((r) => r.id));
    return anomalies.filter((a) => filteredIds.has(a.recordId));
  }, [anomalies, filteredRecords]);

  const handleLoadDemo = useCallback(() => {
    loadDemoData();
    resetFilters();
    setShowGuide(false);
    addToast({
      type: 'success',
      message: '演示数据加载成功，包含边界样本和时间轴缺段',
    });
  }, [loadDemoData, resetFilters, setShowGuide, addToast]);

  const handleRerun = useCallback(() => {
    reprocessData();
    addToast({
      type: 'info',
      message: '异常检测已重新运行',
    });
  }, [reprocessData, addToast]);

  const handleViewCsv = useCallback(() => {
    navigate('/csv');
    setShowGuide(false);
  }, [navigate, setShowGuide]);

  const handleExportCsv = useCallback(() => {
    const csv = recordsToCsv(records);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    downloadCsv(csv, `索道站剖面数据_${dateStr}_${timeStr}.csv`);
    addToast({
      type: 'success',
      message: `已导出 ${records.length} 条记录`,
    });
  }, [records, addToast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        loadCsvData(content);
        resetFilters();
        addToast({
          type: 'success',
          message: `CSV文件加载成功，共解析 ${file.name}`,
        });
      } catch (err) {
        addToast({
          type: 'error',
          message: 'CSV文件解析失败，请检查文件格式',
        });
      }
    };
    reader.onerror = () => {
      addToast({
        type: 'error',
        message: '文件读取失败',
      });
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const anomalyStats = useMemo(() => {
    const stats: Record<string, number> = {};
    ANOMALY_TYPE_OPTIONS.forEach((opt) => {
      stats[opt.value] = anomalies.filter((a) => a.type === opt.value).length;
    });
    return stats;
  }, [anomalies]);

  const totalAnomalies = anomalies.length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-100">
                山地索道站剖面讲解
              </h1>
              {totalAnomalies > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300 font-medium">
                    {totalAnomalies} 个异常
                  </span>
                </div>
              )}
              {timelineGaps.length > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-300 font-medium">
                    {timelineGaps.length} 个时间缺段
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                上传CSV
              </button>
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors text-sm"
              >
                <Play className="w-4 h-4" />
                放样例
              </button>
              <button
                onClick={handleRerun}
                disabled={records.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                重跑
              </button>
              <button
                onClick={handleViewCsv}
                disabled={records.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                查看CSV明细
              </button>
              <button
                onClick={handleExportCsv}
                disabled={records.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-200 rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                导出CSV
              </button>
              <div className="w-px h-6 bg-slate-700" />
              <button
                onClick={() => navigate('/mapping')}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                title="字段映射配置"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={toggleGuide}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                title="操作说明"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {anomalies.length > 0 && (
            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-700">
              <span className="text-xs text-slate-500">异常类型统计:</span>
              {ANOMALY_TYPE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.color.replace('text-', 'bg-')}`} />
                  <span className="text-xs text-slate-400">{opt.label}:</span>
                  <span className={`text-xs font-mono font-medium ${opt.color}`}>
                    {anomalyStats[opt.value] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              {warnings.map((warning, i) => (
                <div key={i} className="text-xs text-yellow-300 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto p-6">
        <div className="grid grid-cols-[280px_1fr_320px] gap-4 h-[calc(100vh-220px)]">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <FilterPanel records={records} />
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 p-4 min-h-0 overflow-hidden">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">正在处理数据...</p>
                  </div>
                </div>
              ) : (
                <ProfileChart records={filteredRecords} anomalies={filteredAnomalies} />
              )}
            </div>

            <div className="grid grid-cols-[1fr_300px] gap-4">
              <Timeline records={filteredRecords} gaps={timelineGaps} />
              <ViewManager chartState={chartState} />
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <TracePanel gaps={timelineGaps} />
          </div>
        </div>
      </div>

      <GuidePanel
        onLoadDemo={handleLoadDemo}
        onRerun={handleRerun}
        onViewCsv={handleViewCsv}
      />
    </div>
  );
};
