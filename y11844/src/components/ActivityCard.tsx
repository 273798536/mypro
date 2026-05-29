import React from 'react';
import * as Icons from 'lucide-react';
import type { Activity } from '@/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/data/gameConfig';
import { formatNumber } from '@/utils/carbonCalculator';
import { getAnomalyLabel, getAnomalyColor } from '@/utils/anomalyUtils';
interface ActivityCardProps {
 activity: Activity;
 selectedCount: number;
 onSelect: (count: number) => void;
 disabled?: boolean;
}
export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, selectedCount, onSelect, disabled = false, }) => {
 const IconComponent = (Icons as unknown as Record<string, React.FC<{ className?: string }>>)[activity.icon] || Icons.Circle;
 const categoryColor = CATEGORY_COLORS[activity.category];
 const isSelected = selectedCount > 0;
 const canIncrease = selectedCount < activity.maxTimesPerRound && !disabled;
 const isAnomaly = activity.isAnomalySample;
 return (<div className={`relative glass rounded-2xl p-5 transition-all duration-300 ${isSelected ? 'ring-2 ring-mint-400 shadow-lg shadow-mint-400/20 translate-y-[-4px]' : 'hover:translate-y-[-2px] hover:shadow-xl'} ${disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isAnomaly ? 'border-2 border-burnt-400 anomaly-pulse' : ''}`}>
 {isAnomaly && activity.anomalyType && (<div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold ${getAnomalyColor(activity.anomalyType)} bg-carbon-900 border border-current`}>
 ⚠️ {getAnomalyLabel(activity.anomalyType)}
 </div>)}
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className={`p-3 rounded-xl glass-light ${isAnomaly ? 'bg-burnt-400/20' : ''}`}>
 <IconComponent className={`w-6 h-6 ${categoryColor}`}/>
 </div>
 <div>
 <h3 className="font-display font-semibold text-lg text-carbon-50">{activity.name}</h3>
 <span className={`text-xs ${categoryColor}`}>
 {CATEGORY_LABELS[activity.category]}
 {activity.isLowCarbon && <span className="ml-2 px-2 py-0.5 bg-mint-400/20 text-mint-300 rounded-full">低碳</span>}
 </span>
 </div>
 </div>
 </div>
 <p className="text-sm text-carbon-300 mb-4 line-clamp-2 min-h-[40px]">
 {activity.description}
 </p>
 <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
 <div className="glass-light rounded-lg p-2 text-center">
 <div className="text-carbon-400 text-xs">经费</div>
 <div className="font-mono font-semibold text-carbon-100">¥{formatNumber(activity.cost.budget)}</div>
 </div>
 <div className="glass-light rounded-lg p-2 text-center">
 <div className="text-carbon-400 text-xs">用电</div>
 <div className="font-mono font-semibold text-carbon-100">{formatNumber(activity.cost.electricity)} kWh</div>
 </div>
 <div className="glass-light rounded-lg p-2 text-center">
 <div className="text-carbon-400 text-xs">交通</div>
 <div className="font-mono font-semibold text-carbon-100">{formatNumber(activity.cost.transport)} 人</div>
 </div>
 <div className="glass-light rounded-lg p-2 text-center">
 <div className="text-carbon-400 text-xs">碳减排</div>
 <div className="font-mono font-semibold text-mint-300">-{formatNumber(activity.carbonReduction)} kg</div>
 </div>
 </div>
 {activity.delayRisk > 0 && (<div className="text-xs text-yellow-400/80 mb-4 flex items-center gap-1">
 <Icons.Clock className="w-3 h-3"/>
 延迟风险: {Math.round(activity.delayRisk * 100)}%
 </div>)}
 <div className="flex items-center justify-between">
 <span className="text-sm text-carbon-400">
 每回合最多选择 {activity.maxTimesPerRound} 次
 </span>
 <div className="flex items-center gap-2">
 <button onClick={() => onSelect(Math.max(0, selectedCount - 1))} disabled={selectedCount === 0 || disabled} className="w-8 h-8 rounded-full glass-light flex items-center justify-center text-carbon-200 hover:bg-mint-400/20 hover:text-mint-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
 <Icons.Minus className="w-4 h-4"/>
 </button>
 <span className="w-8 text-center font-mono font-semibold text-lg text-carbon-100">
 {selectedCount}
 </span>
 <button onClick={() => onSelect(Math.min(activity.maxTimesPerRound, selectedCount + 1))} disabled={!canIncrease} className="w-8 h-8 rounded-full glass-light flex items-center justify-center text-carbon-200 hover:bg-mint-400/20 hover:text-mint-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
 <Icons.Plus className="w-4 h-4"/>
 </button>
 </div>
 </div>
 </div>);
};
