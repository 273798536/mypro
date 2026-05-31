import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { RevenueResult, RateVersion } from '../types';
import { db } from '../utils/db';
import { revenueEngine } from '../engines/revenueEngine';
import { useCollectionStore } from './collection';
import { useAuthStore } from './auth';
import { auditEngine } from '../engines/auditEngine';

export const useRevenueStore = defineStore('revenue', () => {
  const collectionStore = useCollectionStore();
  const authStore = useAuthStore();
  
  const results = ref<RevenueResult[]>([]);
  const rateVersions = ref<RateVersion[]>([]);
  const loading = ref(false);
  const currentPeriod = ref('');

  const totalPlatformShare = computed(() => 
    results.value.reduce((sum, r) => sum + r.platformShare, 0)
  );
  const totalDeveloperShare = computed(() => 
    results.value.reduce((sum, r) => sum + r.developerShare, 0)
  );
  const totalChannelFee = computed(() => 
    results.value.reduce((sum, r) => sum + r.channelFee, 0)
  );
  const anomalyCount = computed(() => 
    results.value.filter(r => r.hasAnomaly).length
  );

  async function loadRates() {
    rateVersions.value = await db.rateVersions.toArray();
  }

  async function loadResults(period?: string) {
    loading.value = true;
    try {
      if (period) {
        currentPeriod.value = period;
        results.value = await db.revenueResults
          .where('period')
          .equals(period)
          .toArray();
      } else {
        results.value = await db.revenueResults.toArray();
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadAll(period?: string) {
    await Promise.all([loadRates(), loadResults(period)]);
  }

  async function addRateVersion(rate: Omit<RateVersion, 'id' | 'createTime' | 'createBy'>) {
    const authStore = useAuthStore();
    
    const newRate: RateVersion = {
      ...rate,
      id: uuidv4(),
      createTime: new Date().toISOString(),
      createBy: authStore.userName,
    };

    if (newRate.isActive) {
      await db.rateVersions
        .where('channel')
        .equals(rate.channel)
        .and(r => r.gameId === rate.gameId && r.isActive)
        .modify({ isActive: false });
    }

    await db.rateVersions.add(newRate);
    
    await auditEngine.log(
      'upload',
      'rate_version',
      newRate.id,
      authStore.userName,
      '费率管理',
      undefined,
      newRate,
      `新增费率版本 ${newRate.version}`
    );

    await loadRates();
    return newRate;
  }

  async function updateRateVersion(id: string, updates: Partial<RateVersion>, reason: string) {
    const beforeChange = await db.rateVersions.get(id);
    await db.rateVersions.update(id, updates);
    
    await auditEngine.log(
      'update',
      'rate_version',
      id,
      authStore.userName,
      '费率管理',
      beforeChange,
      { ...beforeChange, ...updates },
      reason
    );

    await loadRates();
  }

  async function calculateRevenue(period: string) {
    loading.value = true;
    try {
      await collectionStore.loadAll(period);
      await loadRates();

      const { results: newResults, rateMismatches } = revenueEngine.calculate(
        collectionStore.collections,
        rateVersions.value,
        period
      );

      await db.transaction('rw', db.revenueResults, async () => {
        const existing = await db.revenueResults.where('period').equals(period).toArray();
        for (const res of existing) {
          await db.revenueResults.delete(res.id);
        }
        for (const res of newResults) {
          await db.revenueResults.add(res);
        }
      });

      await auditEngine.log(
        'calculate',
        'revenue_result',
        period,
        authStore.userName,
        '分成计算',
        undefined,
        { count: newResults.length, rateMismatches: rateMismatches.length },
        '执行分成计算'
      );

      await loadResults(period);

      return {
        success: true,
        count: newResults.length,
        rateMismatches,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        count: 0,
        rateMismatches: [],
      };
    } finally {
      loading.value = false;
    }
  }

  async function applyAdjustment(
    resultId: string,
    amount: number,
    reason: string
  ) {
    const result = results.value.find(r => r.id === resultId);
    if (!result) return null;

    const updated = revenueEngine.recalculateWithAdjustment(
      result,
      amount,
      reason,
      authStore.userName
    );

    await db.revenueResults.update(resultId, updated);
    
    await auditEngine.log(
      'adjust',
      'revenue_result',
      resultId,
      authStore.userName,
      '分成计算',
      result,
      updated,
      reason
    );

    await loadResults(currentPeriod.value || undefined);
    return updated;
  }

  async function applyDeduction(
    resultId: string,
    amount: number,
    reason: string
  ) {
    const result = results.value.find(r => r.id === resultId);
    if (!result) return null;

    const updated = revenueEngine.applyDeduction(
      result,
      amount,
      reason,
      authStore.userName
    );

    await db.revenueResults.update(resultId, updated);
    
    await auditEngine.log(
      'adjust',
      'revenue_result',
      resultId,
      authStore.userName,
      '分成计算',
      result,
      updated,
      `抵扣: ${reason}`
    );

    await loadResults(currentPeriod.value || undefined);
    return updated;
  }

  async function rollbackDeduction(
    resultId: string,
    deductionId: string,
    reason: string
  ) {
    const result = results.value.find(r => r.id === resultId);
    if (!result) return null;

    const beforeChange = { ...result };
    const updated = revenueEngine.rollbackDeduction(
      result,
      deductionId,
      authStore.userName
    );

    await db.revenueResults.update(resultId, updated);
    
    await auditEngine.log(
      'adjust',
      'revenue_result',
      resultId,
      authStore.userName,
      '分成计算',
      beforeChange,
      updated,
      reason
    );

    await loadResults(currentPeriod.value || undefined);
    return updated;
  }

  async function markAnomaly(resultId: string, anomalyId: string) {
    const result = results.value.find(r => r.id === resultId);
    if (!result) return;

    const beforeChange = { ...result };
    const updated = {
      ...result,
      hasAnomaly: true,
      anomalyIds: [...new Set([...result.anomalyIds, anomalyId])],
    };

    await db.revenueResults.update(resultId, updated);
    
    await auditEngine.log(
      'update',
      'revenue_result',
      resultId,
      authStore.userName,
      '分成计算',
      beforeChange,
      updated,
      '标记异常'
    );

    await loadResults(currentPeriod.value || undefined);
  }

  return {
    results,
    rateVersions,
    loading,
    currentPeriod,
    totalPlatformShare,
    totalDeveloperShare,
    totalChannelFee,
    anomalyCount,
    loadAll,
    loadRates,
    loadResults,
    addRateVersion,
    updateRateVersion,
    calculateRevenue,
    applyAdjustment,
    applyDeduction,
    rollbackDeduction,
    markAnomaly,
  };
});
