import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Home, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useDataMerge } from '@/hooks/useDataMerge';
import { DataDiffView } from '@/components/DataDiffView';
import { ParticleBackground } from '@/components/ParticleBackground';
const DataMergePage: React.FC = () => {
 const navigate = useNavigate();
 const { phase, dataSources, conflicts, totalCarbonReduction, goHome, } = useGameStore();
 const gameEngine = useGameEngine();
 const dataMerge = useDataMerge();
 const [isInitialized, setIsInitialized] = useState(false);
 useEffect(() => {
 if (phase !== 'merging') {
 navigate('/');
 return;
 }
 if (dataSources.length === 0) {
 dataMerge.initializeMerge();
 }
 setIsInitialized(true);
 }, [phase, navigate, dataSources.length, dataMerge]);
 const activitySource = dataSources.find(s => s.name === 'activity');
 const electricitySource = dataSources.find(s => s.name === 'electricity');
 const unresolvedCount = conflicts.filter(c => !c.resolved).length;
 const allResolved = unresolvedCount === 0 && conflicts.length > 0;
 if (!isInitialized || !activitySource || !electricitySource) {
 return (<div className="min-h-screen bg-carbon-pattern flex items-center justify-center">
 <div className="text-center">
 <RefreshCw className="w-12 h-12 text-mint-400 animate-spin mx-auto mb-4"/>
 <p className="text-carbon-300">正在生成数据对比...</p>
 </div>
 </div>);
 }
 return (<div className="min-h-screen bg-carbon-pattern relative">
 <ParticleBackground intensity={0.5} carbonReduction={totalCarbonReduction}/>
 <div className="relative z-10 container py-8">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="font-display text-2xl font-bold text-carbon-50">数据合并</h1>
 <p className="text-sm text-carbon-400">活动数据与用电数据对比，差异需人工确认</p>
 </div>
 <button onClick={goHome} className="p-2 rounded-xl glass hover:bg-carbon-700/50 transition-colors">
 <Home className="w-5 h-5 text-carbon-300"/>
 </button>
 </div>
 <div className={`glass rounded-2xl p-6 mb-6 border-2 transition-all ${allResolved ? 'border-mint-400' : unresolvedCount > 0 ? 'border-burnt-400 anomaly-pulse' : 'border-carbon-700'}`}>
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 {allResolved ? (<div className="p-3 rounded-full bg-mint-400/20">
 <CheckCircle className="w-6 h-6 text-mint-400"/>
 </div>) : unresolvedCount > 0 ? (<div className="p-3 rounded-full bg-burnt-400/20">
 <AlertCircle className="w-6 h-6 text-burnt-400"/>
 </div>) : (<div className="p-3 rounded-full bg-mint-400/20">
 <CheckCircle className="w-6 h-6 text-mint-400"/>
 </div>)}
 <div>
 <h3 className="font-display text-xl font-bold text-carbon-50">
 {allResolved ? '所有冲突已解决' : unresolvedCount > 0 ? `还有 ${unresolvedCount} 处冲突需要确认` : '暂无数据冲突'}
 </h3>
 <p className="text-sm text-carbon-400">
 活动数据由「{activitySource.maintainer}」维护，用电数据由「{electricitySource.maintainer}」维护
 </p>
 </div>
 </div>
 <button onClick={gameEngine.finishMerge} disabled={conflicts.length > 0 && !allResolved} className={`px-8 py-3 rounded-xl font-display font-semibold flex items-center gap-2 transition-all ${allResolved || conflicts.length === 0 ? 'bg-gradient-to-r from-mint-500 to-mint-400 text-carbon-900 hover:shadow-lg hover:shadow-mint-400/30 hover:scale-105' : 'bg-carbon-700 text-carbon-500 cursor-not-allowed'}`}>
 生成结算报告
 <ArrowRight className="w-5 h-5"/>
 </button>
 </div>
 </div>
 <DataDiffView activitySource={activitySource} electricitySource={electricitySource} conflicts={conflicts} onResolveConflict={dataMerge.resolveConflict} getFieldLabel={dataMerge.getFieldLabel}/>
 </div>
 </div>);
};
export default DataMergePage;
