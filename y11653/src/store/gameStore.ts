import { create } from 'zustand';
import type { GameState, Operation, DataPoint, AnomalyEvent } from '@/types';
import { INITIAL_INLET, STANDARD_THRESHOLDS, CHEMICALS } from '@/data/chemicals';
import { calculateTreatment, generateRandomInlet } from '@/utils/simulator';
import { calculateScore } from '@/utils/scoring';
interface GameStore extends GameState {
 startSimulation: () => void;
 resetSimulation: () => void;
 executeOperation: () => void;
 setSelectedChemical: (id: string | null) => void;
 setCurrentDosage: (value: number) => void;
 setCurrentMixingTime: (value: number) => void;
 dismissAnomaly: (id: string) => void;
 finishSimulation: () => void;
}
const TIME_STEP = 10;
const TOTAL_TIME = 120;
const initialState: GameState = {
 status: 'idle',
 currentTime: 0,
 totalTime: TOTAL_TIME,
 inletWater: INITIAL_INLET,
 currentWater: INITIAL_INLET,
 targetThresholds: STANDARD_THRESHOLDS,
 operations: [],
 historyData: [],
 score: 100,
 totalCost: 0,
 selectedChemical: null,
 currentDosage: 0,
 currentMixingTime: 5,
 anomalies: [],
 reboundEffects: [],
};
export const useGameStore = create<GameStore>((set, get) => ({
 ...initialState,
 startSimulation: () => {
 const inlet = generateRandomInlet();
 set({
 status: 'running',
 currentTime: 0,
 inletWater: inlet,
 currentWater: inlet,
 operations: [],
 historyData: [{
 time: 0,
 ...inlet,
 }],
 score: 100,
 totalCost: 0,
 selectedChemical: null,
 currentDosage: 0,
 currentMixingTime: 5,
 anomalies: [],
 reboundEffects: [],
 });
 },
 resetSimulation: () => {
 set(initialState);
 },
 executeOperation: () => {
 const state = get();
 if (state.status !== 'running' || !state.selectedChemical)
 return;
 const chemical = CHEMICALS.find(c => c.id === state.selectedChemical);
 if (!chemical)
 return;
 const result = calculateTreatment(state.currentWater, chemical, state.currentDosage, state.currentMixingTime, state.reboundEffects);
 const newTime = state.currentTime + TIME_STEP;
 const newOperation: Operation = {
 id: `op-${Date.now()}`,
 timestamp: Date.now(),
 chemicalId: state.selectedChemical,
 dosage: state.currentDosage,
 mixingTime: state.currentMixingTime,
 cost: result.cost,
 beforeQuality: { ...state.currentWater },
 afterQuality: result.newQuality,
 anomalies: result.anomalies,
 scoreChange: 0,
 };
 const newHistoryPoint: DataPoint = {
 time: newTime,
 ...result.newQuality,
 };
 const newAnomalies = [...state.anomalies, ...result.anomalyEvents];
 const isFinished = newTime >= TOTAL_TIME;
 const newOperations = [...state.operations, newOperation];
 const newTotalCost = state.totalCost + result.cost;
 if (isFinished) {
 const scoreResult = calculateScore(result.newQuality, state.targetThresholds, newTotalCost, newOperations);
 set({
 currentTime: newTime,
 currentWater: result.newQuality,
 operations: newOperations,
 historyData: [...state.historyData, newHistoryPoint],
 totalCost: newTotalCost,
 score: scoreResult.total,
 anomalies: newAnomalies,
 reboundEffects: result.reboundEffects,
 status: 'finished',
 });
 }
 else {
 set({
 currentTime: newTime,
 currentWater: result.newQuality,
 operations: newOperations,
 historyData: [...state.historyData, newHistoryPoint],
 totalCost: newTotalCost,
 anomalies: newAnomalies,
 reboundEffects: result.reboundEffects,
 });
 }
 },
 setSelectedChemical: (id: string | null) => {
 const state = get();
 const chemical = id ? CHEMICALS.find(c => c.id === id) : null;
 if (chemical) {
 const [, maxDosage] = chemical.dosageRange;
 set({
 selectedChemical: id,
 currentDosage: Math.round(maxDosage * 0.5),
 });
 }
 else {
 set({ selectedChemical: id });
 }
 },
 setCurrentDosage: (value: number) => set({ currentDosage: value }),
 setCurrentMixingTime: (value: number) => set({ currentMixingTime: value }),
 dismissAnomaly: (id: string) => {
 set(state => ({
 anomalies: state.anomalies.filter(a => a.id !== id),
 }));
 },
 finishSimulation: () => {
 const state = get();
 const scoreResult = calculateScore(state.currentWater, state.targetThresholds, state.totalCost, state.operations);
 set({
 status: 'finished',
 score: scoreResult.total,
 });
 },
}));

