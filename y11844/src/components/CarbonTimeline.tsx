import React from 'react';
import { ArrowDown, ArrowUp, Clock, AlertTriangle } from 'lucide-react';
import type { CarbonRecord } from '@/types';
import { formatNumber } from '@/utils/carbonCalculator';
interface CarbonTimelineProps {
 records: CarbonRecord[];
 currentRound: number;
}
export const CarbonTimeline: React.FC<CarbonTimelineProps> = ({ records, currentRound }) => {
 const sortedRecords = [...records].sort((a, b) => a.timestamp - b.timestamp);
 const groupedByRound: Record<number, CarbonRecord[]> = {};
 sortedRecords.forEach(record => {
 if (!groupedByRound[record.round]) {
 groupedByRound[record.round] = [];
 }
 groupedByRound[record.round].push(record);
 });
 return (<div className="space-y-8">
 {Object.entries(groupedByRound).map(([round, roundRecords]) => (<div key={round} className="relative animate-slide-up">
 <div className="flex items-center gap-4 mb-4">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold ${Number(round) <= currentRound ? 'bg-mint-400 text-carbon-900' : 'bg-carbon-700 text-carbon-400'}`}>
 {round}
 </div>
 <div className="font-display text-lg font-semibold text-carbon-100">
 第 {round} 回合
 </div>
 </div>
 <div className="ml-5 pl-8 border-l-2 border-carbon-700 space-y-4">
 {roundRecords.map((record, idx) => (<div key={record.id} className={`relative p-4 glass rounded-xl animate-fade-in ${record.delayed && record.effectiveRound && record.effectiveRound > Number(round) ? 'opacity-60' : ''}`} style={{ animationDelay: `${idx * 100}ms` }}>
 <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-4 border-carbon-900 ${record.type === 'reduction' ? 'bg-mint-400' : 'bg-burnt-400'}`}/>
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 {record.type === 'reduction' ? (<div className="p-2 rounded-lg bg-mint-400/20">
 <ArrowDown className="w-4 h-4 text-mint-300"/>
 </div>) : (<div className="p-2 rounded-lg bg-burnt-400/20">
 <ArrowUp className="w-4 h-4 text-burnt-300"/>
 </div>)}
 <div>
 <div className="font-medium text-carbon-100">{record.source}</div>
 <div className="text-xs text-carbon-400">
 {record.type === 'reduction' ? '碳减排' : '碳排放'}
 {record.isOffset && <span className="ml-2 text-mint-400">· 已抵扣</span>}
 {record.delayed && (<span className="ml-2 text-yellow-400 flex items-center gap-1">
 <Clock className="w-3 h-3 inline"/>
 {record.effectiveRound && record.effectiveRound > Number(round) ? `延迟中 (第${record.effectiveRound}回合生效)` : '延迟生效'}
 </span>)}
 </div>
 </div>
 </div>
 <div className={`font-mono font-bold text-lg ${record.type === 'reduction' ? 'text-mint-300' : 'text-burnt-300'}`}>
 {record.type === 'reduction' ? '-' : '+'}{formatNumber(record.amount)}
 <span className="text-sm font-normal text-carbon-400 ml-1">kg CO₂</span>
 </div>
 </div>
 {record.type === 'reduction' && !record.isOffset && (<div className="mt-2 text-xs text-carbon-400 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3 text-yellow-400"/>
 未用于抵扣
 </div>)}
 </div>))}
 </div>
 </div>))}
 {sortedRecords.length === 0 && (<div className="text-center py-12 text-carbon-400">
 <div className="text-6xl mb-4">🌱</div>
 <div className="text-lg">暂无碳记录</div>
 <div className="text-sm mt-2">开始选择活动以记录碳排放和减排</div>
 </div>)}
 </div>);
};
