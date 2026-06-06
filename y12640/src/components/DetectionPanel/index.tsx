import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import type { DetectionResult } from '@/types';

export default function DetectionPanel() {
  const { detections, status } = useCanvasStore();
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="text-red-400" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={16} />;
      default:
        return <CheckCircle className="text-green-400" size={16} />;
    }
  };
  
  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-900/20 border-red-800';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-800';
      default:
        return 'bg-green-900/20 border-green-800';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'empty':
        return '空值检测';
      case 'duplicate':
        return '重复检测';
      case 'flipped':
        return '坐标翻转';
      case 'scale_error':
        return '比例尺错误';
      case 'mixed_notes':
        return '备注混写';
      default:
        return '其他';
    }
  };
  
  const errorCount = detections.filter(d => d.severity === 'error').length;
  const warningCount = detections.filter(d => d.severity === 'warning').length;
  const normalCount = detections.filter(d => d.severity === 'normal').length;
  
  return (
    <div className="bg-slate-800 rounded-lg p-4 shadow-lg h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">检测结果</h3>
        {status !== 'idle' && (
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded-full">
              {errorCount} 错误
            </span>
            <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded-full">
              {warningCount} 待确认
            </span>
            <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded-full">
              {normalCount} 正常
            </span>
          </div>
        )}
      </div>
      
      {status === 'idle' ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-slate-400 text-xs">请先选择样例数据开始检测</p>
        </div>
      ) : detections.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <CheckCircle className="text-green-400 mb-2" size={24} />
            <p className="text-green-400 text-sm font-medium">数据完整无问题</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {detections.map((detection: DetectionResult) => (
            <div
              key={detection.id}
              className={`p-3 rounded-lg border ${getSeverityBg(detection.severity)}`}
            >
              <div className="flex items-start gap-2">
                {getSeverityIcon(detection.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">
                      {getTypeLabel(detection.type)}
                    </span>
                    <span className={`text-xs ${
                      detection.severity === 'error' ? 'text-red-400' :
                      detection.severity === 'warning' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {detection.severity === 'error' ? '错误' :
                       detection.severity === 'warning' ? '待确认' :
                       '正常'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-1">
                    {detection.message}
                  </p>
                  <p className="text-xs text-slate-500">
                    {detection.reference}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {status !== 'idle' && detections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">结果分类:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-green-900/20 rounded-lg">
              <p className="text-xs text-green-400 font-medium">可直接用</p>
              <p className="text-xs text-slate-300 mt-1">
                {normalCount} 条记录
              </p>
            </div>
            <div className="p-2 bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-yellow-400 font-medium">需复核</p>
              <p className="text-xs text-slate-300 mt-1">
                {errorCount + warningCount} 条记录
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}