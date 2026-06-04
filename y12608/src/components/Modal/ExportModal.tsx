import { useState } from 'react';
import { X, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { generateExportData, downloadFile, validateConsistency } from '../../services/exportService';
import { useCanvasStore } from '../../stores/canvasStore';
import { ExportFormat, ExportSummary } from '../../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [consistencyIssues, setConsistencyIssues] = useState<string[]>([]);
  
  const { tracks, annotations } = useCanvasStore();
  const { addToast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const { valid, issues } = validateConsistency(tracks, annotations);
      setConsistencyIssues(issues);
      
      if (!valid && issues.length > 0) {
        addToast({
          type: 'warning',
          message: `检测到 ${issues.length} 个一致性问题，请确认后导出`
        });
      }
      
      const result = generateExportData(tracks, annotations, format);
      setSummary({
        trackCount: tracks.length,
        annotationCount: annotations.length,
        abnormalCount: annotations.filter(a => a.type === 'abnormal').length,
        pendingCount: annotations.filter(a => a.type === 'pending').length,
        overallStatus: annotations.filter(a => a.type === 'abnormal').length > 0 
          ? 'fail' 
          : annotations.filter(a => a.type === 'pending').length > 0 
            ? 'pending' 
            : 'pass',
        exportedAt: new Date()
      });
      
      downloadFile(result.content, result.filename, result.mimeType);
      
      addToast({
        type: 'success',
        message: `导出成功: ${result.filename}`
      });
      
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      addToast({
        type: 'error',
        message: '导出失败，请重试'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formats: { id: ExportFormat; label: string; desc: string }[] = [
    { id: 'json', label: 'JSON', desc: '完整数据格式，便于后续导入' },
    { id: 'csv', label: 'CSV', desc: '表格格式，可用 Excel 打开' },
    { id: 'pdf', label: 'HTML 报告', desc: '可打印的报告格式' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">导出数据</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  导出格式
                </label>
                <div className="space-y-2">
                  {formats.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`
                        w-full p-4 rounded-xl text-left transition-all
                        ${format === f.id
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }
                      `}
                    >
                      <div className="font-medium text-gray-800">{f.label}</div>
                      <div className="text-sm text-gray-500">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-700 mb-3">导出预览</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">轨迹数量</span>
                    <span className="font-medium">{tracks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">标注数量</span>
                    <span className="font-medium">{annotations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">异常标注</span>
                    <span className={`font-medium ${annotations.filter(a => a.type === 'abnormal').length > 0 ? 'text-status-abnormal' : ''}`}>
                      {annotations.filter(a => a.type === 'abnormal').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">待确认</span>
                    <span className={`font-medium ${annotations.filter(a => a.type === 'pending').length > 0 ? 'text-status-pending' : ''}`}>
                      {annotations.filter(a => a.type === 'pending').length}
                    </span>
                  </div>
                </div>
              </div>
              
              {consistencyIssues.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-700">一致性警告</h4>
                      <ul className="mt-1 text-sm text-yellow-600 space-y-1">
                        {consistencyIssues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {summary && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-600" />
                    <span className="text-green-700 font-medium">导出成功</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Button variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || tracks.length === 0}
                className="gap-2"
              >
                <Download size={16} />
                {isExporting ? '导出中...' : '导出'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
