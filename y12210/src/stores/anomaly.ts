import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AnomalyRecord, AnomalyStatus, ImpactAnalysis } from '../types';
import { db } from '../utils/db';
import { anomalyEngine } from '../engines/anomalyEngine';
import { useCollectionStore } from './collection';
import { useDatasourceStore } from './datasource';
import { useRevenueStore } from './revenue';
import { useAuthStore } from './auth';
import { auditEngine } from '../engines/auditEngine';

export const useAnomalyStore = defineStore('anomaly', () => {
  const collectionStore = useCollectionStore();
  const datasourceStore = useDatasourceStore();
  const revenueStore = useRevenueStore();
  const authStore = useAuthStore();
  
  const anomalies = ref<AnomalyRecord[]>([]);
  const loading = ref(false);
  const currentPeriod = ref('');
  const selectedAnomaly = ref<AnomalyRecord | null>(null);

  const openCount = computed(() => 
    anomalies.value.filter(a => a.status === 'open').length
  );
  const confirmedCount = computed(() => 
    anomalies.value.filter(a => a.status === 'confirmed').length
  );
  const resolvedCount = computed(() => 
    anomalies.value.filter(a => a.status === 'resolved').length
  );
  const criticalCount = computed(() => 
    anomalies.value.filter(a => a.severity === 'critical' && a.status !== 'resolved').length
  );

  async function loadAll(period?: string) {
    loading.value = true;
    try {
      if (period) {
        currentPeriod.value = period;
        anomalies.value = await db.anomalyRecords
          .where('period')
          .equals(period)
          .toArray();
      } else {
        anomalies.value = await db.anomalyRecords.toArray();
      }
    } finally {
      loading.value = false;
    }
  }

  async function runDetection(period: string) {
    loading.value = true;
    try {
      await Promise.all([
        datasourceStore.loadAll(period),
        collectionStore.loadAll(period),
        revenueStore.loadResults(period),
      ]);

      const newAnomalies = anomalyEngine.detect(
        collectionStore.collections,
        datasourceStore.refundRecords,
        datasourceStore.gameOrders,
        revenueStore.rateVersions,
        revenueStore.results,
      );

      await db.transaction('rw', db.anomalyRecords, async () => {
        const existing = await db.anomalyRecords.where('period').equals(period).toArray();
        for (const a of existing) {
          await db.anomalyRecords.delete(a.id);
        }
        for (const a of newAnomalies) {
          await db.anomalyRecords.add(a);
        }
      });

      for (const anomaly of newAnomalies) {
        for (const resultId of anomaly.affectedResultIds) {
          await revenueStore.markAnomaly(resultId, anomaly.id);
        }
      }

      await auditEngine.log(
        'calculate',
        'anomaly_detection',
        period,
        authStore.userName,
        '异常检测',
        undefined,
        { count: newAnomalies.length },
        '执行异常检测'
      );

      await loadAll(period);

      return {
        success: true,
        count: newAnomalies.length,
        byType: {
          cross_server_refund: newAnomalies.filter(a => a.type === 'cross_server_refund').length,
          rate_version_mismatch: newAnomalies.filter(a => a.type === 'rate_version_mismatch').length,
          duplicate_deduction: newAnomalies.filter(a => a.type === 'duplicate_deduction').length,
        },
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        count: 0,
        byType: { cross_server_refund: 0, rate_version_mismatch: 0, duplicate_deduction: 0 },
      };
    } finally {
      loading.value = false;
    }
  }

  function analyzeImpact(anomalyId: string): { success: boolean; data?: ImpactAnalysis; error?: string } {
    const anomaly = anomalies.value.find(a => a.id === anomalyId);
    if (!anomaly) {
      return { success: false, error: '异常记录不存在' };
    }
    try {
      if (!anomaly.affectedResultIds || !anomaly.affectedCollectionIds) {
        return { success: false, error: '异常记录数据不完整' };
      }
      const data = anomalyEngine.analyzeImpact(
        anomaly,
        revenueStore.results,
        collectionStore.collections
      );
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async function updateStatus(
    anomalyId: string,
    status: AnomalyStatus,
    remark: string
  ) {
    const anomaly = anomalies.value.find(a => a.id === anomalyId);
    if (!anomaly) return;

    const beforeChange = { ...anomaly };
    const updates: Partial<AnomalyRecord> = {
      status,
      handledBy: authStore.userName,
      handledTime: new Date().toISOString(),
      handleRemark: remark,
    };

    await db.anomalyRecords.update(anomalyId, updates);
    
    await auditEngine.log(
      'update',
      'anomaly_record',
      anomalyId,
      authStore.userName,
      '异常检测',
      beforeChange,
      { ...anomaly, ...updates },
      remark
    );

    await loadAll(currentPeriod.value || undefined);
  }

  async function runFullReconciliation(period: string) {
    const collectionResult = await collectionStore.runCollection(period);
    if (!collectionResult.success) {
      return { success: false, error: '订单归集失败' };
    }

    const revenueResult = await revenueStore.calculateRevenue(period);
    if (!revenueResult.success) {
      return { success: false, error: '分成计算失败' };
    }

    const anomalyResult = await runDetection(period);
    if (!anomalyResult.success) {
      return { success: false, error: '异常检测失败' };
    }

    await auditEngine.log(
      'calculate',
      'full_reconciliation',
      period,
      authStore.userName,
      '全流程对账',
      undefined,
      {
        collectionCount: collectionResult.count,
        revenueCount: revenueResult.count,
        anomalyCount: anomalyResult.count,
      },
      '执行完整对账流程'
    );

    return {
      success: true,
      collection: collectionResult,
      revenue: revenueResult,
      anomaly: anomalyResult,
    };
  }

  function selectAnomaly(anomaly: AnomalyRecord | null) {
    selectedAnomaly.value = anomaly;
  }

  return {
    anomalies,
    loading,
    currentPeriod,
    selectedAnomaly,
    openCount,
    confirmedCount,
    resolvedCount,
    criticalCount,
    loadAll,
    runDetection,
    analyzeImpact,
    updateStatus,
    runFullReconciliation,
    selectAnomaly,
  };
});
