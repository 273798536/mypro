import React from 'react';
import { X, Camera, FileText, Download, CheckCircle } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportScreenshot: () => void;
  onExportReport: () => void;
  onExportJSON: () => void;
  isExporting: boolean;
  exportStatus: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExportScreenshot,
  onExportReport,
  onExportJSON,
  isExporting,
  exportStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">导出</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {isExporting && (
            <div className="p-3 bg-blue-900/30 border border-blue-700 rounded text-sm text-blue-300">
              {exportStatus}
            </div>
          )}

          <button
            onClick={onExportScreenshot}
            disabled={isExporting}
            className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Camera size={20} className="text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">导出截图</p>
              <p className="text-xs text-slate-400">保存当前3D视图为PNG图片</p>
            </div>
            <Download size={16} className="ml-auto text-slate-400" />
          </button>

          <button
            onClick={onExportReport}
            disabled={isExporting}
            className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-emerald-900/50 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">导出理赔报告</p>
              <p className="text-xs text-slate-400">生成PDF格式的完整理赔报告</p>
            </div>
            <Download size={16} className="ml-auto text-slate-400" />
          </button>

          <button
            onClick={onExportJSON}
            disabled={isExporting}
            className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-amber-900/50 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">导出标注数据</p>
              <p className="text-xs text-slate-400">导出JSON格式的标注信息</p>
            </div>
            <Download size={16} className="ml-auto text-slate-400" />
          </button>
        </div>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle size={12} className="text-emerald-400" />
            <span>所有导出内容包含完整版本历史和修正痕迹</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
