<template>
  <div class="p-6 space-y-6">
    <div class="grid grid-cols-4 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">渠道账单</p>
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ datasourceStore.channelBills.length }}</p>
            <p class="text-sm text-success-600 mt-2">{{ formatCurrency(datasourceStore.summary.channelBillAmount) }}</p>
          </div>
          <div class="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center">
            <FileText class="w-6 h-6 text-info-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">游戏订单</p>
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ datasourceStore.gameOrders.length }}</p>
            <p class="text-sm text-success-600 mt-2">{{ formatCurrency(datasourceStore.summary.gameOrderAmount) }}</p>
          </div>
          <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
            <ShoppingCart class="w-6 h-6 text-success-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">退款记录</p>
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ datasourceStore.refundRecords.length }}</p>
            <p class="text-sm text-danger-600 mt-2">{{ formatCurrency(datasourceStore.summary.refundAmount) }}</p>
          </div>
          <div class="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
            <RotateCcw class="w-6 h-6 text-danger-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">待处理异常</p>
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ anomalyStore.openCount }}</p>
            <p class="text-sm text-warning-600 mt-2">共 {{ anomalyStore.anomalies.length }} 条</p>
          </div>
          <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
            <AlertTriangle class="w-6 h-6 text-warning-600" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="card">
        <h3 class="font-semibold text-gray-800 mb-4">异常分布</h3>
        <div class="space-y-4">
          <div v-for="(item, key) in anomalyStats" :key="key" class="flex items-center justify-between">
            <div class="flex items-center">
              <span 
                class="w-3 h-3 rounded-full mr-3"
                :class="key === 'cross_server_refund' ? 'bg-danger-500' : key === 'rate_version_mismatch' ? 'bg-warning-500' : 'bg-info-500'"
              ></span>
              <span class="text-sm text-gray-600">{{ anomalyTypeLabel(key as any) }}</span>
            </div>
            <span class="font-medium">{{ item }} 条</span>
          </div>
        </div>
      </div>

      <div class="card col-span-2">
        <h3 class="font-semibold text-gray-800 mb-4">最近操作记录</h3>
        <el-table :data="recentLogs" stripe border size="small" style="width: 100%">
          <el-table-column prop="operateTime" label="时间" width="160" :formatter="formatTime" />
          <el-table-column prop="operator" label="操作人" width="100" />
          <el-table-column prop="module" label="模块" width="120" />
          <el-table-column prop="operationType" label="操作" width="80" />
          <el-table-column prop="changeReason" label="说明" min-width="200" show-overflow-tooltip />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { FileText, ShoppingCart, RotateCcw, AlertTriangle } from 'lucide-vue-next';
import { useDatasourceStore } from '@/stores/datasource';
import { useAnomalyStore } from '@/stores/anomaly';
import { useAuditStore } from '@/stores/audit';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { AnomalyType } from '@/types';

const datasourceStore = useDatasourceStore();
const anomalyStore = useAnomalyStore();
const auditStore = useAuditStore();

const recentLogs = computed(() => auditStore.logs.slice(0, 8));

const anomalyStats = computed(() => {
  const stats: Record<string, number> = {
    cross_server_refund: 0,
    rate_version_mismatch: 0,
    duplicate_deduction: 0,
  };
  anomalyStore.anomalies.forEach(r => {
    stats[r.type] = (stats[r.type] || 0) + 1;
  });
  return stats;
});

function anomalyTypeLabel(type: AnomalyType): string {
  const map: Record<AnomalyType, string> = {
    cross_server_refund: '跨服退款',
    rate_version_mismatch: '费率版本错配',
    duplicate_deduction: '抵扣重复',
  };
  return map[type] || type;
}

function formatTime(_row: any, _col: any, cellValue: string) {
  return formatDateTime(cellValue);
}

onMounted(async () => {
  await auditStore.loadLogs();
  await datasourceStore.loadAll();
  await anomalyStore.loadAll();
});
</script>
