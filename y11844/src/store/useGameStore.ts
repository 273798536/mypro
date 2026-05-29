import { create } from 'zustand';
import type { GameState, ActivitySelection, AnomalyEvent, CarbonRecord, DataConflict, DataSource, Resources, PendingReduction, RoundSummary } from '@/types';
import { GAME_CONFIG } from '@/data/gameConfig';
import { generateId, calculateTotalCarbon, calculateScore } from '@/utils/carbonCalculator';
interface GameActions {
 resetGame: () => void;
 startGame: (mode?: 'normal' | 'demo') => void;
 goHome: () => void;
 selectActivity: (activityId: string, count: number) => void;
 clearCurrentSelections: () => void;
 executeRound: () => {
 success: boolean;
 anomalies: AnomalyEvent[];
 };
 addAnomaly: (anomaly: AnomalyEvent) => void;
 resolveAnomaly: (anomalyId: string, resolution: string) => void;
 addCarbonRecord: (record: CarbonRecord) => void;
 removeCarbonRecord: (recordId: string) => void;
 updateCarbonRecord: (recordId: string, updates: Partial<CarbonRecord>) => void;
 addPendingReduction: (pending: PendingReduction) => void;
 applyPendingReductions: () => CarbonRecord[];
 setCurrentRound: (round: number) => void;
 setPhase: (phase: GameState['phase']) => void;
 setDataSources: (sources: DataSource[]) => void;
 setConflicts: (conflicts: DataConflict[]) => void;
 resolveConflict: (conflictId: string, chosenSource: 'activity' | 'electricity' | 'manual', manualValue?: number) => void;
 calculateFinalScore: () => void;
 setRoundSummary: (summary: RoundSummary | null) => void;
 setCurrentAnomaly: (anomaly: AnomalyEvent | null) => void;
 setShowAnomalyAlert: (show: boolean) => void;
 setCurrentResources: (resources: Resources) => void;
 addToTotalCarbon: (reduction: number, emission: number) => void;
 addSelectedActivities: (selections: ActivitySelection[]) => void;
}
const initialState: GameState = {
 currentRound: 1,
 totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
 phase: 'home',
 initialResources: { ...GAME_CONFIG.INITIAL_RESOURCES },
 currentResources: { ...GAME_CONFIG.INITIAL_RESOURCES },
 totalCarbonReduction: 0,
 totalCarbonEmission: 0,
 selectedActivities: [],
 currentRoundSelections: [],
 carbonLedger: [],
 anomalies: [],
 dataSources: [],
 conflicts: [],
 pendingDelayedReductions: [],
 score: {
 reduction: 0,
 budget: 0,
 compliance: 0,
 },
 roundSummary: null,
 showAnomalyAlert: false,
 currentAnomaly: null,
};
export const useGameStore = create<GameState & GameActions>((set, get) => ({
 ...initialState,
 resetGame: () => {
 set({
 ...initialState,
 carbonLedger: [],
 anomalies: [],
 pendingDelayedReductions: [],
 selectedActivities: [],
 currentRoundSelections: [],
 dataSources: [],
 conflicts: [],
 });
 },
 goHome: () => {
 set({
 phase: 'home',
 });
 },
 startGame: (mode: 'normal' | 'demo' = 'normal') => {
 set({
 phase: mode === 'demo' ? 'demo' : 'playing',
 currentRound: 1,
 currentResources: { ...GAME_CONFIG.INITIAL_RESOURCES },
 totalCarbonReduction: 0,
 totalCarbonEmission: 0,
 carbonLedger: [],
 anomalies: [],
 pendingDelayedReductions: [],
 selectedActivities: [],
 currentRoundSelections: [],
 score: { reduction: 0, budget: 0, compliance: 0 },
 });
 },
 selectActivity: (activityId: string, count: number) => {
 const { currentRoundSelections } = get();
 const existing = currentRoundSelections.find(s => s.activityId === activityId);
 if (count === 0) {
 set({
 currentRoundSelections: currentRoundSelections.filter(s => s.activityId !== activityId),
 });
 }
 else if (existing) {
 set({
 currentRoundSelections: currentRoundSelections.map(s => s.activityId === activityId ? { ...s, count } : s),
 });
 }
 else {
 set({
 currentRoundSelections: [
 ...currentRoundSelections,
 { activityId, count, round: get().currentRound },
 ],
 });
 }
 },
 clearCurrentSelections: () => {
 set({ currentRoundSelections: [] });
 },
 executeRound: () => {
 const state = get();
 const anomalies: AnomalyEvent[] = [];
 set({
 selectedActivities: [...state.selectedActivities, ...state.currentRoundSelections],
 });
 return { success: true, anomalies };
 },
 addAnomaly: (anomaly: AnomalyEvent) => {
 const state = get();
 const anomalyWithRound = {
 ...anomaly,
 round: anomaly.round || state.currentRound,
 };
 set({
 anomalies: [...state.anomalies, anomalyWithRound],
 currentAnomaly: anomalyWithRound,
 showAnomalyAlert: true,
 });
 },
 resolveAnomaly: (anomalyId: string, resolution: string) => {
 const state = get();
 set({
 anomalies: state.anomalies.map(a => a.id === anomalyId ? { ...a, resolved: true, resolution } : a),
 });
 },
 addCarbonRecord: (record: CarbonRecord) => {
 const state = get();
 set({
 carbonLedger: [...state.carbonLedger, record],
 });
 },
 removeCarbonRecord: (recordId: string) => {
 const state = get();
 set({
 carbonLedger: state.carbonLedger.filter(r => r.id !== recordId),
 });
 },
 updateCarbonRecord: (recordId: string, updates: Partial<CarbonRecord>) => {
 const state = get();
 set({
 carbonLedger: state.carbonLedger.map(r => r.id === recordId ? { ...r, ...updates } : r),
 });
 },
 addPendingReduction: (pending: PendingReduction) => {
 const state = get();
 set({
 pendingDelayedReductions: [...state.pendingDelayedReductions, pending],
 });
 },
 applyPendingReductions: () => {
 const state = get();
 const currentRound = state.currentRound;
 const pendingToApply = state.pendingDelayedReductions.filter(p => p.effectiveRound <= currentRound && !p.applied);
 const newRecords: CarbonRecord[] = [];
 pendingToApply.forEach(pending => {
 const record: CarbonRecord = {
 id: generateId(),
 round: currentRound,
 type: 'reduction',
 amount: pending.amount,
 source: `${pending.activityName}（延迟生效）`,
 sourceActivityId: pending.activityId,
 timestamp: Date.now(),
 isOffset: true,
 delayed: true,
 effectiveRound: currentRound,
 };
 newRecords.push(record);
 });
 if (newRecords.length > 0) {
 set({
 carbonLedger: [...state.carbonLedger, ...newRecords],
 pendingDelayedReductions: state.pendingDelayedReductions.map(p => pendingToApply.find(pa => pa.id === p.id) ? { ...p, applied: true } : p),
 });
 }
 return newRecords;
 },
 setCurrentRound: (round: number) => {
 set({ currentRound: round, currentRoundSelections: [] });
 },
 setPhase: (phase: GameState['phase']) => {
 set({ phase });
 },
 setDataSources: (sources: DataSource[]) => {
 set({ dataSources: sources });
 },
 setConflicts: (conflicts: DataConflict[]) => {
 set({ conflicts });
 },
 resolveConflict: (conflictId: string, chosenSource: 'activity' | 'electricity' | 'manual', manualValue?: number) => {
 const state = get();
 set({
 conflicts: state.conflicts.map(c => {
 if (c.id !== conflictId)
 return c;
 const finalValue = chosenSource === 'activity'
 ? c.activityValue
 : chosenSource === 'electricity'
 ? c.electricityValue
 : manualValue ?? c.activityValue;
 return {
 ...c,
 resolved: true,
 chosenSource,
 manualValue,
 finalValue,
 };
 }),
 });
 },
 calculateFinalScore: () => {
 const state = get();
 const scores = calculateScore(state.totalCarbonReduction, state.totalCarbonEmission, state.initialResources, state.currentResources, state.anomalies);
 set({
 score: {
 reduction: scores.reduction,
 budget: scores.budget,
 compliance: scores.compliance,
 },
 });
 },
 setRoundSummary: (summary: RoundSummary | null) => {
 set({ roundSummary: summary });
 },
 setCurrentAnomaly: (anomaly: AnomalyEvent | null) => {
 set({ currentAnomaly: anomaly });
 },
 setShowAnomalyAlert: (show: boolean) => {
 set({ showAnomalyAlert: show });
 },
 setCurrentResources: (resources: Resources) => {
 set({ currentResources: resources });
 },
 addToTotalCarbon: (reduction: number, emission: number) => {
 const state = get();
 set({
 totalCarbonReduction: state.totalCarbonReduction + reduction,
 totalCarbonEmission: state.totalCarbonEmission + emission,
 });
 },
 addSelectedActivities: (selections: ActivitySelection[]) => {
 const state = get();
 set({
 selectedActivities: [...state.selectedActivities, ...selections],
 });
 },
}));
