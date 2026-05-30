import { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Download,
  Image,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Package,
  Gauge,
  Layers,
  AlertCircle,
  Clock,
  Camera,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  captureScreenshot,
  generateReportData,
  exportReportAsPDF,
  exportReportAsImage,
  formatTime,
} from '@/utils/reportGenerator';
import {
  getAnomalyTypeLabel,
  getAnomalyTypeColor,
  getSeverityLabel,
  getSeverityColor,
} from '@/utils/anomalyDetector';
import { exportBadRowsCSV } from '@/utils/dataCleaner';
import { cn } from '@/lib/utils';
import type { ReportConfig, BadRowType } from '@/types';

export default function ReportExport() {
  const {
    anomalies,
    luggageData,
    badRows,
    chuteModels,
    sortingPorts,
  } = useAppStore();

  const [reportTitle, setReportTitle] = useState('机场行李滑槽仿真分析报告');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<ReportConfig>({
    includeScreenshot: true,
    includeAnomalyList: true,
    includeStatistics: true,
    includeBadRows: true,
    format: 'pdf',
    title: reportTitle,
  });

  const previewRef = useRef<HTMLDivElement>(null);

  const statistics = useMemo(() => {
    const heightMismatchCount = anomalies.filter(
      (a) => a.type === 'height_mismatch'
    ).length;
    const speedOverCount = anomalies.filter((a) => a.type === 'speed_over').length;
    const stackedCount = anomalies.filter((a) => a.type === 'stacked').length;
    const reviewedCount = anomalies.filter((a) => a.reviewed).length;
    const pendingCount = anomalies.filter((a) => !a.reviewed).length;

    return {
      totalLuggage: luggageData.length,
      totalAnomalies: anomalies.length,
      heightMismatchCount,
      speedOverCount,
      stackedCount,
      reviewedCount,
      pendingCount,
      badRowCount: badRows.length,
      chuteCount: chuteModels.length,
      portCount: sortingPorts.length,
    };
  }, [anomalies, luggageData, badRows, chuteModels, sortingPorts]);

  const badRowTypeStats = useMemo(() => {
    const stats: Record<BadRowType, number> = {
      empty: 0,
      remark: 0,
      missing_column: 0,
      invalid_value: 0,
    };
    badRows.forEach((row) => {
      stats[row.type]++;
    });
    return stats;
  }, [badRows]);

  const handleCaptureScreenshot = async () => {
    if (!previewRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureScreenshot(previewRef.current, 2);
      setScreenshot(dataUrl);
      setExportSuccess('截图捕获成功');
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (error) {
      console.error('截图捕获失败:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const reportData = generateReportData(
        anomalies,
        badRows,
        luggageData.length,
        screenshot || undefined,
        reportTitle
      );

      if (config.format === 'pdf') {
        await exportReportAsPDF(reportData, config);
      } else if (config.format === 'png' && previewRef.current) {
        await exportReportAsImage(previewRef.current, reportTitle);
      }

      setExportSuccess(`${config.format === 'pdf' ? 'PDF' : '图片'}导出成功`);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBadRows = () => {
    exportBadRowsCSV(badRows);
    setExportSuccess('坏行记录导出成功');
    setTimeout(() => setExportSuccess(null), 2000);
  };

  const getBadRowTypeLabel = (type: BadRowType): string => {
    const labels: Record<BadRowType, string> = {
      empty: '空行',
      remark: '备注行',
      missing_column: '缺列',
      invalid_value: '无效值',
    };
    return labels[type];
  };

  const getBadRowTypeColor = (type: BadRowType): string => {
    const colors: Record<BadRowType, string> = {
      empty: '#6B7280',
      remark: '#8B5CF6',
      missing_column: '#F59E0B',
      invalid_value: '#EF4444',
    };
    return colors[type];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">报告导出</h1>
          <p className="text-gray-400 mt-1">生成包含3D截图、异常列表和统计数据的完整分析报告</p>
        </div>
        <div className="flex items-center gap-3">
          {exportSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">
              <CheckCircle2 size={16} />
              {exportSuccess}
            </div>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isExporting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : config.format === 'pdf' ? (
              <FileDown size={18} />
            ) : (
              <Image size={18} />
            )}
            {isExporting ? '导出中...' : `导出${config.format === 'pdf' ? 'PDF' : '图片'}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Settings size={18} className="text-blue-400" />
              报告配置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">报告标题</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">导出格式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig({ ...config, format: 'pdf' })}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border',
                      config.format === 'pdf'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800'
                    )}
                  >
                    <FileText size={16} />
                    PDF文档
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, format: 'png' })}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border',
                      config.format === 'png'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800'
                    )}
                  >
                    <Image size={16} />
                    高清图片
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-gray-400 text-sm">报告内容</label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeStatistics}
                    onChange={(e) => setConfig({ ...config, includeStatistics: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">包含统计概览</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeScreenshot}
                    onChange={(e) => setConfig({ ...config, includeScreenshot: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">包含滑槽仿真截图</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeAnomalyList}
                    onChange={(e) => setConfig({ ...config, includeAnomalyList: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">包含异常事件列表</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeBadRows}
                    onChange={(e) => setConfig({ ...config, includeBadRows: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">包含坏行记录说明</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Camera size={18} className="text-blue-400" />
              截图控制
            </h3>

            <button
              onClick={handleCaptureScreenshot}
              disabled={isCapturing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCapturing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Camera size={18} />
              )}
              {isCapturing ? '捕获中...' : '捕获当前预览截图'}
            </button>

            {screenshot && (
              <div className="mt-4">
                <p className="text-gray-400 text-xs mb-2">当前截图预览</p>
                <img
                  src={screenshot}
                  alt="滑槽截图"
                  className="w-full rounded-lg border border-gray-700"
                />
                <button
                  onClick={() => setScreenshot(null)}
                  className="mt-2 w-full text-xs text-gray-500 hover:text-gray-400"
                >
                  清除截图
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-yellow-400" />
              坏行记录
            </h3>

            <div className="space-y-2 mb-4">
              {(Object.keys(badRowTypeStats) as BadRowType[]).map((type) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getBadRowTypeColor(type) }}
                    />
                    <span className="text-gray-300 text-sm">{getBadRowTypeLabel(type)}</span>
                  </div>
                  <span className="text-gray-400 text-sm font-mono">
                    {badRowTypeStats[type]} 条
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleExportBadRows}
              disabled={badRows.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              导出坏行CSV
            </button>
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div
            ref={previewRef}
            className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-800 bg-gray-800/50">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{reportTitle}</h2>
                <p className="text-gray-400 text-sm mt-1">
                  生成时间: {new Date().toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            {config.includeStatistics && (
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-400" />
                  一、统计概览
                </h3>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-xs">行李总数</p>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">
                      {statistics.totalLuggage}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-xs">异常总数</p>
                    <p className="text-2xl font-bold text-red-400 mt-1 font-mono">
                      {statistics.totalAnomalies}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-xs">滑槽数量</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1 font-mono">
                      {statistics.chuteCount}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-xs">分拣口数量</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1 font-mono">
                      {statistics.portCount}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={16} className="text-red-400" />
                      <span className="text-gray-300 text-sm">高度错配</span>
                    </div>
                    <p className="text-xl font-bold text-red-400 font-mono">
                      {statistics.heightMismatchCount} 件
                    </p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge size={16} className="text-orange-400" />
                      <span className="text-gray-300 text-sm">速度过快</span>
                    </div>
                    <p className="text-xl font-bold text-orange-400 font-mono">
                      {statistics.speedOverCount} 件
                    </p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers size={16} className="text-yellow-400" />
                      <span className="text-gray-300 text-sm">行李堆积</span>
                    </div>
                    <p className="text-xl font-bold text-yellow-400 font-mono">
                      {statistics.stackedCount} 件
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={16} className="text-green-400" />
                      <span className="text-gray-300 text-sm">已复核</span>
                    </div>
                    <p className="text-xl font-bold text-green-400 font-mono">
                      {statistics.reviewedCount} 件
                    </p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-yellow-400" />
                      <span className="text-gray-300 text-sm">待复核</span>
                    </div>
                    <p className="text-xl font-bold text-yellow-400 font-mono">
                      {statistics.pendingCount} 件
                    </p>
                  </div>
                </div>
              </div>
            )}

            {config.includeScreenshot && (
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Camera size={18} className="text-blue-400" />
                  二、滑槽仿真截图
                </h3>

                {screenshot ? (
                  <img
                    src={screenshot}
                    alt="滑槽仿真截图"
                    className="w-full rounded-lg border border-gray-700"
                  />
                ) : (
                  <div className="bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-700 py-16 text-center">
                    <Camera size={48} className="text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">点击左侧"捕获当前预览截图"按钮</p>
                    <p className="text-gray-600 text-sm mt-1">获取滑槽3D仿真截图用于报告</p>
                  </div>
                )}
              </div>
            )}

            {config.includeAnomalyList && (
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400" />
                  三、异常事件列表
                </h3>

                {anomalies.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">序号</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">类型</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">位置(m)</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">时间</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">严重程度</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">状态</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">标准值</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">实际值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalies.slice(0, 10).map((anomaly, index) => (
                          <tr
                            key={anomaly.id}
                            className="border-b border-gray-800 hover:bg-gray-800/30"
                          >
                            <td className="py-3 px-3 text-gray-500 font-mono">{index + 1}</td>
                            <td className="py-3 px-3">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${getAnomalyTypeColor(anomaly.type)}20`,
                                  color: getAnomalyTypeColor(anomaly.type),
                                }}
                              >
                                {anomaly.type === 'height_mismatch' && <Package size={12} />}
                                {anomaly.type === 'speed_over' && <Gauge size={12} />}
                                {anomaly.type === 'stacked' && <Layers size={12} />}
                                {getAnomalyTypeLabel(anomaly.type)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-white font-mono">
                              {anomaly.position.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-gray-300">
                              {formatTime(anomaly.timestamp)}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${getSeverityColor(anomaly.severity)}20`,
                                  color: getSeverityColor(anomaly.severity),
                                }}
                              >
                                {getSeverityLabel(anomaly.severity)}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {anomaly.reviewed ? (
                                <span className="text-green-400 text-xs">已复核</span>
                              ) : (
                                <span className="text-yellow-400 text-xs">待复核</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-gray-300 font-mono">
                              {anomaly.expectedValue}
                            </td>
                            <td className="py-3 px-3 text-red-400 font-mono">
                              {anomaly.actualValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {anomalies.length > 10 && (
                      <p className="text-center text-gray-500 text-sm mt-4">
                        显示前 10 条，共 {anomalies.length} 条异常记录
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-800/50 rounded-lg py-12 text-center">
                    <CheckCircle2 size={48} className="text-green-600 mx-auto mb-3" />
                    <p className="text-gray-500">无异常事件</p>
                  </div>
                )}
              </div>
            )}

            {config.includeBadRows && statistics.badRowCount > 0 && (
              <div className="p-6">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <AlertCircle size={18} className="text-yellow-400" />
                  四、坏行记录
                </h3>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    数据清洗过程中共发现 <span className="font-bold">{statistics.badRowCount}</span> 条坏行。
                    这些行已从正常分析数据中排除，详细记录请查看单独导出的坏行CSV文件。
                  </p>
                </div>

                {badRows.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">行号</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">类型</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">描述</th>
                          <th className="text-left py-3 px-3 text-gray-400 font-medium">原始数据</th>
                        </tr>
                      </thead>
                      <tbody>
                        {badRows.slice(0, 5).map((row) => (
                          <tr
                            key={`${row.rowIndex}-${row.type}`}
                            className="border-b border-gray-800"
                          >
                            <td className="py-3 px-3 text-gray-500 font-mono">{row.rowIndex}</td>
                            <td className="py-3 px-3">
                              <span
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${getBadRowTypeColor(row.type)}20`,
                                  color: getBadRowTypeColor(row.type),
                                }}
                              >
                                {getBadRowTypeLabel(row.type)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-300 text-sm">{row.description}</td>
                            <td className="py-3 px-3 text-gray-500 text-xs font-mono truncate max-w-[200px]">
                              {row.rawData || '(空)'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {badRows.length > 5 && (
                      <p className="text-center text-gray-500 text-sm mt-4">
                        显示前 5 条，共 {badRows.length} 条坏行记录
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
