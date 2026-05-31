import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { OrderCollection, MatchRule } from '../types';
import { db } from '../utils/db';
import { collectionEngine } from '../engines/collectionEngine';
import { useDatasourceStore } from './datasource';
import { useAuthStore } from './auth';
import { auditEngine } from '../engines/auditEngine';

export const useCollectionStore = defineStore('collection', () => {
  const datasourceStore = useDatasourceStore();
  const authStore = useAuthStore();
  
  const collections = ref<OrderCollection[]>([]);
  const loading = ref(false);
  const currentPeriod = ref('');
  const matchRule = ref<MatchRule>(collectionEngine.getMatchRule());

  const matchedCount = computed(() => 
    collections.value.filter(c => c.status === 'matched').length
  );
  const pendingCount = computed(() => 
    collections.value.filter(c => c.status === 'pending').length
  );
  const mismatchCount = computed(() => 
    collections.value.filter(c => c.status === 'mismatch').length
  );
  const totalAmount = computed(() => 
    collections.value.reduce((sum, c) => sum + c.netAmount, 0)
  );

  async function loadAll(period?: string) {
    loading.value = true;
    try {
      if (period) {
        currentPeriod.value = period;
        collections.value = await db.orderCollections
          .where('period')
          .equals(period)
          .toArray();
      } else {
        collections.value = await db.orderCollections.toArray();
      }
    } finally {
      loading.value = false;
    }
  }

  async function runCollection(period: string) {
    loading.value = true;
    try {
      await datasourceStore.loadAll(period);
      
      const matchResult = collectionEngine.match(
        datasourceStore.channelBills,
        datasourceStore.gameOrders,
        datasourceStore.refundRecords,
        matchRule.value
      );

      const newCollections = collectionEngine.collect(
        matchResult,
        datasourceStore.refundRecords,
        period
      );

      await db.transaction('rw', db.orderCollections, async () => {
        const existing = await db.orderCollections.where('period').equals(period).toArray();
        for (const col of existing) {
          await db.orderCollections.delete(col.id);
        }
        for (const col of newCollections) {
          await db.orderCollections.add(col);
        }
      });

      await auditEngine.log(
        'calculate',
        'order_collection',
        period,
        authStore.userName,
        '订单归集',
        undefined,
        { count: newCollections.length, matchConfidence: matchResult.confidence },
        '执行订单归集'
      );

      await loadAll(period);

      return {
        success: true,
        count: newCollections.length,
        confidence: matchResult.confidence,
        matched: matchResult.matchedPairs.length,
        unmatchedBills: matchResult.unmatched.channelBills.length,
        unmatchedOrders: matchResult.unmatched.gameOrders.length,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        count: 0,
        confidence: 0,
        matched: 0,
        unmatchedBills: 0,
        unmatchedOrders: 0,
      };
    } finally {
      loading.value = false;
    }
  }

  async function updateCollection(id: string, updates: Partial<OrderCollection>, reason: string) {
    const authStore = useAuthStore();
    const beforeChange = await db.orderCollections.get(id);
    
    await db.orderCollections.update(id, updates);
    
    await auditEngine.log(
      'update',
      'order_collection',
      id,
      authStore.userName,
      '订单归集',
      beforeChange,
      { ...beforeChange, ...updates },
      reason
    );

    await loadAll(currentPeriod.value || undefined);
  }

  function setMatchRule(rule: Partial<MatchRule>) {
    matchRule.value = { ...matchRule.value, ...rule };
    collectionEngine.setMatchRule(rule);
  }

  return {
    collections,
    loading,
    currentPeriod,
    matchRule,
    matchedCount,
    pendingCount,
    mismatchCount,
    totalAmount,
    loadAll,
    runCollection,
    updateCollection,
    setMatchRule,
  };
});
