import { useState } from 'react';
import { X, Download, Camera, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { generateExportRecord, exportToYAML, downloadFile } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function ExportModal({ isOpen, onClose, canvasRef }: ExportModalProps) {
  const { modelName, currentWindParams, riskPoints, dataGaps, addExportRecord } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let screenshotUrl = '';
      if (canvasRef.current) {
        screenshotUrl = canvasRef.current.toDataURL('image/png');
      }

      const record = generateExportRecord(
        modelName,
        currentWindParams,
        riskPoints,
        screenshotUrl,
        dataGaps.length > 0,
        dataGaps.join('; ')
      );

      addExportRecord(record);

      const yamlContent = exportToYAML(record);
      downloadFile(yamlContent, `aero-analysis-${record.id}.yaml`, 'application/yaml');

      if (screenshotUrl) {
        const link = document.createElement('a');
        link.href = screenshotUrl;
        link.download = `aero-screenshot-${record.id}.png`;
        link.click();
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold text-lg">导出详情</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-white text-sm font-medium">导出信息</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">模型名称</span>
                <span className="text-white font-mono">{modelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">风速</span>
                <span className="text-cyan-400 font-mono">{currentWindParams.speed} m/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">偏航角</span>
                <span className="text-cyan-400 font-mono">{currentWindParams.yawAngle}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">俯仰角</span>
                <span className="text-cyan-400 font-mono">{currentWindParams.pitchAngle}°</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm font-medium">风险摘要</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-red-900/30 rounded p-2">
                <div className="text-red-400 text-lg font-bold">
                  {riskPoints.filter((r) => r.type === 'angle_violation').length}
                </div>
                <div className="text-slate-400 text-[10px]">角度越界</div>
              </div>
              <div className="bg-yellow-900/30 rounded p-2">
                <div className="text-yellow-400 text-lg font-bold">
                  {riskPoints.filter((r) => r.type === 'oversampling').length}
                </div>
                <div className="text-slate-400 text-[10px]">采样过密</div>
              </div>
              <div className="bg-blue-900/30 rounded p-2">
                <div className="text-blue-400 text-lg font-bold">
                  {riskPoints.filter((r) => r.type === 'reverse_flow').length}
                </div>
                <div className="text-slate-400 text-[10px]">尾流反向</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
    </div>
  );
}
