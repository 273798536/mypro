import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X, Edit3, User } from 'lucide-react';
import type { DataConflict, DataSource } from '@/types';
import { getAnomalyBgColor } from '@/utils/anomalyUtils';
import { formatNumber } from '@/utils/carbonCalculator';
interface DataDiffViewProps {
 activitySource: DataSource;
 electricitySource: DataSource;
 conflicts: DataConflict[];
 onResolveConflict: (conflictId: string, source: 'activity' | 'electricity' | 'manual', manualValue?: number) => void;
 getFieldLabel: (field: string) => string;
}
export const DataDiffView: React.FC<DataDiffViewProps> = ({ activitySource, electricitySource, conflicts, onResolveConflict, getFieldLabel, }) => {
 const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]));
 const [manualEdit, setManualEdit] = useState<string | null>(null);
 const [manualValue, setManualValue] = useState<string>('');
 const allRecords = [...activitySource.records, ...electricitySource.records];
 const rounds = [...new Set(allRecords.map(r => r.round))].sort((a, b) => a - b);
 const toggleRound = (round: number) => {
 const newExpanded = new Set(expandedRounds);
 if (newExpanded.has(round)) {
 newExpanded.delete(round);
 }
 else {
 newExpanded.add(round);
 }
 setExpandedRounds(newExpanded);
 };
 const getConflictForRecord = (record: { round: number; activityId?: string; field: string }) => {
 return conflicts.find(c => c.round === record.round && c.activityId === record.activityId && c.field === record.field);
 };
 const handleManualSave = (conflictId: string) => {
 const value = parseFloat(manualValue);
 if (!isNaN(value)) {
 onResolveConflict(conflictId, 'manual', value);
 setManualEdit(null);
 setManualValue('');
 }
 };
 return (<div className="space-y-6">
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className={`glass rounded-xl p-4 border-l-4 ${activitySource.name === 'activity' ? 'border-mint-400' : 'border-burnt-400'}`}>
 <div className="flex items-center gap-2 mb-2">
 <User className="w-4 h-4 text-mint-300"/>
 <span className="font-medium text-carbon-100">{activitySource.maintainer}</span>
 </div>
 <div className="text-sm text-carbon-400">活动数据</div>
 <div className="text-xs text-carbon-500 mt-1">记录数: {activitySource.records.length}</div>
 </div>
 <div className={`glass rounded-xl p-4 border-l-4 ${electricitySource.name === 'electricity' ? 'border-yellow-400' : 'border-burnt-400'}`}>
 <div className="flex items-center gap-2 mb-2">
 <User className="w-4 h-4 text-yellow-300"/>
 <span className="font-medium text-carbon-100">{electricitySource.maintainer}</span>
 </div>
 <div className="text-sm text-carbon-400">用电数据</div>
 <div className="text-xs text-carbon-500 mt-1">记录数: {electricitySource.records.length}</div>
 </div>
 </div>
 {conflicts.length > 0 && (<div className="bg-burnt-400/10 border border-burnt-400/30 rounded-xl p-4 mb-6">
 <div className="flex items-center gap-2 text-burnt-300 font-medium mb-2">
 <span className="text-xl">⚠️</span>
 发现 {conflicts.length} 处数据冲突需要确认
 </div>
 <div className="text-sm text-carbon-300">
 已解决: {conflicts.filter(c => c.resolved).length} / {conflicts.length}
 </div>
 </div>)}
 {rounds.map(round => (<div key={round} className="glass rounded-2xl overflow-hidden">
 <button onClick={() => toggleRound(round)} className="w-full p-4 flex items-center justify-between hover:bg-carbon-700/30 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-mint-400 text-carbon-900 flex items-center justify-center font-bold font-display">
 {round}
 </div>
 <span className="font-display text-lg font-semibold text-carbon-100">第 {round} 回合数据</span>
 <div className="ml-4 flex gap-2">
 {conflicts.filter(c => c.round === round).length > 0 && (<span className="px-2 py-0.5 bg-burnt-400/20 text-burnt-300 text-xs rounded-full">
 {conflicts.filter(c => c.round === round).length} 处冲突
 </span>)}
 </div>
 </div>
 {expandedRounds.has(round) ? (<ChevronUp className="w-5 h-5 text-carbon-400"/>) : (<ChevronDown className="w-5 h-5 text-carbon-400"/>)}
 </button>
 {expandedRounds.has(round) && (<div className="border-t border-carbon-700/50">
 <div className="grid grid-cols-12 text-xs text-carbon-400 py-2 px-4 bg-carbon-900/50">
 <div className="col-span-3">项目</div>
 <div className="col-span-3">活动数据</div>
 <div className="col-span-3">用电数据</div>
 <div className="col-span-3">操作</div>
 </div>
 {activitySource.records
 .filter(r => r.round === round)
 .map((activityRecord, idx) => {
 const electricRecord = electricitySource.records.find(r => r.round === round && r.activityId === activityRecord.activityId && r.field === activityRecord.field);
 const conflict = getConflictForRecord(activityRecord);
 const hasConflict = conflict && !conflict.resolved;
 return (<div key={`${activityRecord.round}-${activityRecord.activityId}-${activityRecord.field}-${idx}`} className={`grid grid-cols-12 py-3 px-4 border-t border-carbon-700/30 items-center ${hasConflict ? 'diff-conflict' : conflict?.resolved ? 'diff-add' : ''}`}>
 <div className="col-span-3">
 <div className="font-medium text-carbon-200">{activityRecord.activityName}</div>
 <div className="text-xs text-carbon-400">{getFieldLabel(activityRecord.field)}</div>
 </div>
 <div className="col-span-3">
 <div className={`font-mono font-semibold ${conflict?.chosenSource === 'activity' ? 'text-mint-300' : 'text-carbon-100'}`}>
 {formatNumber(activityRecord.value)}
 <span className="text-xs text-carbon-400 ml-1">{activityRecord.unit}</span>
 </div>
 </div>
 <div className="col-span-3">
 {electricRecord ? (<div className={`font-mono font-semibold ${conflict?.chosenSource === 'electricity' ? 'text-mint-300' : 'text-carbon-100'}`}>
 {formatNumber(electricRecord.value)}
 <span className="text-xs text-carbon-400 ml-1">{electricRecord.unit}</span>
 </div>) : (<span className="text-carbon-500">无记录</span>)}
 {hasConflict && electricRecord && (<div className="text-xs text-burnt-300 mt-1">
 差异: {conflict.diffPercent.toFixed(1)}%
 </div>)}
 {conflict?.chosenSource === 'manual' && conflict.finalValue !== undefined && (<div className="text-xs text-mint-300 mt-1">
 手动值: {formatNumber(conflict.finalValue)} {electricRecord.unit}
 </div>)}
 </div>
 <div className="col-span-3">
 {hasConflict && conflict ? (<div className="space-y-2">
 {manualEdit === conflict.id ? (<div className="flex gap-2">
 <input type="number" value={manualValue} onChange={(e) => setManualValue(e.target.value)} className="w-20 px-2 py-1 rounded bg-carbon-800 border border-carbon-600 text-carbon-100 text-sm font-mono" placeholder="输入值"/>
 <button onClick={() => handleManualSave(conflict.id)} className="p-1 rounded bg-mint-500 text-carbon-900 hover:bg-mint-400">
 <Check className="w-4 h-4"/>
 </button>
 <button onClick={() => { setManualEdit(null); setManualValue(''); }} className="p-1 rounded bg-carbon-700 text-carbon-300 hover:bg-carbon-600">
 <X className="w-4 h-4"/>
 </button>
 </div>) : (<div className="flex gap-1 flex-wrap">
 <button onClick={() => onResolveConflict(conflict.id, 'activity')} className="px-2 py-1 text-xs rounded bg-mint-500/20 text-mint-300 hover:bg-mint-500/40 transition-colors flex items-center gap-1">
 <Check className="w-3 h-3"/> 活动
 </button>
 <button onClick={() => onResolveConflict(conflict.id, 'electricity')} className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40 transition-colors flex items-center gap-1">
 <Check className="w-3 h-3"/> 用电
 </button>
 <button onClick={() => { setManualEdit(conflict.id); setManualValue(String(conflict.activityValue)); }} className="px-2 py-1 text-xs rounded bg-carbon-600 text-carbon-200 hover:bg-carbon-500 transition-colors flex items-center gap-1">
 <Edit3 className="w-3 h-3"/> 手动
 </button>
 </div>)}
 </div>) : conflict?.resolved ? (<div className="text-xs text-mint-300 flex items-center gap-1">
 <Check className="w-4 h-4"/>
 已确认
 </div>) : (<div className="text-xs text-carbon-500">无冲突</div>)}
 </div>
 </div>);
 })}
 </div>)}
 </div>))}
 </div>);
};
