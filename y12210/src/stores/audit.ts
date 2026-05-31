import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AuditLog, TraceChain } from '../types';
import { auditEngine } from '../engines/auditEngine';
import { useDatasourceStore } from './datasource';
import { useCollectionStore } from './collection';
import { useRevenueStore } from './revenue';

export const useAuditStore = defineStore('audit', () => {
  const datasourceStore = useDatasourceStore();
  const collectionStore = useCollectionStore();
  const revenueStore = useRevenueStore();
  
  const logs = ref<AuditLog[]>([]);
  const loading = ref(false);
  const totalLogs = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(50);
  const traceChain = ref<TraceChain | null>(null);

  const hasMore = computed(() => 
    currentPage.value * pageSize.value < totalLogs.value
  );

  async function loadLogs(page: number = 1) {
    loading.value = true;
    try {
      currentPage.value = page;
      const offset = (page - 1) * pageSize.value;
      const { logs: newLogs, total } = await auditEngine.getAllLogs(pageSize.value, offset);
      logs.value = page === 1 ? newLogs : [...logs.value, ...newLogs];
      totalLogs.value = total;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    if (hasMore.value) {
      await loadLogs(currentPage.value + 1);
    }
  }

  async function loadHistory(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    return auditEngine.getHistory(resourceType, resourceId);
  }

  async function traceResult(resultId: string): Promise<TraceChain | null> {
    loading.value = true;
    try {
      await Promise.all([
        datasourceStore.loadAll(),
        collectionStore.loadAll(),
        revenueStore.loadAll(),
      ]);

      const chain = await auditEngine.trace(
        resultId,
        revenueStore.results,
        collectionStore.collections,
        datasourceStore.channelBills,
        datasourceStore.gameOrders,
        datasourceStore.refundRecords,
        revenueStore.rateVersions
      );

      traceChain.value = chain;
      return chain;
    } catch (e) {
      console.error('Trace failed:', e);
      return null;
    } finally {
      loading.value = false;
    }
  }

  function clearTrace() {
    traceChain.value = null;
  }

  async function compareVersions(
    resourceType: string,
    resourceId: string,
    version1Time: string,
    version2Time: string
  ) {
    return auditEngine.compareVersions(
      resourceType,
      resourceId,
      version1Time,
      version2Time
    );
  }

  async function exportAllData(): Promise<string> {
    const { exportAllData } = await import('../utils/db');
    return exportAllData();
  }

  async function importAllData(jsonString: string) {
    const { importAllData } = await import('../utils/db');
    return importAllData(jsonString);
  }

  async function clearDatabase() {
    const { clearAllData } = await import('../utils/db');
    await clearAllData();
    logs.value = [];
    totalLogs.value = 0;
  }

  return {
    logs,
    loading,
    totalLogs,
    currentPage,
    pageSize,
    traceChain,
    hasMore,
    loadLogs,
    loadMore,
    loadHistory,
    traceResult,
    clearTrace,
    compareVersions,
    exportAllData,
    importAllData,
    clearDatabase,
  };
});
