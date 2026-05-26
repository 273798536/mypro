import { useState } from 'react';
import {
  X,
  AlertTriangle,
  FileText,
  Edit3,
  Save,
  User,
  Clock,
  Tag,
} from 'lucide-react';
import type { ProcessedDataPoint, Annotation } from '@/types';
import { getAnomalyTypeLabel, getAnomalySeverityColor } from '@/utils/anomalyDetector';
import { useAppStore } from '@/store/useAppStore';

interface DataPointInfoProps {
  point: ProcessedDataPoint;
  onClose: () => void;
}

export const DataPointInfo = ({ point, onClose }: DataPointInfoProps) => {
  const addAnnotation = useAppStore((state) => state.addAnnotation);
  const pointAnnotations = useAppStore((state) =>
    state.annotations.filter((a) => a.dataPointId === point.id)
  );
  const [newAnnotation, setNewAnnotation] = useState('');
  const [author, setAuthor] = useState('研究员');

  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return;
    
    addAnnotation({
      dataPointId: point.id,
      author,
      content: newAnnotation,
      revision: pointAnnotations.length + 1,
    });
    setNewAnnotation('');
  };

  return (
    <div className="bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-700 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-lg font-semibold text-white">数据点详情</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X size={18} className="text-slate-400" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="到期日" value={point.expirationDate} icon={<Clock size={14} />} />
          <InfoItem label="执行价" value={point.strikePrice.toLocaleString()} icon={<Tag size={14} />} />
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-2">隐含波动率</div>
          <div className="text-3xl font-bold text-cyan-400">
            {(point.impliedVolatility * 100).toFixed(2)}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="成交量" value={point.volume.toLocaleString()} />
          <InfoItem label="持仓量" value={point.openInterest.toLocaleString()} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <PriceItem label="买价" value={point.bid} color="text-emerald-400" />
          <PriceItem label="卖价" value={point.ask} color="text-rose-400" />
          <PriceItem label="最新" value={point.lastPrice} color="text-amber-400" />
        </div>

        <div className="border-t border-slate-700 pt-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <FileText size={12} />
            <span>来源: {point.sourceFile} (行 {point.sourceRow})</span>
          </div>
        </div>

        {point.anomalies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-rose-400">
              <AlertTriangle size={16} />
              <span>检测到 {point.anomalies.length} 个异常</span>
            </div>
            <div className="space-y-2">
              {point.anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="bg-slate-900/80 rounded-lg p-3 border-l-4"
                  style={{ borderColor: getAnomalySeverityColor(anomaly.severity) }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: getAnomalySeverityColor(anomaly.severity) + '30',
                        color: getAnomalySeverityColor(anomaly.severity),
                      }}
                    >
                      {getAnomalyTypeLabel(anomaly.type)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {anomaly.severity === 'critical' ? '严重' : anomaly.severity === 'error' ? '错误' : '警告'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{anomaly.message}</p>
                  <div className="mt-2 text-xs text-slate-500">
                    原始行号: {anomaly.details.sourceRow as number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Edit3 size={14} />
            标注记录 ({pointAnnotations.length})
          </h4>

          {pointAnnotations.length > 0 ? (
            <div className="space-y-3">
              {pointAnnotations.map((ann) => (
                <AnnotationItem key={ann.id} annotation={ann} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">暂无标注</p>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="署名"
                className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                placeholder="添加标注..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddAnnotation()}
              />
              <button
                onClick={handleAddAnnotation}
                disabled={!newAnnotation.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded text-sm font-medium text-white transition-colors"
              >
                <Save size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="bg-slate-900/50 rounded-lg p-3">
    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
      {icon}
      {label}
    </div>
    <div className="text-sm font-medium text-white">{value}</div>
  </div>
);

const PriceItem = ({ label, value, color }: { label: string; value: number | null; color: string }) => (
  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <div className={`text-sm font-medium ${value === null ? 'text-slate-600' : color}`}>
      {value === null ? 'N/A' : value.toFixed(2)}
    </div>
  </div>
);

const AnnotationItem = ({ annotation }: { annotation: Annotation }) => (
  <div className="bg-slate-900/50 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
          <User size={12} className="text-slate-400" />
        </div>
        <span className="text-sm font-medium text-slate-300">{annotation.author}</span>
        <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
          v{annotation.revision}
        </span>
      </div>
      <span className="text-xs text-slate-500">
        {new Date(annotation.timestamp).toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
    <p className="text-sm text-slate-300">{annotation.content}</p>
    {annotation.previousValue !== undefined && annotation.newValue !== undefined && (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-slate-500">修正:</span>
        <span className="text-rose-400 line-through">{(annotation.previousValue * 100).toFixed(2)}%</span>
        <span className="text-slate-600">→</span>
        <span className="text-emerald-400">{(annotation.newValue * 100).toFixed(2)}%</span>
      </div>
    )}
  </div>
);
