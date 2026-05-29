import { useCallback } from 'react';
import type { Activity, ActivitySelection, AnomalyEvent, CarbonRecord, Resources } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { detectOverdraft, detectDoubleOffset, detectDelay, createPendingReduction } from '@/utils/anomalyUtils';
import { calculateTotalCost } from '@/utils/carbonCalculator';
import { ALL_ACTIVITIES } from '@/data/activities';
import { generateId } from '@/utils/carbonCalculator';
export function useAnomalyDetector() {
 const {
 currentResources,
 carbonLedger,
 currentRound,
 addAnomaly,
 addPendingReduction,
 addCarbonRecord,
 removeCarbonRecord,
 updateCarbonRecord,
 } = useGameStore();
 const checkOverdraft = useCallback((selections: ActivitySelection[]): AnomalyEvent | null => {
 const totalCost = calculateTotalCost(selections);
 const anomaly = detectOverdraft(currentResources, totalCost);
 if (anomaly) {
 addAnomaly(anomaly);
 }
 return anomaly;
 }, [currentResources, addAnomaly]);
 const checkDoubleOffset = useCallback((newRecord: CarbonRecord, activityId?: string): AnomalyEvent | null => {
 const anomaly = detectDoubleOffset(newRecord, carbonLedger, activityId);
 if (anomaly) {
 addAnomaly(anomaly);
 setTimeout(() => {
 removeCarbonRecord(newRecord.id);
 const resolution = '已撤销重复的抵扣记录，仅保留第一条有效记录。';
 updateCarbonRecord(newRecord.id, { isOffset: false });
 }, 1500);
 }
 return anomaly;
 }, [carbonLedger, addAnomaly, removeCarbonRecord, updateCarbonRecord]);
 const checkDelay = useCallback((activity: Activity, selection: ActivitySelection, forceTrigger: boolean = false): {
 shouldDelay: boolean;
 anomaly: AnomalyEvent | null;
 delayRounds: number;
 pendingId?: string;
 } => {
 const result = detectDelay(activity, forceTrigger);
 if (result.shouldDelay && result.anomaly) {
 addAnomaly(result.anomaly);
 const pending = createPendingReduction(activity, selection, result.delayRounds, currentRound);
 addPendingReduction(pending);
 return { ...result, pendingId: pending.id };
 }
 return { ...result };
 }, [currentRound, addAnomaly, addPendingReduction]);
 const simulateDoubleOffset = useCallback((activity: Activity, selection: ActivitySelection): CarbonRecord[] => {
 const records: CarbonRecord[] = [];
 const baseRecord: CarbonRecord = {
 id: generateId(),
 round: currentRound,
 type: 'reduction',
 amount: activity.carbonReduction * selection.count,
 source: activity.name,
 sourceActivityId: activity.id,
 timestamp: Date.now(),
 isOffset: true,
 };
 records.push(baseRecord);
 const duplicateRecord: CarbonRecord = {
 ...baseRecord,
 id: generateId(),
 };
 records.push(duplicateRecord);
 records.forEach(record => addCarbonRecord(record));
 setTimeout(() => {
 checkDoubleOffset(duplicateRecord, activity.id);
 }, 500);
 return records;
 }, [currentRound, addCarbonRecord, checkDoubleOffset]);
 const processAll = useCallback((selections: ActivitySelection[], includeDoubleOffset: boolean = false): AnomalyEvent[] => {
 const detectedAnomalies: AnomalyEvent[] = [];
 const overdraft = checkOverdraft(selections);
 if (overdraft)
 detectedAnomalies.push(overdraft);
 return detectedAnomalies;
 }, [checkOverdraft]);
 return {
 checkOverdraft,
 checkDoubleOffset,
 checkDelay,
 simulateDoubleOffset,
 processAll,
 };
}
