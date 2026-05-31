<template>
  <div class="p-6 space-y-6">
    <div class="grid grid-cols-3 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">分成结果</p>
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ revenueStore.results.length }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <FileSpreadsheet class="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总金额</p>
            <p class="text-2xl font-bold text-success-600 mt-2">{{ formatCurrency(summary.gross) }}</p>
          </div>
          <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
            <DollarSign class="w-6 h-6 text-success-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">开发商分成</p>
            <p class="text-2xl font-bold text-info-600 mt-2">{{ formatCurrency(summary.developer) }}</p>
          </div>
          <div class="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center">
            <Users class="w-6 h-6 text-info-600" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <div class="card">
        <h3 class="font-semibold text-gray-800 mb-4">导出配置</h3>
        <el-form label-width="100px" class="space-y-4">
          <el-form-item label="账期">
            <el-select v-model="exportForm.period" placeholder="选择账期" style="width: 100%;">
              <el-option v-for="p in periodOptions" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
          <el-form-item label="导出范围">
            <el-radio-group v-model="exportForm.scope">
              <el-radio value="all">全部记录</el-radio>
              <el-radio value="no_anomaly">排除异常</el-radio>
              <el-radio value="resolved">仅已对账</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="导出格式">
            <el-radio-group v-model="exportForm.format">
              <el-radio value="excel">Excel</el-radio>
              <el-radio value="csv">CSV</el-radio>
              <el-radio value="pdf">PDF</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="包含内容">
            <el-checkbox-group v-model="exportForm.includes">
              <el-checkbox label="revenue">分成结果</el-checkbox>
              <el-checkbox label="collection">归集记录</el-checkbox>
              <el-checkbox label="anomaly">异常记录</el-checkbox>
              <el-checkbox label="audit">审计日志</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="按渠道汇总">
            <el-switch v-model="exportForm.summaryByChannel" />
          </el-form-item>
          <el-form-item label="按游戏汇总">
            <el-switch v-model="exportForm.summaryByGame" />
          </el-form-item>
        </el-form>
      </div>

      <div class="card">
        <h3 class="font-semibold text-gray-800 mb-4">数据链路完整性检查</h3>
        
        <div class="space-y-3">
          <div 
            v-for="check in integrityChecks" 
            :key="check.name"
            class="p-4 rounded-lg border"
            :class="check.passed ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-start">
                <CheckCircle 
                  v-if="check.passed" 
                  class="w-5 h-5 text-success-600 mr-3 flex-shrink-0 mt-0.5" 
                />
                <XCircle 
                  v-else 
                  class="w-5 h-5 text-danger-600 mr-3 flex-shrink-0 mt-0.5" 
                />
                <div>
                  <p class="font-medium" :class="check.passed ? 'text-success-800' : 'text-danger-800'">
                    {{ check.name }}
                  </p>
                  <p class="text-sm mt-1" :class="check.passed ? 'text-success-600' : 'text-danger-600'">
                    {{ check.message }}
                  </p>
                </div>
              </div>
              <span :class="check.passed ? 'badge-success' : 'badge-danger'">
                {{ check.passed ? '通过' : '不通过' }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-6 border-t">
          <h4 class="font-medium mb-3">导出预览</h4>
          <div class="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-500">导出文件</span>
              <span class="font-mono">{{ previewFileName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">预计行数</span>
              <span>{{ previewCount }} 行</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">包含Sheet</span>
              <span>{{ exportForm.includes.join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-gray-800">分成结果（待导出）</h3>
          <p class="text-sm text-gray-500 mt-1">仅展示前 50 条记录，导出包含全部</p>
        </div>
        <div class="flex items-center space-x-3">
          <button class="btn-secondary" @click="previewExport">
            <Eye class="w-4 h-4 mr-2" />
            预览
          </button>
          <button 
            class="btn-primary flex items-center"
            @click="doExport"
            :disabled="exporting"
          >
            <Download v-if="!exporting" class="w-4 h-4 mr-2" />
            <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
            {{ exporting ? '导出中...' : '导出报表' }}
          </button>
        </div>
      </div>

      <el-table :data="exportPreviewData" stripe border size="small" style="width: 100%; margin-top: 16px;">
        <el-table-column prop="revenueNo" label="分成编号" width="180" />
        <el-table-column prop="collectionNo" label="归集编号" width="180" />
        <el-table-column prop="gameName" label="游戏" width="120" />
        <el-table-column label="渠道" width="110">
          <template #default="{ row }">
            <span class="badge-info">{{ channelLabel(row.channel) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="grossAmount" label="总金额" width="100" align="right">
          <template #default="{ row }">{{ formatCurrency(row.grossAmount) }}</template>
        </el-table-column>
        <el-table-column prop="refundAmount" label="退款" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.refundAmount > 0" class="text-danger-600">-{{ formatCurrency(row.refundAmount) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="netAmount" label="净额" width="100" align="right">
          <template #default="{ row }">
            <span class="font-medium">{{ formatCurrency(row.netAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="channelShare" label="渠道" width="100" align="right">
          <template #default="{ row }">{{ formatCurrency(row.channelShare) }}</template>
        </el-table-column>
        <el-table-column prop="platformShare" label="平台" width="100" align="right">
          <template #default="{ row }">{{ formatCurrency(row.platformShare) }}</template>
        </el-table-column>
        <el-table-column prop="developerShare" label="开发商" width="110" align="right">
          <template #default="{ row }">{{ formatCurrency(row.developerShare) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <span :class="hasAnomaly(row.id) ? 'badge-danger' : 'badge-success'">
              {{ hasAnomaly(row.id) ? '有异常' : '正常' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  FileSpreadsheet, DollarSign, Users, Eye, Download, Loader2,
  CheckCircle, XCircle
} from 'lucide-vue-next';
import { useRevenueStore } from '@/stores/revenue';
import { useCollectionStore } from '@/stores/collection';
import { useDatasourceStore } from '@/stores/datasource';
import { useAnomalyStore } from '@/stores/anomaly';
import { formatCurrency } from '@/utils/format';
import { exportToExcel, exportToCSV, exportToPDF } from '@/utils/export';
import type { Channel, RevenueResult } from '@/types';

const revenueStore = useRevenueStore();
const collectionStore = useCollectionStore();
const datasourceStore = useDatasourceStore();
const anomalyStore = useAnomalyStore();

const exporting = ref(false);
const exportForm = reactive({
  period: '',
  scope: 'all' as 'all' | 'no_anomaly' | 'resolved',
  format: 'excel' as 'excel' | 'csv' | 'pdf',
  includes: ['revenue', 'collection'] as string[],
  summaryByChannel: true,
  summaryByGame: true,
});

const periodOptions = computed(() => datasourceStore.periodList);
const exportPreviewData = computed(() => revenueStore.results.slice(0, 50));

const summary = computed(() => {
  let gross = 0, developer = 0;
  revenueStore.results.forEach(r => {
    gross += r.grossAmount;
    developer += r.developerShare;
  });
  return { gross, developer };
});

const previewFileName = computed(() => {
  const period = exportForm.period || new Date().toISOString().slice(0, 7);
  const ext = exportForm.format === 'excel' ? 'xlsx' : exportForm.format === 'csv' ? 'csv' : 'pdf';
  return `游戏渠道分成对账报表_${period}.${ext}`;
});

const previewCount = computed(() => {
  let count = revenueStore.results.length;
  if (exportForm.includes.includes('collection')) count += collectionStore.collections.length;
  if (exportForm.includes.includes('anomaly')) count += anomalyStore.anomalies.length;
  if (exportForm.summaryByChannel) count += 3;
  if (exportForm.summaryByGame) count += 3;
  return count;
});

const integrityChecks = computed(() => {
  const revenueIds = new Set(revenueStore.results.map(r => r.collectionId));
  const collectionIds = new Set(collectionStore.collections.map(r => r.id));
  const missingCollections = collectionStore.collections.filter(r => !revenueIds.has(r.id));
  
  const bills = datasourceStore.channelBills.length;
  const orders = datasourceStore.gameOrders.length;
  const collected = collectionStore.collections.filter(r => r.status === 'matched').length;
  const matchRate = orders > 0 ? collected / orders : 0;
  
  const openAnomalies = anomalyStore.anomalies.filter(r => r.status === 'open').length;

  return [
    {
      name: '渠道账单与订单归集匹配',
      passed: bills === orders,
      message: bills === orders 
        ? `账单 ${bills} 条，订单 ${orders} 条，数量一致` 
        : `账单 ${bills} 条，订单 ${orders} 条，存在差异`,
    },
    {
      name: '归集记录与分成结果关联',
      passed: missingCollections.length === 0,
      message: missingCollections.length === 0 
        ? '所有归集记录均已计算分成' 
        : `存在 ${missingCollections.length} 条归集记录未计算分成`,
    },
    {
      name: '订单匹配率检查',
      passed: matchRate >= 0.95,
      message: `当前匹配率 ${(matchRate * 100).toFixed(1)}%，${matchRate >= 0.95 ? '符合要求' : '建议检查未匹配订单'}`,
    },
    {
      name: '待处理异常检查',
      passed: openAnomalies === 0,
      message: openAnomalies === 0 
        ? '无待处理异常' 
        : `存在 ${openAnomalies} 条待处理异常`,
    },
  ];
});

function channelLabel(c: Channel): string {
  const map: Record<Channel, string> = {
    apple: 'App Store',
    google: 'Google Play',
    taptap: 'TapTap',
  };
  return map[c] || c;
}

function hasAnomaly(revenueId: string): boolean {
  return anomalyStore.anomalies.some(r => r.affectedResultIds.includes(revenueId) && r.status !== 'resolved');
}

function getExportData(): RevenueResult[] {
  let data = revenueStore.results;
  if (exportForm.scope === 'no_anomaly') {
    const anomalyRevenueIds = new Set(
      anomalyStore.anomalies.filter(r => r.status !== 'resolved').flatMap(r => r.affectedResultIds)
    );
    data = data.filter(r => !anomalyRevenueIds.has(r.id));
  } else if (exportForm.scope === 'resolved') {
    const resolvedCollectionIds = new Set(
      collectionStore.collections.filter(r => r.status === 'reconciled').map(r => r.id)
    );
    data = data.filter(r => resolvedCollectionIds.has(r.collectionId));
  }
  return data;
}

function previewExport() {
  ElMessage.info(`预览功能将展示前 50 条记录，完整数据请导出查看`);
}

async function doExport() {
  if (revenueStore.results.length === 0) {
    ElMessage.warning('暂无数据可导出');
    return;
  }
  if (exportForm.includes.length === 0) {
    ElMessage.warning('请选择要导出的内容');
    return;
  }

  exporting.value = true;
  try {
    const data = getExportData();
    const period = exportForm.period || new Date().toISOString().slice(0, 7);
    const options = {
      period,
      includes: exportForm.includes,
      summaryByChannel: exportForm.summaryByChannel,
      summaryByGame: exportForm.summaryByGame,
      collections: exportForm.includes.includes('collection') ? collectionStore.collections : [],
      anomalies: exportForm.includes.includes('anomaly') ? anomalyStore.anomalies : [],
    };

    if (exportForm.format === 'excel') {
      exportToExcel(data, options);
    } else if (exportForm.format === 'csv') {
      exportToCSV(data, options);
    } else {
      exportToPDF(data, options);
    }
    ElMessage.success(`导出成功：${data.length} 条记录`);
  } catch (e: any) {
    ElMessage.error('导出失败：' + e.message);
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    datasourceStore.loadAll(),
    revenueStore.loadAll(),
    collectionStore.loadAll(),
    anomalyStore.loadAll(),
  ]);
  if (periodOptions.value.length > 0) {
    exportForm.period = periodOptions.value[0];
  }
});
</script>
