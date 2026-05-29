import { useCallback } from 'react';
import type { DataSource, DataConflict, DataRecord } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { GAME_CONFIG } from '@/data/gameConfig';
import { generateId } from '@/utils/carbonCalculator';
import { ALL_ACTIVITIES } from '@/data/activities';
export function useDataMerge() {
 const { selectedActivities, setDataSources, setConflicts, resolveConflict, currentResources, } = useGameStore();
 const generateMockData = useCallback(() => {
 const activityRecords: DataRecord[] = [];
 const electricityRecords: DataRecord[] = [];
 selectedActivities.forEach(selection => {
 const activity = ALL_ACTIVITIES.find(a => a.id === selection.activityId);
 if (!activity) return;
 activityRecords.push({
 round: selection.round,
 activityId: activity.id,
 activityName: activity.name,
 value: activity.cost.electricity * selection.count,
 unit: 'kWh',
 field: 'electricity',
 });
 activityRecords.push({
 round: selection.round,
 activityId: activity.id,
 activityName: activity.name,
 value: activity.carbonReduction * selection.count,
 unit: 'kg CO2',
 field: 'carbonReduction',
 });
 const electricAdjustment = 1 + (Math.random() * 0.2 - 0.1);
 const carbonAdjustment = 1 + (Math.random() * 0.15 - 0.075);
 electricityRecords.push({
 round: selection.round,
 activityId: activity.id,
 activityName: activity.name,
 value: Math.round(activity.cost.electricity * selection.count * electricAdjustment),
 unit: 'kWh',
 field: 'electricity',
 });
 electricityRecords.push({
 round: selection.round,
 activityId: activity.id,
 activityName: activity.name,
 value: Math.round(activity.carbonReduction * selection.count * carbonAdjustment),
 unit: 'kg CO2',
 field: 'carbonReduction',
 });
 });
 const activitySource: DataSource = {
 id: generateId(),
 name: 'activity',
 maintainer: '活动策划组 - 小明',
 records: activityRecords,
 lastUpdated: Date.now(),
 };
 const electricitySource: DataSource = {
 id: generateId(),
 name: 'electricity',
 maintainer: '设施管理组 - 小红',
 records: electricityRecords,
 lastUpdated: Date.now(),
 };
 return { activitySource, electricitySource };
 }, [selectedActivities]);
 const findConflicts = useCallback((source1: DataSource, source2: DataSource): DataConflict[] => {
 const conflicts: DataConflict[] = [];
 const threshold = GAME_CONFIG.CONFLICT_THRESHOLD_PERCENT;
 source1.records.forEach(record1 => {
 const record2 = source2.records.find(
 r => r.round === record1.round && r.activityId === record1.activityId && r.field === record1.field
 );
 if (!record2) return;
 const diff = Math.abs(record1.value - record2.value);
 const avg = (record1.value + record2.value) / 2;
 const diffPercent = avg > 0 ? (diff / avg) * 100 : 0;
 if (diffPercent > threshold) {
 conflicts.push({
 id: generateId(),
 round: record1.round,
 activityId: record1.activityId,
 activityName: record1.activityName,
 field: record1.field,
 activityValue: record1.value,
 electricityValue: record2.value,
 diffPercent,
 resolved: false,
 });
 }
 });
 return conflicts;
 }, []);
 const initializeMerge = useCallback(() => {
 const { activitySource, electricitySource } = generateMockData();
 setDataSources([activitySource, electricitySource]);
 const conflicts = findConflicts(activitySource, electricitySource);
 setConflicts(conflicts);
 return { activitySource, electricitySource, conflicts };
 }, [generateMockData, findConflicts, setDataSources, setConflicts]);
 const getFieldLabel = useCallback((field: string): string => {
 const labels: Record<string, string> = {
 electricity: '用电量',
 carbonReduction: '碳减排量',
 budget: '经费',
 };
 return labels[field] || field;
 }, []);
 const getFinalData = useCallback(() => {
 const { dataSources, conflicts } = useGameStore.getState();
 const activitySource = dataSources.find(s => s.name === 'activity');
 if (!activitySource) return [];
 return activitySource.records.map(record => {
 const conflict = conflicts.find(
 c => c.round === record.round &&
 c.activityId === record.activityId &&
 c.field === record.field &&
 c.resolved
 );
 if (conflict) {
 return {
 ...record,
 value: conflict.finalValue ?? record.value,
 isMerged: true,
 resolvedConflict: conflict,
 };
 }
 return { ...record, isMerged: false };
 });
 }, []);
 const allConflictsResolved = useCallback((): boolean => {
 return useGameStore.getState().conflicts.every(c => c.resolved);
 }, []);
 return {
 initializeMerge,
 resolveConflict,
 getFieldLabel,
 getFinalData,
 allConflictsResolved,
 findConflicts,
 };
}
