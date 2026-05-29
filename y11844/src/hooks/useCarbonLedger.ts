import { useCallback } from 'react';
import type { Activity, ActivitySelection, CarbonRecord } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { generateId } from '@/utils/carbonCalculator';
export function useCarbonLedger() {
 const {
 currentRound,
 addCarbonRecord,
 removeCarbonRecord,
 updateCarbonRecord,
 addToTotalCarbon,
 } = useGameStore();
 const addEmissionRecord = useCallback((activity: Activity, selection: ActivitySelection) => {
 const record: CarbonRecord = {
 id: generateId(),
 round: currentRound,
 type: 'emission',
 amount: activity.carbonEmission * selection.count,
 source: activity.name,
 sourceActivityId: activity.id,
 timestamp: Date.now(),
 isOffset: false,
 };
 addCarbonRecord(record);
 addToTotalCarbon(0, record.amount);
 return record;
 }, [currentRound, addCarbonRecord, addToTotalCarbon]);
 const addReductionRecord = useCallback((activity: Activity, selection: ActivitySelection, isOffset: boolean = true): CarbonRecord => {
 const record: CarbonRecord = {
 id: generateId(),
 round: currentRound,
 type: 'reduction',
 amount: activity.carbonReduction * selection.count,
 source: activity.name,
 sourceActivityId: activity.id,
 timestamp: Date.now(),
 isOffset,
 };
 addCarbonRecord(record);
 addToTotalCarbon(record.amount, 0);
 return record;
 }, [currentRound, addCarbonRecord, addToTotalCarbon]);
 const addDelayedReductionRecord = useCallback((activity: Activity, selection: ActivitySelection, effectiveRound: number): CarbonRecord => {
 const record: CarbonRecord = {
 id: generateId(),
 round: currentRound,
 type: 'reduction',
 amount: activity.carbonReduction * selection.count,
 source: `${activity.name}（延迟生效）`,
 sourceActivityId: activity.id,
 timestamp: Date.now(),
 isOffset: true,
 delayed: true,
 effectiveRound,
 };
 addCarbonRecord(record);
 return record;
 }, [currentRound, addCarbonRecord]);
 const markAsDelayed = useCallback((recordId: string, effectiveRound: number) => {
 updateCarbonRecord(recordId, {
 delayed: true,
 effectiveRound,
 source: `${useGameStore.getState().carbonLedger.find(r => r.id === recordId)?.source || ''}（延迟中）`,
 });
 }, [updateCarbonRecord]);
 const getRecordsByRound = useCallback((round: number): CarbonRecord[] => {
 return useGameStore.getState().carbonLedger.filter(r => r.round === round);
 }, []);
 const getNetCarbonByRound = useCallback((round: number): { reduction: number; emission: number; net: number } => {
 const records = getRecordsByRound(round);
 return records.reduce(
 (acc, record) => {
 if (record.type === 'reduction' && record.isOffset && (!record.delayed || (record.effectiveRound && record.effectiveRound <= round))) {
 acc.reduction += record.amount;
 }
 if (record.type === 'emission') {
 acc.emission += record.amount;
 }
 acc.net = acc.reduction - acc.emission;
 return acc;
 },
 { reduction: 0, emission: 0, net: 0 }
 );
 }, [getRecordsByRound]);
 return {
 addEmissionRecord,
 addReductionRecord,
 addDelayedReductionRecord,
 markAsDelayed,
 getRecordsByRound,
 getNetCarbonByRound,
 removeCarbonRecord,
 };
}
