import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, AlertTriangle, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { CarbonTimeline } from '@/components/CarbonTimeline';
import { ParticleBackground } from '@/components/ParticleBackground';
import { getAnomalyLabel, getAnomalyColor } from '@/utils/anomalyUtils';
import { formatNumber } from '@/utils/carbonCalculator';
const CarbonLedgerPage: React.FC = () => {
 const navigate = useNavigate();
 const { carbonLedger, anomalies, currentRound, totalCarbonReduction, totalCarbonEmission, pendingDelayedReductions, goHome, } = useGameStore();
 const netCarbon = totalCarbonReduction - totalCarbonEmission;
 const pendingCount = pendingDelayedReductions.filter(p => !p.applied).length;
 return (<div className="min-h-screen bg-carbon-pattern relative">
 <ParticleBackground intensity={0.6} carbonReduction={totalCarbonReduction}/>
 <div className="relative z-10 container py-8">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-4">
 <button onClick={() => navigate(-1)} className="p-2 rounded-xl glass hover:bg-carbon-700/50 transition-colors">
 <ArrowLeft className="w-5 h-5 text-carbon-300"/>
 </button>
 <div>
 <h1 className="font-display text-2xl font-bold text-carbon-50">碳账本</h1>
 <p className="text-sm text-carbon-400">所有碳排放与减排的完整记录</p>
 </div>
 </div>
 <button onClick={goHome} className="p-2 rounded-xl glass hover:bg-carbon-700/50 transition-colors">
 <Home className="w-5 h-5 text-carbon-300"/>
 </button>
 </div>
 <div className="grid md:grid-cols-4 gap-4 mb-8">
 <div className="glass rounded-2xl p-5">
 <div className="flex items-center gap-2 text-carbon-400 text-sm mb-2">
 <TrendingDown className="w-4 h-4 text-mint-300"/>
 累计碳减排
 </div>
 <div className="font-mono text-3xl font-bold text-mint-300">
 -{formatNumber(totalCarbonReduction)}
 <span className="text-sm font-normal text-carbon-400 ml-1">kg CO₂</span>
 </div>
 </div>
 <div className="glass rounded-2xl p-5">
 <div className="flex items-center gap-2 text-carbon-400 text-sm mb-2">
 <TrendingUp className="w-4 h-4 text-burnt-300"/>
 累计碳排放
 </div>
 <div className="font-mono text-3xl font-bold text-burnt-300">
 +{formatNumber(totalCarbonEmission)}
 <span className="text-sm font-normal text-carbon-400 ml-1">kg CO₂</span>
 </div>
 </div>
 <div className="glass rounded-2xl p-5">
 <div className="flex items-center gap-2 text-carbon-400 text-sm mb-2">
 净碳减排
 </div>
 <div className={`font-mono text-3xl font-bold ${netCarbon >= 0 ? 'text-mint-300' : 'text-burnt-300'}`}>
 {netCarbon >= 0 ? '-' : '+'}{formatNumber(Math.abs(netCarbon))}
 <span className="text-sm font-normal text-carbon-400 ml-1">kg CO₂</span>
 </div>
 </div>
 <div className="glass rounded-2xl p-5">
 <div className="flex items-center gap-2 text-carbon-400 text-sm mb-2">
 <Clock className="w-4 h-4 text-yellow-300"/>
 待生效
 </div>
 <div className="font-mono text-3xl font-bold text-yellow-300">
 {pendingCount}
 <span className="text-sm font-normal text-carbon-400 ml-1">项</span>
 </div>
 </div>
 </div>
 {anomalies.length > 0 && (<div className="glass rounded-2xl p-6 mb-8 border-l-4 border-burnt-400">
 <div className="flex items-center gap-3 mb-4">
 <AlertTriangle className="w-6 h-6 text-burnt-400"/>
 <h2 className="font-display text-xl font-bold text-carbon-50">
 异常事件记录 ({anomalies.length})
 </h2>
 </div>
 <div className="space-y-3 max-h-60 overflow-y-auto">
 {[...anomalies].reverse().map((anomaly) => (<div key={anomaly.id} className={`p-4 rounded-xl border ${anomaly.resolved ? 'bg-carbon-800/50 border-carbon-700' : 'bg-burnt-400/10 border-burnt-400/30'}`}>
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getAnomalyColor(anomaly.type)} bg-carbon-900/50`}>
 {getAnomalyLabel(anomaly.type)}
 </span>
 <span className="text-xs text-carbon-500">第 {anomaly.round} 回合</span>
 </div>
 <span className={`text-xs px-2 py-0.5 rounded-full ${anomaly.resolved ? 'bg-mint-400/20 text-mint-300' : 'bg-burnt-400/20 text-burnt-300'}`}>
 {anomaly.resolved ? '已处理' : '待处理'}
 </span>
 </div>
 <p className="text-sm text-carbon-300">{anomaly.description}</p>
 {anomaly.resolved && anomaly.resolution && (<p className="text-xs text-mint-300 mt-2">✓ {anomaly.resolution}</p>)}
 </div>))}
 </div>
 </div>)}
 {pendingCount > 0 && (<div className="glass rounded-2xl p-6 mb-8 border-l-4 border-yellow-400">
 <div className="flex items-center gap-3 mb-4">
 <Clock className="w-6 h-6 text-yellow-400"/>
 <h2 className="font-display text-xl font-bold text-carbon-50">
 延迟生效的碳减排 ({pendingCount})
 </h2>
 </div>
 <div className="space-y-3">
 {pendingDelayedReductions
 .filter(p => !p.applied)
 .map((pending) => (<div key={pending.id} className="p-4 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
 <div className="flex items-center justify-between">
 <div>
 <div className="font-medium text-carbon-100">{pending.activityName}</div>
 <div className="text-sm text-carbon-400">
 原计划第 {pending.originalRound} 回合生效 → 延迟至第 {pending.effectiveRound} 回合
 </div>
 </div>
 <div className="font-mono font-bold text-mint-300 text-xl">
 -{formatNumber(pending.amount)} kg
 </div>
 </div>
 </div>))}
 </div>
 </div>)}
 <div className="glass rounded-2xl p-6">
 <h2 className="font-display text-xl font-bold text-carbon-50 mb-6">碳记录时间线</h2>
 <CarbonTimeline records={carbonLedger} currentRound={currentRound}/>
 </div>
 </div>
 </div>);
};
export default CarbonLedgerPage;
