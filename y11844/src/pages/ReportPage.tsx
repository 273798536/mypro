import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Download, RefreshCw, AlertTriangle, TrendingDown, TrendingUp, DollarSign, Zap, Users, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { ScoreRing } from '@/components/ScoreRing';
import { ParticleBackground } from '@/components/ParticleBackground';
import { getAnomalyLabel, getAnomalyColor } from '@/utils/anomalyUtils';
import { formatNumber } from '@/utils/carbonCalculator';
import { GAME_CONFIG } from '@/data/gameConfig';
import { ALL_ACTIVITIES } from '@/data/activities';
import { ANOMALY_ACTIVITIES } from '@/data/anomalySamples';
const ReportPage: React.FC = () => {
 const navigate = useNavigate();
 const { phase, initialResources, currentResources, totalCarbonReduction, totalCarbonEmission, score, anomalies, selectedActivities, carbonLedger, conflicts, goHome, startGame, } = useGameStore();
 useEffect(() => {
 if (phase !== 'report') {
 navigate('/');
 }
 }, [phase, navigate]);
 const totalScore = useMemo(() => {
 return Math.round((score.reduction * 0.4 + score.budget * 0.3 + score.compliance * 0.3));
 }, [score]);
 const budgetUsed = initialResources.budget - currentResources.budget;
 const electricityUsed = initialResources.electricity - currentResources.electricity;
 const transportUsed = initialResources.transport - currentResources.transport;
 const budgetOverdraft = Math.max(0, budgetUsed - initialResources.budget);
 const grade = totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : 'D';
 const gradeColor = totalScore >= 80 ? 'text-mint-400' : totalScore >= 60 ? 'text-yellow-400' : totalScore >= 40 ? 'text-burnt-400' : 'text-burnt-500';
 const netCarbon = totalCarbonReduction - totalCarbonEmission;
 return (<div className="min-h-screen bg-carbon-pattern relative">
 <ParticleBackground intensity={0.7} carbonReduction={totalCarbonReduction}/>
 <div className="relative z-10 container py-8">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="font-display text-3xl font-bold text-carbon-50">碳中和经营赛 · 结算报告</h1>
 <p className="text-sm text-carbon-400">你的决策成果与改进建议</p>
 </div>
 <div className="flex items-center gap-3">
 <button onClick={goHome} className="p-2 rounded-xl glass hover:bg-carbon-700/50 transition-colors">
 <Home className="w-5 h-5 text-carbon-300"/>
 </button>
 <button onClick={() => startGame('normal')} className="px-4 py-2 rounded-xl bg-mint-500 text-carbon-900 font-semibold flex items-center gap-2 hover:bg-mint-400 transition-colors">
 <RefreshCw className="w-4 h-4"/>
 再来一局
 </button>
 </div>
 </div>
 <div className="glass rounded-3xl p-8 mb-8 text-center">
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mint-400/10 mb-6">
 <CheckCircle className="w-5 h-5 text-mint-400"/>
 <span className="text-mint-300 font-medium">所有回合已完成</span>
 </div>
 <div className={`font-display text-9xl font-bold ${gradeColor} mb-4`}>
 {grade}
 </div>
 <div className="font-display text-2xl text-carbon-300 mb-8">
 综合评分: <span className={`font-bold ${gradeColor}`}>{totalScore}</span> / 100
 </div>
 <div className="flex flex-wrap justify-center gap-8">
 <ScoreRing score={score.reduction} label="碳减排效率" color="#318261"/>
 <ScoreRing score={score.budget} label="预算使用率" color="#93B1A6"/>
 <ScoreRing score={score.compliance} label="合规性" color={score.compliance >= 60 ? '#318261' : '#E2703A'}/>
 </div>
 </div>
 <div className="grid md:grid-cols-2 gap-6 mb-8">
 <div className="glass rounded-2xl p-6">
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-6 flex items-center gap-2">
 <TrendingDown className="w-5 h-5 text-mint-400"/>
 碳足迹分析
 </h3>
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-carbon-300">累计碳减排</span>
 <span className="font-mono font-bold text-mint-300 text-xl">
 -{formatNumber(totalCarbonReduction)} kg CO₂
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-carbon-300">累计碳排放</span>
 <span className="font-mono font-bold text-burnt-300 text-xl">
 +{formatNumber(totalCarbonEmission)} kg CO₂
 </span>
 </div>
 <div className="h-px bg-carbon-700 my-2"/>
 <div className="flex justify-between items-center">
 <span className="text-carbon-200 font-medium">净碳减排</span>
 <span className={`font-mono font-bold text-2xl ${netCarbon >= 0 ? 'text-mint-300' : 'text-burnt-300'}`}>
 {netCarbon >= 0 ? '-' : '+'}{formatNumber(Math.abs(netCarbon))} kg CO₂
 </span>
 </div>
 <div className="mt-4">
 <div className="text-sm text-carbon-400 mb-2">减排进度</div>
 <div className="h-4 bg-carbon-800 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-mint-600 to-mint-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalCarbonReduction / 3000) * 100)}%` }}/>
 </div>
 <div className="text-xs text-carbon-500 mt-1 text-right">
 目标: 3,000 kg CO₂
 </div>
 </div>
 </div>
 </div>
 <div className="glass rounded-2xl p-6">
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-6 flex items-center gap-2">
 <DollarSign className="w-5 h-5 text-mint-400"/>
 预算使用明细
 </h3>
 <div className="space-y-4">
 <div>
 <div className="flex justify-between items-center mb-2">
 <span className="text-carbon-300 flex items-center gap-2">
 <DollarSign className="w-4 h-4"/>
 活动经费
 </span>
 <span className="font-mono">
 <span className="text-carbon-400">¥{formatNumber(budgetUsed)}</span>
 <span className="text-carbon-500"> / ¥{formatNumber(initialResources.budget)}</span>
 </span>
 </div>
 <div className="h-3 bg-carbon-800 rounded-full overflow-hidden">
 <div className={`h-full rounded-full transition-all duration-1000 ${budgetOverdraft > 0 ? 'bg-burnt-500' : 'bg-mint-500'}`} style={{ width: `${Math.min(100, (budgetUsed / initialResources.budget) * 100)}%` }}/>
 </div>
 {budgetOverdraft > 0 && (<div className="text-sm text-burnt-400 mt-1 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3"/>
 超支 ¥{formatNumber(budgetOverdraft)}
 </div>)}
 </div>
 <div>
 <div className="flex justify-between items-center mb-2">
 <span className="text-carbon-300 flex items-center gap-2">
 <Zap className="w-4 h-4 text-yellow-400"/>
 用电额度
 </span>
 <span className="font-mono">
 <span className="text-carbon-400">{formatNumber(electricityUsed)} kWh</span>
 <span className="text-carbon-500"> / {formatNumber(initialResources.electricity)} kWh</span>
 </span>
 </div>
 <div className="h-3 bg-carbon-800 rounded-full overflow-hidden">
 <div className={`h-full rounded-full transition-all duration-1000 ${electricityUsed > initialResources.electricity ? 'bg-burnt-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(100, (electricityUsed / initialResources.electricity) * 100)}%` }}/>
 </div>
 </div>
 <div>
 <div className="flex justify-between items-center mb-2">
 <span className="text-carbon-300 flex items-center gap-2">
 <Users className="w-4 h-4 text-blue-400"/>
 交通配额
 </span>
 <span className="font-mono">
 <span className="text-carbon-400">{formatNumber(transportUsed)} 人</span>
 <span className="text-carbon-500"> / {formatNumber(initialResources.transport)} 人</span>
 </span>
 </div>
 <div className="h-3 bg-carbon-800 rounded-full overflow-hidden">
 <div className={`h-full rounded-full transition-all duration-1000 ${transportUsed > initialResources.transport ? 'bg-burnt-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (transportUsed / initialResources.transport) * 100)}%` }}/>
 </div>
 </div>
 </div>
 </div>
 </div>
 {anomalies.length > 0 && (<div className="glass rounded-2xl p-6 mb-8 border-l-4 border-burnt-400">
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-6 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-burnt-400"/>
 异常事件回顾
 </h3>
 <div className="space-y-4">
 {anomalies.map((anomaly, idx) => (<div key={anomaly.id} className="p-4 rounded-xl bg-carbon-800/50 border border-carbon-700 animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${anomaly.resolved ? 'bg-mint-400/20' : 'bg-burnt-400/20'}`}>
 {anomaly.resolved ? (<CheckCircle className="w-5 h-5 text-mint-400"/>) : (<XCircle className="w-5 h-5 text-burnt-400"/>)}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getAnomalyColor(anomaly.type)} bg-carbon-900`}>
 {getAnomalyLabel(anomaly.type)}
 </span>
 <span className="text-xs text-carbon-500">第 {anomaly.round} 回合</span>
 </div>
 <div className="text-sm text-carbon-300 mt-1">{anomaly.description}</div>
 </div>
 </div>
 <span className={`text-xs px-2 py-1 rounded-full ${anomaly.severity === 'critical' ? 'bg-burnt-400/20 text-burnt-300' : 'bg-yellow-400/20 text-yellow-300'}`}>
 {anomaly.severity === 'critical' ? '严重' : '警告'}
 </span>
 </div>
 {anomaly.resolution && (<div className="mt-3 ml-13 pl-4 border-l-2 border-mint-400/50">
 <div className="text-xs text-mint-300">✓ {anomaly.resolution}</div>
 </div>)}
 </div>))}
 </div>
 <div className="mt-4 p-4 rounded-xl bg-burnt-400/10 border border-burnt-400/30">
 <div className="text-sm text-burnt-300 font-medium mb-1">合规性扣分说明</div>
 <p className="text-xs text-carbon-400">
 严重异常每次扣 25 分，警告异常每次扣 10 分。
 本次共检测到 {anomalies.filter(a => a.severity === 'critical').length} 个严重异常，
 {anomalies.filter(a => a.severity === 'warning').length} 个警告。
 合规性得分: {score.compliance}/100
 </p>
 </div>
 </div>)}
 {conflicts.length > 0 && (<div className="glass rounded-2xl p-6 mb-8">
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-6 flex items-center gap-2">
 数据合并结果
 </h3>
 <div className="grid md:grid-cols-3 gap-4">
 <div className="glass-light rounded-xl p-4 text-center">
 <div className="text-sm text-carbon-400 mb-1">总冲突数</div>
 <div className="font-mono text-3xl font-bold text-carbon-100">{conflicts.length}</div>
 </div>
 <div className="glass-light rounded-xl p-4 text-center">
 <div className="text-sm text-carbon-400 mb-1">采用活动数据</div>
 <div className="font-mono text-3xl font-bold text-mint-300">
 {conflicts.filter(c => c.chosenSource === 'activity').length}
 </div>
 </div>
 <div className="glass-light rounded-xl p-4 text-center">
 <div className="text-sm text-carbon-400 mb-1">采用用电数据</div>
 <div className="font-mono text-3xl font-bold text-yellow-300">
 {conflicts.filter(c => c.chosenSource === 'electricity').length}
 </div>
 </div>
 </div>
 </div>)}
 <div className="glass rounded-2xl p-6 mb-8">
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-6">活动执行统计</h3>
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
 {selectedActivities.reduce((acc, sel) => {
 const existing = acc.find(a => a.activityId === sel.activityId);
 if (existing) {
 existing.count += sel.count;
 }
 else {
 acc.push({ ...sel });
 }
 return acc;
 }, [] as typeof selectedActivities).map((sel, idx) => {
 const activity = [...ALL_ACTIVITIES, ...ANOMALY_ACTIVITIES].find((a: { id: string }) => a.id === sel.activityId);
 return activity ? (<div key={idx} className="glass-light rounded-xl p-4 flex items-center justify-between">
 <span className="text-carbon-200">{activity.name}</span>
 <span className="font-mono font-bold text-mint-300">×{sel.count}</span>
 </div>) : null;
 })}
 </div>
 </div>
 <div className="text-center text-carbon-500 text-sm pb-8">
 <p>© 校园碳中和经营赛 · 报告生成时间: {new Date().toLocaleString('zh-CN')}</p>
 </div>
 </div>
 </div>);
};
export default ReportPage;
