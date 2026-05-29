import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Home, BookOpen, CheckCircle, TrendingDown, TrendingUp, Zap, DollarSign, Users } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useAnomalyDetector } from '@/hooks/useAnomalyDetector';
import { ResourceGauge } from '@/components/ResourceGauge';
import { ActivityCard } from '@/components/ActivityCard';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { ParticleBackground } from '@/components/ParticleBackground';
import { formatNumber } from '@/utils/carbonCalculator';
import { ALL_ACTIVITIES } from '@/data/activities';
const GamePage: React.FC = () => {
 const navigate = useNavigate();
 const { currentRound, totalRounds, currentResources, initialResources, currentRoundSelections, totalCarbonReduction, totalCarbonEmission, roundSummary, showAnomalyAlert, currentAnomaly, setShowAnomalyAlert, setCurrentAnomaly, resolveAnomaly, phase, } = useGameStore();
 const gameEngine = useGameEngine();
 const anomalyDetector = useAnomalyDetector();
 const [showSummary, setShowSummary] = useState(false);
 useEffect(() => {
 if (phase !== 'playing' && phase !== 'demo') {
 navigate('/');
 }
 }, [phase, navigate]);
 const getSelectedCount = (activityId: string): number => {
 const selection = currentRoundSelections.find(s => s.activityId === activityId);
 return selection?.count || 0;
 };
 const handleSelectActivity = (activityId: string, count: number) => {
 useGameStore.getState().selectActivity(activityId, count);
 };
 const handleExecute = () => {
 setShowSummary(false);
 const result = gameEngine.executeRound();
 if (result.anomalies.length > 0 || currentAnomaly) {
 setShowAnomalyAlert(true);
 }
 else {
 setShowSummary(true);
 }
 };
 const handleNextRound = () => {
 setShowSummary(false);
 gameEngine.nextRound();
 };
 const handleCloseAnomaly = () => {
 setShowAnomalyAlert(false);
 setCurrentAnomaly(null);
 setShowSummary(true);
 };
 const handleResolveAnomaly = () => {
 if (currentAnomaly) {
 resolveAnomaly(currentAnomaly.id, '已确认异常并记录');
 }
 };
 const isOverdraft = gameEngine.remainingResources.budget < 0 || gameEngine.remainingResources.electricity < 0 || gameEngine.remainingResources.transport < 0;
 return (<div className="min-h-screen bg-carbon-pattern relative">
 <ParticleBackground intensity={0.8} carbonReduction={totalCarbonReduction}/>
 <div className="relative z-10 container py-8">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-4">
 <button onClick={() => gameEngine.goHome()} className="p-2 rounded-xl glass hover:bg-carbon-700/50 transition-colors">
 <Home className="w-5 h-5 text-carbon-300"/>
 </button>
 <div>
 <h1 className="font-display text-2xl font-bold text-carbon-50">
 第 {currentRound} / {totalRounds} 回合
 </h1>
 <p className="text-sm text-carbon-400">选择活动组合，平衡资源与减排</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <button onClick={() => navigate('/carbon-ledger')} className="px-4 py-2 rounded-xl glass flex items-center gap-2 text-carbon-200 hover:bg-carbon-700/50 transition-colors">
 <BookOpen className="w-4 h-4"/>
 碳账本
 </button>
 <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
 <div className="text-right">
 <div className="text-xs text-carbon-400">累计碳减排</div>
 <div className="font-mono font-bold text-mint-300">
 -{formatNumber(totalCarbonReduction)} kg
 </div>
 </div>
 <div className="w-px h-8 bg-carbon-700"/>
 <div className="text-right">
 <div className="text-xs text-carbon-400">累计碳排放</div>
 <div className="font-mono font-bold text-burnt-300">
 +{formatNumber(totalCarbonEmission)} kg
 </div>
 </div>
 </div>
 </div>
 </div>
 <div className="grid md:grid-cols-3 gap-4 mb-8">
 <ResourceGauge label="活动经费" current={currentResources.budget} initial={initialResources.budget} icon="budget" unit="元"/>
 <ResourceGauge label="用电额度" current={currentResources.electricity} initial={initialResources.electricity} icon="electricity" unit="kWh"/>
 <ResourceGauge label="交通配额" current={currentResources.transport} initial={initialResources.transport} icon="transport" unit="人"/>
 </div>
 {currentRoundSelections.length > 0 && (<div className={`glass rounded-2xl p-6 mb-8 border-2 transition-all ${isOverdraft ? 'border-burnt-400 anomaly-pulse' : 'border-mint-400/30'}`}>
 <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
 <h3 className="font-display text-xl font-bold text-carbon-50">本回合选择</h3>
 <div className="flex flex-wrap gap-4 text-sm">
 <div className="flex items-center gap-2">
 <DollarSign className="w-4 h-4 text-mint-300"/>
 <span className="text-carbon-400">经费:</span>
 <span className={`font-mono font-semibold ${gameEngine.remainingResources.budget < 0 ? 'text-burnt-400' : 'text-carbon-100'}`}>
 ¥{formatNumber(gameEngine.remainingResources.budget)} 剩余
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Zap className="w-4 h-4 text-yellow-300"/>
 <span className="text-carbon-400">用电:</span>
 <span className={`font-mono font-semibold ${gameEngine.remainingResources.electricity < 0 ? 'text-burnt-400' : 'text-carbon-100'}`}>
 {formatNumber(gameEngine.remainingResources.electricity)} kWh 剩余
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Users className="w-4 h-4 text-blue-300"/>
 <span className="text-carbon-400">交通:</span>
 <span className={`font-mono font-semibold ${gameEngine.remainingResources.transport < 0 ? 'text-burnt-400' : 'text-carbon-100'}`}>
 {formatNumber(gameEngine.remainingResources.transport)} 人 剩余
 </span>
 </div>
 </div>
 </div>
 <div className="grid md:grid-cols-2 gap-4 mb-6">
 <div className="glass-light rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <TrendingDown className="w-4 h-4 text-mint-300"/>
 <span className="text-sm text-carbon-400">预计碳减排</span>
 </div>
 <div className="font-mono text-3xl font-bold text-mint-300">
 -{formatNumber(gameEngine.totalCarbon.reduction)} kg CO₂
 </div>
 </div>
 <div className="glass-light rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-4 h-4 text-burnt-300"/>
 <span className="text-sm text-carbon-400">预计碳排放</span>
 </div>
 <div className="font-mono text-3xl font-bold text-burnt-300">
 +{formatNumber(gameEngine.totalCarbon.emission)} kg CO₂
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <button onClick={() => useGameStore.getState().clearCurrentSelections()} className="px-6 py-3 rounded-xl glass text-carbon-300 hover:bg-carbon-700/50 transition-colors">
 清空选择
 </button>
 <div className="flex-1"/>
 <button onClick={handleExecute} disabled={!gameEngine.canExecute} className={`px-8 py-3 rounded-xl font-display font-semibold flex items-center gap-3 transition-all ${gameEngine.canExecute ? 'bg-gradient-to-r from-mint-500 to-mint-400 text-carbon-900 hover:shadow-lg hover:shadow-mint-400/30 hover:scale-105' : 'bg-carbon-700 text-carbon-500 cursor-not-allowed'}`}>
 <CheckCircle className="w-5 h-5"/>
 执行本回合
 </button>
 </div>
 </div>)}
 <h2 className="font-display text-xl font-bold text-carbon-50 mb-4">可选择的活动</h2>
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
 {gameEngine.availableActivities.map((activity) => (<ActivityCard key={activity.id} activity={activity} selectedCount={getSelectedCount(activity.id)} onSelect={(count) => handleSelectActivity(activity.id, count)}/>))}
 </div>
 </div>
 {showSummary && roundSummary && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
 <div className="w-full max-w-2xl glass rounded-3xl p-8 animate-slide-up">
 <div className="text-center mb-8">
 <div className="w-20 h-20 rounded-full bg-mint-400/20 flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-10 h-10 text-mint-400"/>
 </div>
 <h2 className="font-display text-3xl font-bold text-carbon-50 mb-2">
 第 {roundSummary.round} 回合完成
 </h2>
 <p className="text-carbon-300">本回合活动已执行</p>
 </div>
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="glass-light rounded-xl p-4 text-center">
 <div className="text-sm text-carbon-400 mb-1">碳减排</div>
 <div className="font-mono text-2xl font-bold text-mint-300">
 -{formatNumber(roundSummary.carbonReduction)} kg
 </div>
 </div>
 <div className="glass-light rounded-xl p-4 text-center">
 <div className="text-sm text-carbon-400 mb-1">碳排放</div>
 <div className="font-mono text-2xl font-bold text-burnt-300">
 +{formatNumber(roundSummary.carbonEmission)} kg
 </div>
 </div>
 </div>
 <div className="glass-light rounded-xl p-4 mb-6">
 <div className="text-sm text-carbon-400 mb-2">执行的活动</div>
 <div className="space-y-2">
 {roundSummary.activities.map((sel, idx) => {
 const activity = ALL_ACTIVITIES.find(a => a.id === sel.activityId);
 return activity ? (<div key={idx} className="flex justify-between items-center text-sm">
 <span className="text-carbon-200">{activity.name}</span>
 <span className="text-mint-300 font-mono">×{sel.count}</span>
 </div>) : null;
 })}
 </div>
 </div>
 {roundSummary.anomalies.length > 0 && (<div className="bg-burnt-400/10 border border-burnt-400/30 rounded-xl p-4 mb-6">
 <div className="text-sm text-burnt-300 font-medium mb-2">
 检测到 {roundSummary.anomalies.length} 个异常
 </div>
 {roundSummary.anomalies.map((a, idx) => (<div key={idx} className="text-sm text-carbon-300">• {a.description}</div>))}
 </div>)}
 <button onClick={handleNextRound} className="w-full py-4 rounded-xl bg-gradient-to-r from-mint-500 to-mint-400 text-carbon-900 font-display font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-mint-400/30 transition-all">
 {currentRound < totalRounds ? '进入下一回合' : '进入数据合并'}
 <ArrowRight className="w-5 h-5"/>
 </button>
 </div>
 </div>)}
 <AnomalyAlert anomaly={showAnomalyAlert ? currentAnomaly : null} onClose={handleCloseAnomaly} onResolve={handleResolveAnomaly}/>
 </div>);
};
export default GamePage;
