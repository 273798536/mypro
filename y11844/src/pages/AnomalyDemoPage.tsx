import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Play, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useAnomalyDetector } from '@/hooks/useAnomalyDetector';
import { ANOMALY_SAMPLES, ANOMALY_ACTIVITIES } from '@/data/anomalySamples';
import { ActivityCard } from '@/components/ActivityCard';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { CarbonTimeline } from '@/components/CarbonTimeline';
import { ParticleBackground } from '@/components/ParticleBackground';
import { getAnomalyLabel, getAnomalyColor, getAnomalyBgColor } from '@/utils/anomalyUtils';
import { formatNumber } from '@/utils/carbonCalculator';
import type { AnomalySample } from '@/types';
const AnomalyDemoPage: React.FC = () => {
 const navigate = useNavigate();
 const { phase, currentRoundSelections, anomalies, carbonLedger, currentAnomaly, showAnomalyAlert, setShowAnomalyAlert, setCurrentAnomaly, resolveAnomaly, currentResources, initialResources, totalCarbonReduction, totalCarbonEmission, resetGame, setPhase, selectActivity, } = useGameStore();
 const gameEngine = useGameEngine();
 const anomalyDetector = useAnomalyDetector();
 const [selectedSample, setSelectedSample] = useState<AnomalySample | null>(null);
 const [demoStep, setDemoStep] = useState<number>(0);
 const [verificationResults, setVerificationResults] = useState<Record<string, boolean[]>>({});
 const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
 useEffect(() => {
 if (phase !== 'demo') {
 resetGame();
 setPhase('demo');
 }
 }, [phase, resetGame, setPhase]);
 useEffect(() => {
 if (selectedSample) {
 const initialResults: boolean[] = selectedSample.verificationSteps.map(() => false);
 setVerificationResults(prev => ({ ...prev, [selectedSample.id]: initialResults }));
 }
 }, [selectedSample]);
 const getSelectedCount = (activityId: string): number => {
 const selection = currentRoundSelections.find(s => s.activityId === activityId);
 return selection?.count || 0;
 };
 const handleSelectActivity = (activityId: string, count: number) => {
 selectActivity(activityId, count);
 };
 const handleRunDemo = (sample: AnomalySample) => {
 setSelectedSample(sample);
 setDemoStep(0);
 resetGame();
 setPhase('demo');
 setTimeout(() => {
 handleSelectActivity(sample.activity.id, 1);
 markStepComplete(sample.id, 0);
 setDemoStep(1);
 }, 500);
 };
 const executeActivity = (sample: AnomalySample) => {
 const forceAnomalies: string[] = [];
 if (sample.anomalyType === 'double_offset') {
 forceAnomalies.push('double_offset');
 }
 if (sample.anomalyType === 'delay') {
 forceAnomalies.push('delay');
 }
 const result = gameEngine.executeRound(forceAnomalies);
 markStepComplete(sample.id, 1);
 setDemoStep(2);
 if (result.anomalies.length > 0 || showAnomalyAlert) {
 markStepComplete(sample.id, 2);
 setDemoStep(3);
 }
 };
 const markStepComplete = (sampleId: string, stepIndex: number) => {
 setVerificationResults(prev => {
 const sampleResults = prev[sampleId] || [];
 const newResults = [...sampleResults];
 newResults[stepIndex] = true;
 return { ...prev, [sampleId]: newResults };
 });
 };
 const toggleStep = (sampleId: string, stepIndex: number) => {
 const key = `${sampleId}-${stepIndex}`;
 setExpandedSteps(prev => ({ ...prev, [key]: !prev[key] }));
 };
 const handleCloseAnomaly = () => {
 setShowAnomalyAlert(false);
 setCurrentAnomaly(null);
 if (selectedSample) {
 markStepComplete(selectedSample.id, 3);
 setDemoStep(4);
 }
 };
 const handleResolveAnomaly = () => {
 if (currentAnomaly) {
 resolveAnomaly(currentAnomaly.id, '异常已成功捕获并处理');
 markStepComplete(selectedSample!.id, 3);
 setDemoStep(4);
 }
 };
 const resetDemo = () => {
 setSelectedSample(null);
 setDemoStep(0);
 resetGame();
 setPhase('demo');
 };
 const allStepsCompleted = selectedSample && verificationResults[selectedSample.id]?.every(r => r);
 const getOverallStatus = (sample: AnomalySample) => {
 const results = verificationResults[sample.id];
 if (!results || results.length === 0) return 'pending';
 const completed = results.filter(r => r).length;
 if (completed === results.length) return 'pass';
 if (completed > 0) return 'partial';
 return 'pending';
 };
 return (<div className="min-h-screen bg-carbon-pattern relative">
 <ParticleBackground intensity={0.6} carbonReduction={totalCarbonReduction}/>
 <div className="relative z-10 container py-8">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="font-display text-2xl font-bold text-carbon-50 flex items-center gap-3">
 <AlertTriangle className="w-7 h-7 text-burnt-400"/>
 异常样例验证
 </h1>
 <p className="text-sm text-carbon-400">验证异常检测和处理路径是否正常工作</p>
 </div>
 <div className="flex items-center gap-3">
 {selectedSample && (<button onClick={resetDemo} className="px-4 py-2 rounded-xl glass text-carbon-200 hover:bg-carbon-700/50 transition-colors flex items-center gap-2">
 <RefreshCw className="w-4 h-4"/>
 重置
 </button>)}
 <button onClick={() => gameEngine.goHome()} className="p-2 rounded-xl glass hover:bg-carbon-700/50 transition-colors">
 <Home className="w-5 h-5 text-carbon-300"/>
 </button>
 </div>
 </div>
 {!selectedSample ? (<div className="grid md:grid-cols-3 gap-6">
 {ANOMALY_SAMPLES.map((sample) => {
 const status = getOverallStatus(sample);
 return (<div key={sample.id} className={`glass rounded-3xl p-6 border-2 transition-all hover:translate-y-[-4px] hover:shadow-xl ${status === 'pass' ? 'border-mint-400' : sample.anomalyType === 'overdraft' || sample.anomalyType === 'double_offset' ? 'border-burnt-400/50' : 'border-yellow-400/50'}`}>
 <div className="flex items-start justify-between mb-4">
 <div className={`px-3 py-1 rounded-full text-sm font-bold ${getAnomalyBgColor(sample.anomalyType)} border`}>
 {getAnomalyLabel(sample.anomalyType)}
 </div>
 {status === 'pass' && (<div className="p-2 rounded-full bg-mint-400/20">
 <CheckCircle className="w-5 h-5 text-mint-400"/>
 </div>)}
 </div>
 <ActivityCard activity={sample.activity} selectedCount={0} onSelect={() => {}} disabled={true}/>
 <div className="mt-6 space-y-4">
 <div>
 <div className="text-sm text-carbon-400 mb-2">预期行为</div>
 <p className="text-sm text-carbon-200">{sample.expectedBehavior}</p>
 </div>
 <div>
 <div className="text-sm text-carbon-400 mb-2">验证步骤</div>
 <div className="space-y-2">
 {sample.verificationSteps.map((step, idx) => {
 const stepKey = `${sample.id}-${idx}`;
 const isExpanded = expandedSteps[stepKey];
 const isCompleted = verificationResults[sample.id]?.[idx];
 return (<div key={idx} className="text-sm">
 <button onClick={() => toggleStep(sample.id, idx)} className="w-full flex items-center gap-2 text-left text-carbon-300 hover:text-carbon-100 transition-colors">
 {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0"/> : <ChevronRight className="w-4 h-4 flex-shrink-0"/>}
 {isCompleted ? (<CheckCircle className="w-4 h-4 text-mint-400 flex-shrink-0"/>) : (<span className="w-4 h-4 rounded-full border border-carbon-500 flex-shrink-0"/>)}
 <span className={isCompleted ? 'text-mint-300' : ''}>
 步骤 {idx + 1}: {step.substring(0, 30)}{step.length > 30 ? '...' : ''}
 </span>
 </button>
 {isExpanded && (<div className="ml-10 mt-2 p-3 glass-light rounded-lg text-carbon-300 text-xs">
 {step}
 </div>)}
 </div>);
 })}
 </div>
 </div>
 </div>
 <button onClick={() => handleRunDemo(sample)} className={`w-full mt-6 py-3 rounded-xl font-display font-semibold flex items-center justify-center gap-2 transition-all ${status === 'pass' ? 'bg-mint-500/20 text-mint-300 hover:bg-mint-500/30' : 'bg-gradient-to-r from-burnt-500 to-burnt-400 text-white hover:shadow-lg hover:shadow-burnt-400/30 hover:scale-105'}`}>
 <Play className="w-5 h-5"/>
 {status === 'pass' ? '重新运行验证' : '运行验证'}
 </button>
 </div>);
 })}
 </div>) : (<div className="grid lg:grid-cols-2 gap-8">
 <div className="space-y-6">
 <div className={`glass rounded-2xl p-6 border-2 ${selectedSample.anomalyType === 'overdraft' || selectedSample.anomalyType === 'double_offset' ? 'border-burnt-400 anomaly-pulse' : 'border-yellow-400'}`}>
 <div className="flex items-center gap-3 mb-4">
 <div className={`px-3 py-1 rounded-full text-sm font-bold ${getAnomalyBgColor(selectedSample.anomalyType)} border`}>
 {getAnomalyLabel(selectedSample.anomalyType)}
 </div>
 <span className="text-carbon-400 text-sm">
 步骤 {demoStep} / 5
 </span>
 </div>
 <h2 className="font-display text-xl font-bold text-carbon-50 mb-2">
 {selectedSample.activity.name}
 </h2>
 <p className="text-carbon-300 text-sm mb-4">{selectedSample.activity.description}</p>
 <div className="glass-light rounded-xl p-4">
 <div className="text-sm text-carbon-400 mb-2">预期行为</div>
 <p className="text-sm text-carbon-200">{selectedSample.expectedBehavior}</p>
 </div>
 </div>
 <ActivityCard activity={selectedSample.activity} selectedCount={getSelectedCount(selectedSample.activity.id)} onSelect={() => {}} disabled={demoStep > 0}/>
 {demoStep >= 1 && demoStep < 4 && (<button onClick={() => executeActivity(selectedSample)} disabled={demoStep >= 2} className={`w-full py-4 rounded-xl font-display font-semibold text-lg flex items-center justify-center gap-3 transition-all ${demoStep >= 2 ? 'bg-carbon-700 text-carbon-500 cursor-not-allowed' : 'bg-gradient-to-r from-burnt-500 to-burnt-400 text-white hover:shadow-lg hover:shadow-burnt-400/30 hover:scale-105'}`}>
 <Zap className="w-6 h-6"/>
 {demoStep === 1 ? '执行活动，触发异常' : '等待异常检测...'}
 </button>)}
 </div>
 <div className="space-y-6">
 <div className="glass rounded-2xl p-6">
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-4">验证进度</h3>
 <div className="space-y-4">
 {selectedSample.verificationSteps.map((step, idx) => {
 const isCompleted = verificationResults[selectedSample.id]?.[idx];
 const isCurrent = demoStep === idx + 1;
 return (<div key={idx} className={`p-4 rounded-xl border transition-all ${isCompleted ? 'bg-mint-400/10 border-mint-400/50' : isCurrent ? 'bg-yellow-400/10 border-yellow-400/50 animate-pulse' : 'bg-carbon-800/30 border-carbon-700'}`}>
 <div className="flex items-start gap-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-mint-400/20' : isCurrent ? 'bg-yellow-400/20' : 'bg-carbon-700'}`}>
 {isCompleted ? (<CheckCircle className="w-4 h-4 text-mint-400"/>) : isCurrent ? (<span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"/>) : (<span className="text-carbon-500 text-sm font-bold">{idx + 1}</span>)}
 </div>
 <div>
 <div className={`font-medium ${isCompleted ? 'text-mint-300' : isCurrent ? 'text-yellow-300' : 'text-carbon-300'}`}>
 {step}
 </div>
 {isCompleted && (<div className="text-xs text-mint-400 mt-1 flex items-center gap-1">
 <CheckCircle className="w-3 h-3"/> 验证通过
 </div>)}
 </div>
 </div>
 </div>);
 })}
 </div>
 {allStepsCompleted && (<div className="mt-6 p-4 rounded-xl bg-mint-400/10 border border-mint-400/50 text-center">
 <CheckCircle className="w-12 h-12 text-mint-400 mx-auto mb-3"/>
 <div className="font-display text-xl font-bold text-mint-300 mb-1">
 异常路径验证通过！
 </div>
 <p className="text-sm text-carbon-300">
 所有验证步骤已完成，{getAnomalyLabel(selectedSample.anomalyType)}异常检测和处理功能正常工作。
 </p>
 </div>)}
 </div>
 {carbonLedger.length > 0 && (<div className="glass rounded-2xl p-6">
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-4">实时碳账本</h3>
 <div className="max-h-80 overflow-y-auto pr-2">
 <CarbonTimeline records={carbonLedger} currentRound={1}/>
 </div>
 </div>)}
 </div>
 </div>)}
 </div>
 <AnomalyAlert anomaly={showAnomalyAlert ? currentAnomaly : null} onClose={handleCloseAnomaly} onResolve={handleResolveAnomaly}/>
 </div>);
};
export default AnomalyDemoPage;
