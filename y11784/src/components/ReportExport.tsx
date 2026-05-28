import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Image, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { usePathStore } from '@/store/pathStore';
import { useResultStore } from '@/store/resultStore';
import { useRevisionStore } from '@/store/revisionStore';
import { generateMarkdownReport, downloadMarkdown } from '@/utils/export/markdownGenerator';
import { generatePdfReport, downloadScreenshot } from '@/utils/export/pdfGenerator';
import type { ExportConfig } from '@/types';
import { cn } from '@/lib/utils';

interface ReportExportProps {
  visualizationElementId?: string;
}

const defaultExportConfig: ExportConfig = {
  includeVectorField: true,
  includePaths: true,
  includeResults: true,
  includeAnomalies: true,
  includeRevisionHistory: false,
};

export function ReportExport({ visualizationElementId = 'visualization-canvas' }: ReportExportProps) {
  const { vectorFields, paths, activeVectorFieldId } = usePathStore();
  const { results, getAllAnomalies } = useResultStore();
  const { entries } = useRevisionStore();

  const [isOpen, setIsOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(defaultExportConfig);
  const [reportTitle, setReportTitle] = useState('曲线积分路径比较报告');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedVectorField = vectorFields.find((vf) => vf.id === activeVectorFieldId) || null;
  const selectedPaths = paths.filter((p) => p.vectorFieldId === activeVectorFieldId);
  const anomalies = getAllAnomalies();

  const handleConfigChange = (key: keyof ExportConfig, value: boolean) => {
    setExportConfig((prev) => ({ ...prev, [key]: value }));
  };

  const showStatus = (type: 'success' | 'error', message: string) => {
    setExportStatus({ type, message });
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportMarkdown = async () => {
    try {
      setIsExporting(true);
      const content = generateMarkdownReport(
        selectedVectorField,
        selectedPaths,
        results,
        anomalies,
        entries,
        exportConfig,
        reportTitle
      );
      const filename = `${reportTitle}_${Date.now()}.md`;
      downloadMarkdown(content, filename);
      showStatus('success', 'Markdown 报告导出成功');
    } catch (error) {
      showStatus('error', `导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await generatePdfReport(
        visualizationElementId,
        selectedVectorField,
        selectedPaths,
        results,
        anomalies,
        entries,
        exportConfig,
        reportTitle
      );
      showStatus('success', 'PDF 报告导出成功');
    } catch (error) {
      showStatus('error', `导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportScreenshot = async () => {
    try {
      setIsExporting(true);
      const filename = `曲线积分可视化_${Date.now()}.png`;
      await downloadScreenshot(visualizationElementId, filename);
      showStatus('success', '截图导出成功');
    } catch (error) {
      showStatus('error', `导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDataJson = () => {
    try {
      setIsExporting(true);
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        vectorFields: exportConfig.includeVectorField ? vectorFields : [],
        paths: exportConfig.includePaths ? paths : [],
        results: exportConfig.includeResults ? results : [],
        anomalies: exportConfig.includeAnomalies ? anomalies : [],
        revisions: exportConfig.includeRevisionHistory ? entries : [],
      };
      const content = JSON.stringify(exportData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `曲线积分数据_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus('success', '数据导出成功');
    } catch (error) {
      showStatus('error', `导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div
        className="px-4 py-3 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">报告导出</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {isOpen ? '收起' : '展开'}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              报告标题
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入报告标题"
            />
          </div>

          <div>
            <div className="flex items-center gap-1 mb-2">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-700">导出内容</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(defaultExportConfig) as Array<keyof ExportConfig>).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={exportConfig[key]}
                    onChange={(e) => handleConfigChange(key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600">
                    {key === 'includeVectorField' && '向量场信息'}
                    {key === 'includePaths' && '路径列表'}
                    {key === 'includeResults' && '积分结果'}
                    {key === 'includeAnomalies' && '异常报告'}
                    {key === 'includeRevisionHistory' && '修订历史'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleExportMarkdown}
              disabled={isExporting}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
                isExporting
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              <FileText className="w-4 h-4" />
              导出 Markdown 报告
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
                isExporting
                  ? 'bg-red-100 text-red-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              )}
            >
              <FileText className="w-4 h-4" />
              导出 PDF 报告 (含图表)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportScreenshot}
                disabled={isExporting}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
                  isExporting
                    ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                )}
              >
                <Image className="w-4 h-4" />
                保存截图
              </button>

              <button
                onClick={handleExportDataJson}
                disabled={isExporting}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
                  isExporting
                    ? 'bg-green-100 text-green-400 cursor-not-allowed'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                )}
              >
                <FileSpreadsheet className="w-4 h-4" />
                导出数据
              </button>
            </div>
          </div>

          {exportStatus && (
            <div className={cn(
              'flex items-center gap-2 p-3 rounded-lg text-sm',
              exportStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              {exportStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {exportStatus.message}
            </div>
          )}

          <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            <p>• PDF 报告会自动嵌入可视化区域截图</p>
            <p>• 数据导出包含所有选择的内容，可用于备份或分享</p>
          </div>
        </div>
      )}
    </div>
  );
}
