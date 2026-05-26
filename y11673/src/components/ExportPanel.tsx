import { useState } from 'react';
import { SimulationParams, SimulationStats, SimulationError, IntegrationResult } from '../types';
import { screenshotExporter } from '../utils/screenshot';
import { paramRecorder } from '../utils/paramRecorder';
import { Camera, Download, FileJson, Image, Loader2 } from 'lucide-react';

interface ExportPanelProps {
  params: SimulationParams;
  stats: SimulationStats;
  errors: SimulationError[];
  results: IntegrationResult[];
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  params,
  stats,
  errors,
  results,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleScreenshot = () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      const result = screenshotExporter.captureScreenshot(params, stats);

      if (result) {
        setLastScreenshot(result.dataUrl);
        screenshotExporter.downloadScreenshot(result.dataUrl, result.filename);
        setExportMessage('截图已保存');
      } else {
        setExportMessage('截图失败，请重试');
      }
    } catch (error) {
      setExportMessage('导出出错: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  const handleExportParams = () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      paramRecorder.downloadExport(params, stats, errors, results);
      setExportMessage('参数已导出');
    } catch (error) {
      setExportMessage('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  return (
    <div className="glass-panel rounded-lg p-4">
      <h3 className="text-sm font-display font-semibold text-gravity-orange mb-3 flex items-center gap-2">
        <Download size={16} />
        导出功能
      </h3>

      <div className="space-y-3">
        <button
          onClick={handleScreenshot}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-space-blue hover:bg-space-blue/80 text-ray-cyan rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-ray-cyan/30 hover:border-ray-cyan/50"
        >
          {isExporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Camera size={18} />
          )}
          导出截图
        </button>

        <button
          onClick={handleExportParams}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-space-blue hover:bg-space-blue/80 text-gravity-orange rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gravity-orange/30 hover:border-gravity-orange/50"
        >
          {isExporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <FileJson size={18} />
          )}
          导出参数记录
        </button>

        {exportMessage && (
          <p className="text-xs text-center text-success-green py-1">
            {exportMessage}
          </p>
        )}

        {lastScreenshot && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">上次截图预览:</p>
            <div className="relative rounded-lg overflow-hidden border border-space-blue">
              <img
                src={lastScreenshot}
                alt="Last screenshot"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-space-blue">
        <h4 className="text-xs font-display font-medium text-gray-400 mb-2">
          导出内容说明
        </h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li className="flex items-center gap-1">
            <Image size={12} className="text-ray-cyan" />
            截图: PNG格式，含参数水印
          </li>
          <li className="flex items-center gap-1">
            <FileJson size={12} className="text-gravity-orange" />
            参数: JSON格式，完整记录
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ExportPanel;
