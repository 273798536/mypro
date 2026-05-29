import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActivitySelection, RoundSummary, Resources } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { useAnomalyDetector } from './useAnomalyDetector';
import { useCarbonLedger } from './useCarbonLedger';
import { useDataMerge } from './useDataMerge';
import { ALL_ACTIVITIES, NORMAL_ACTIVITIES } from '@/data/activities';
import { ANOMALY_ACTIVITIES } from '@/data/anomalySamples';
import { calculateTotalCost, calculateTotalCarbon } from '@/utils/carbonCalculator';
export function useGameEngine() {
 const navigate = useNavigate();
 const {
 currentRound,
 totalRounds,
 currentResources,
 initialResources,
 currentRoundSelections,
 totalCarbonReduction,
 totalCarbonEmission,
 setCurrentResources,
 setCurrentRound,
 setPhase,
 addSelectedActivities,
 setRoundSummary,
 applyPendingReductions,
 calculateFinalScore,
 clearCurrentSelections,
 } = useGameStore();
 const anomalyDetector = useAnomalyDetector();
 const carbonLedger = useCarbonLedger();
 const dataMerge = useDataMerge();
 const availableActivities = useMemo(() => {
 const phase = useGameStore.getState().phase;
 if (phase === 'demo') {
 return ANOMALY_ACTIVITIES;
 }
 return NORMAL_ACTIVITIES;
 }, []);
 const totalCost = useMemo(() => {
 return calculateTotalCost(currentRoundSelections);
 }, [currentRoundSelections]);
 const totalCarbon = useMemo(() => {
 return calculateTotalCarbon(currentRoundSelections);
 }, [currentRoundSelections]);
 const canExecute = useMemo(() => {
 if (currentRoundSelections.length === 0) return false;
 const cost = calculateTotalCost(currentRoundSelections);
 return (
 currentResources.budget >= cost.budget &&
 currentResources.electricity >= cost.electricity &&
 currentResources.transport >= cost.transport
 );
 }, [currentRoundSelections, currentResources]);
 const remainingResources = useMemo((): Resources => {
 return {
 budget: currentResources.budget - totalCost.budget,
 electricity: currentResources.electricity - totalCost.electricity,
 transport: currentResources.transport - totalCost.transport,
 };
 }, [currentResources, totalCost]);
 const executeRound = useCallback((forceAnomalies: string[] = []) => {
 const state = useGameStore.getState();
 const selections = state.currentRoundSelections;
 if (selections.length === 0) return { success: false, anomalies: [] };
 const detectedAnomalies = [];
 const overdraftAnomaly = anomalyDetector.checkOverdraft(selections);
 if (overdraftAnomaly) {
 detectedAnomalies.push(overdraftAnomaly);
 }
 const newResources: Resources = {
 budget: state.currentResources.budget - totalCost.budget,
 electricity: state.currentResources.electricity - totalCost.electricity,
 transport: state.currentResources.transport - totalCost.transport,
 };
 setCurrentResources(newResources);
 selections.forEach(selection => {
 const activity = ALL_ACTIVITIES.find(a => a.id === selection.activityId) || ANOMALY_ACTIVITIES.find(a => a.id === selection.activityId);
 if (!activity) return;
 carbonLedger.addEmissionRecord(activity, selection);
 const isDoubleOffsetSample = activity.anomalyType === 'double_offset' || forceAnomalies.includes('double_offset');
 const isDelaySample = activity.anomalyType === 'delay' || forceAnomalies.includes('delay');
 if (isDoubleOffsetSample) {
 anomalyDetector.simulateDoubleOffset(activity, selection);
 }
 else if (isDelaySample) {
 const delayResult = anomalyDetector.checkDelay(activity, selection, true);
 if (delayResult.anomaly) {
 detectedAnomalies.push(delayResult.anomaly);
 }
 }
 else {
 const delayResult = anomalyDetector.checkDelay(activity, selection);
 if (delayResult.shouldDelay) {
 if (delayResult.anomaly) {
 detectedAnomalies.push(delayResult.anomaly);
 }
 }
 else {
 carbonLedger.addReductionRecord(activity, selection);
 }
 }
 });
 addSelectedActivities(selections);
 applyPendingReductions();
 const summary: RoundSummary = {
 round: state.currentRound,
 totalCost,
 carbonReduction: totalCarbon.reduction,
 carbonEmission: totalCarbon.emission,
 netCarbon: totalCarbon.net,
 anomalies: detectedAnomalies,
 activities: selections,
 };
 setRoundSummary(summary);
 clearCurrentSelections();
 return { success: true, anomalies: detectedAnomalies };
 }, [anomalyDetector, carbonLedger, totalCost, totalCarbon, setCurrentResources, addSelectedActivities, applyPendingReductions, setRoundSummary, clearCurrentSelections]);
 const nextRound = useCallback(() => {
 const state = useGameStore();
 if (state.currentRound < state.totalRounds) {
 setCurrentRound(state.currentRound + 1);
 setRoundSummary(null);
 }
 else {
 setPhase('merging');
 navigate('/data-merge');
 }
 }, [setCurrentRound, setRoundSummary, setPhase, navigate]);
 const finishMerge = useCallback(() => {
 calculateFinalScore();
 setPhase('report');
 navigate('/report');
 }, [calculateFinalScore, setPhase, navigate]);
 const startGame = useCallback((mode: 'normal' | 'demo' = 'normal') => {
 useGameStore.getState().resetGame();
 if (mode === 'demo') {
 useGameStore.getState().setPhase('demo');
 navigate('/anomaly-demo');
 }
 else {
 useGameStore.getState().startGame();
 navigate('/game');
 }
 }, [navigate]);
 const goHome = useCallback(() => {
 useGameStore.getState().resetGame();
 navigate('/');
 }, [navigate]);
 return {
 availableActivities,
 totalCost,
 totalCarbon,
 remainingResources,
 canExecute,
 executeRound,
 nextRound,
 finishMerge,
 startGame,
 goHome,
 };
}
