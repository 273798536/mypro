import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import type { AnomalyEvent } from '@/types';
import { getAnomalyLabel, getAnomalyColor, getAnomalyBgColor } from '@/utils/anomalyUtils';
interface AnomalyAlertProps {
 anomaly: AnomalyEvent | null;
 onClose: () => void;
 onResolve?: () => void;
 showResolve?: boolean;
}
export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ anomaly, onClose, onResolve, showResolve = true, }) => {
 if (!anomaly) return null;
 const isCritical = anomaly.severity === 'critical';
 return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
 <div className={`w-full max-w-lg glass rounded-3xl p-6 border-2 ${isCritical ? 'border-burnt-400 anomaly-pulse' : 'border-yellow-400'} animate-slide-up`}>
 <div className="flex items-start justify-between mb-6">
 <div className="flex items-center gap-4">
 <div className={`p-4 rounded-2xl ${isCritical ? 'bg-burnt-400/20' : 'bg-yellow-400/20'}`}>
 {isCritical ? (<AlertCircle className="w-8 h-8 text-burnt-400"/>) : (<AlertTriangle className="w-8 h-8 text-yellow-400"/>)}
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getAnomalyBgColor(anomaly.type)} border`}>
 {getAnomalyLabel(anomaly.type)}
 </span>
 <span className={`text-xs ${isCritical ? 'text-burnt-400' : 'text-yellow-400'}`}>
 {isCritical ? '严重' : '警告'}
 </span>
 </div>
 <h3 className="font-display text-xl font-bold text-carbon-50">
 {isCritical ? '异常检测' : '注意事项'}
 </h3>
 </div>
 </div>
 <button onClick={onClose} className="p-2 rounded-lg hover:bg-carbon-700/50 text-carbon-400 hover:text-carbon-100 transition-colors">
 <X className="w-5 h-5"/>
 </button>
 </div>
 <div className="space-y-4 mb-6">
 <p className="text-carbon-200 leading-relaxed">
 {anomaly.description}
 </p>
 {anomaly.data && Object.keys(anomaly.data).length > 0 && (<div className="glass-light rounded-xl p-4">
 <div className="text-sm text-carbon-400 mb-2">异常详情</div>
 <div className="space-y-2">
 {Object.entries(anomaly.data).map(([key, value]) => (<div key={key} className="flex justify-between items-center text-sm">
 <span className="text-carbon-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
 <span className={`font-mono font-semibold ${isCritical ? 'text-burnt-400' : 'text-yellow-400'}`}>
 {String(value)}
 </span>
 </div>))}
 </div>
 </div>)}
 {anomaly.activityName && (<div className="flex items-center gap-2 text-sm text-carbon-300">
 <span>关联活动:</span>
 <span className="font-medium text-carbon-100">{anomaly.activityName}</span>
 </div>)}
 </div>
 <div className="flex gap-3">
 <button onClick={onClose} className="flex-1 py-3 px-6 rounded-xl glass-light text-carbon-200 hover:bg-carbon-700/50 transition-colors font-medium">
 知道了
 </button>
 {showResolve && onResolve && (<button onClick={() => {
 onResolve();
 onClose();
 }} className="flex-1 py-3 px-6 rounded-xl bg-mint-500 text-carbon-900 hover:bg-mint-400 transition-colors font-medium flex items-center justify-center gap-2">
 <CheckCircle className="w-4 h-4"/>
 标记已处理
 </button>)}
 </div>
 </div>
 </div>);
};
