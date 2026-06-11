import { useState, useMemo } from 'react';
import { X, Download, FileText, Image, Table, Copy, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDataStore } from '@/store/useDataStore';
import { exportPointsToCSV, exportRemarksToCSV, downloadCSV, parseCSVToPoints } from '@/utils/csv';
import { captureElement, downloadImage } from '@/utils/screenshot';
import { formatDateTime } from '@/utils/date';
import { detectMixedUnits } from '@/utils/unit';

const tabs = [
  { id: 'csv', label: 'CSV 导出', icon: Table },
  { id: 'screenshot', label: '截图导出', icon: Image },
  { id: 'report', label: '报告生成', icon: FileText },
  { id: 'import', label: 'CSV 导入', icon: Download },
] as const;

export default function ExportModal() {
  const { showExportModal, toggleExportModal, viewMode, filters } = useAppStore();
  const { points, remarkHistory, importPoints, resetData } = useDataStore();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['id']>('csv');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const filteredPoints = useMemo(() => {
    let result = [...points];

    if (filters.boomIds.length > 0) {
      result = result.filter(p => filters.boomIds.includes(p.boomId));
    }

    if (viewMode === 'anomaly') {
      result = result.filter(p => p.isAnomaly);
    } else if (viewMode === 'normal') {
      result = result.filter(p => !p.isAnomaly);
    } else if (viewMode === 'mixed') {
      const mixed = detectMixedUnits(points);
      const mixedIds = new Set(mixed.map(m => m.pointId));
      result = result.filter(p => mixedIds.has(p.id));
    }

    return result;
  }, [points, viewMode, filters]);

  if (!showExportModal) return null;

  const handleExportPoints = () => {
    const csv = exportPointsToCSV(filteredPoints);
    const filename = `吊杆时序数据_${formatDateTime(Date.now()).replace(/[:\s]/g, '-')}.csv`;
    downloadCSV(csv, filename);
  };

  const handleExportRemarks = () => {
    const relevantRemarks = remarkHistory.filter(r =>
      filteredPoints.some(p => p.id === r.pointId)
    );
    const csv = exportRemarksToCSV(relevantRemarks);
    const filename = `备注历史_${formatDateTime(Date.now()).replace(/[:\s]/g, '-')}.csv`;
    downloadCSV(csv, filename);
  };

  const handleCaptureChart = async () => {
    const chartEl = document.getElementById('timeline-chart');
    if (!chartEl) return;

    try {
      const dataUrl = await captureElement(chartEl);
      const filename = `时序图表_${formatDateTime(Date.now()).replace(/[:\s]/g, '-')}.png`;
      downloadImage(dataUrl, filename);
    } catch (err) {
      console.error('截图失败:', err);
    }
  };

  const handleCopyReport = () => {
    const anomalyCount = filteredPoints.filter(p => p.isAnomaly).length;
    const mixedCount = detectMixedUnits(filteredPoints).length;
    const pendingCount = filteredPoints.filter(p => p.status === 'pending').length;

    const report = `剧院吊杆阵列时序回放 - 报告摘要
生成时间: ${formatDateTime(Date.now())}
数据范围: ${viewMode === 'all' ? '全部数据' : viewMode === 'anomaly' ? '仅异常' : viewMode === 'normal' ? '仅正常' : '单位混写'}
吊杆筛选: ${filters.boomIds.length > 0 ? filters.boomIds.join(', ') : '全部'}

统计摘要:
- 总记录数: ${filteredPoints.length}
- 异常记录: ${anomalyCount}
- 单位混写: ${mixedCount}
- 待处理: ${pendingCount}

异常类型分布:
- 数值越界: ${filteredPoints.filter(p => p.anomalyType === 'value_out_of_range').length}
- 楼层异常: ${filteredPoints.filter(p => p.anomalyType === 'floor_mismatch').length}
- 其他异常: ${filteredPoints.filter(p => p.anomalyType === 'other').length}
`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedPoints = parseCSVToPoints(content);
        if (importedPoints.length > 0) {
          importPoints(importedPoints);
          setImportStatus('success');
          setTimeout(() => setImportStatus('idle'), 2000);
        } else {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 2000);
        }
      } catch {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 2000);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('确定要重置为模拟数据吗？所有修改将丢失。')) {
      resetData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-[500px] max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-glow/20">
          <h2 className="text-base font-semibold text-text-primary">导出中心</h2>
          <button
            onClick={toggleExportModal}
            className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-border-glow/20">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all duration-200 border-b-2 ${
                  isActive
                    ? 'text-tech-blue border-tech-blue'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="text-sm text-text-secondary mb-2">
                当前筛选: {filteredPoints.length} 条记录
              </div>

              <button
                onClick={handleExportPoints}
                className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-tech-blue/20 flex items-center justify-center">
                  <Table className="w-5 h-5 text-tech-blue" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-text-primary">点位数据 CSV</h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    导出当前筛选的所有点位数据，含异常标记、备注、状态
                  </p>
                </div>
                <Download className="w-4 h-4 text-text-muted" />
              </button>

              <button
                onClick={handleExportRemarks}
                className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-info-purple/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-info-purple" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-text-primary">备注历史 CSV</h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    导出相关点位的所有历史备注，含时间、操作人
                  </p>
                </div>
                <Download className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          )}

          {activeTab === 'screenshot' && (
            <div className="space-y-4">
              <button
                onClick={handleCaptureChart}
                className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-success-green/20 flex items-center justify-center">
                  <Image className="w-5 h-5 text-success-green" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-text-primary">当前图表截图</h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    导出当前视图的高清截图，含所有标注和数据
                  </p>
                </div>
                <Download className="w-4 h-4 text-text-muted" />
              </button>

              <div className="bg-bg-card/50 rounded-lg p-3">
                <p className="text-xs text-text-secondary">
                  💡 提示：截图会捕获当前图表的可见区域，建议先调整到合适的缩放级别再导出。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-4">
              <button
                onClick={handleCopyReport}
                className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-warning-yellow/20 flex items-center justify-center">
                  {copied ? (
                    <Check className="w-5 h-5 text-success-green" />
                  ) : (
                    <Copy className="w-5 h-5 text-warning-yellow" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-text-primary">
                    {copied ? '已复制到剪贴板' : '复制报告摘要'}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    生成文字版报告摘要，可直接粘贴到会议材料
                  </p>
                </div>
              </button>

              <div className="bg-bg-card/50 rounded-lg p-4 font-mono text-xs text-text-secondary space-y-1">
                <p className="text-text-primary font-medium">报告预览:</p>
                <p>总记录数: {filteredPoints.length}</p>
                <p>异常记录: {filteredPoints.filter(p => p.isAnomaly).length}</p>
                <p>单位混写: {detectMixedUnits(filteredPoints).length}</p>
                <p>待处理: {filteredPoints.filter(p => p.status === 'pending').length}</p>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  选择 CSV 文件
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-tech-blue/20 file:text-tech-blue hover:file:bg-tech-blue/30"
                />
                {importStatus === 'success' && (
                  <p className="text-xs text-success-green mt-2 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> 导入成功
                  </p>
                )}
                {importStatus === 'error' && (
                  <p className="text-xs text-alert-red mt-2">导入失败，请检查文件格式</p>
                )}
              </div>

              <div className="border-t border-border-glow/20 pt-4">
                <p className="text-xs text-text-secondary mb-3">数据管理</p>
                <button
                  onClick={handleResetData}
                  className="btn-danger w-full !py-2 text-xs"
                >
                  重置为模拟数据
                </button>
              </div>

              <div className="bg-bg-card/50 rounded-lg p-3">
                <p className="text-xs text-text-secondary">
                  📋 CSV 格式要求：包含吊杆编号、时间、数值、单位、楼层、楼层单位、是否异常等列
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
