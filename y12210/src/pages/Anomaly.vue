<template>
  <div class="p-6 space-y-6">
    <div class="grid grid-cols-4 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">异常总数</p>
            <p class="text-2xl font-bold text-danger-600 mt-2">{{ anomalyStore.anomalies.length }}</p>
          </div>
          <div class="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
            <AlertTriangle class="w-6 h-6 text-danger-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">跨服退款</p>
            <p class="text-2xl font-bold text-danger-600 mt-2">{{ stats.crossServer }}</p>
          </div>
          <div class="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
            <Server class="w-6 h-6 text-danger-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">费率版本错配</p>
            <p class="text-2xl font-bold text-warning-600 mt-2">{{ stats.rateMismatch }}</p>
          </div>
          <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
            <FileX class="w-6 h-6 text-warning-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">抵扣重复</p>
            <p class="text-2xl font-bold text-info-600 mt-2">{{ stats.duplicateDeduction }}</p>
          </div>
          <div class="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center">
            <Copy class="w-6 h-6 text-info-600" />
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-4">
          <el-select v-model="filterType" placeholder="异常类型" clearable size="default" style="width: 160px;">
            <el-option label="跨服退款" value="cross_server_refund" />
            <el-option label="费率版本错配" value="rate_version_mismatch" />
            <el-option label="抵扣重复" value="duplicate_deduction" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="处理状态" clearable size="default" style="width: 140px;">
            <el-option label="待处理" value="open" />
            <el-option label="处理中" value="in_progress" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已忽略" value="ignored" />
          </el-select>
          <el-input v-model="filterKeyword" placeholder="搜索订单号/归集编号" clearable style="width: 240px;" />
        </div>
        <div class="flex items-center space-x-3">
          <button 
            class="btn-secondary flex items-center"
            @click="runDetection"
            :disabled="detecting"
          >
            <Search v-if="!detecting" class="w-4 h-4 mr-2" />
            <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
            {{ detecting ? '检测中...' : '重新检测' }}
          </button>
        </div>
      </div>

      <el-table :data="filtered" stripe border style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="p-4 bg-gray-50 space-y-4">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  :class="{
                    'bg-danger-100 text-danger-600': row.type === 'cross_server_refund',
                    'bg-warning-100 text-warning-600': row.type === 'rate_version_mismatch',
                    'bg-info-100 text-info-600': row.type === 'duplicate_deduction',
                  }">
                  <AlertTriangle class="w-5 h-5" />
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-800">{{ anomalyTypeLabel(row.type) }}</h4>
                  <p class="text-sm text-gray-600 mt-1">{{ row.description }}</p>
                </div>
              </div>

              <div v-if="row.impactAnalysis" class="bg-white p-4 rounded-lg border">
                <h5 class="font-medium mb-3 text-danger-600">影响分析</h5>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-500">影响范围</span>
                    <span>{{ row.impactAnalysis.scope }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">影响金额</span>
                    <span class="font-medium text-danger-600">{{ formatCurrency(row.impactAnalysis.amountImpact || 0) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">风险等级</span>
                    <span :class="row.impactAnalysis.riskLevel === 'high' ? 'badge-danger' : row.impactAnalysis.riskLevel === 'medium' ? 'badge-warning' : 'badge-info'">
                      {{ riskLevelLabel(row.impactAnalysis.riskLevel) }}
                    </span>
                  </div>
                  <div class="pt-2 mt-2 border-t">
                    <p class="text-gray-500 mb-2">影响的分成结果：</p>
                    <el-table :data="row.impactAnalysis.affectedRevenueResults || []" size="small" style="width: 100%;">
                      <el-table-column prop="revenueNo" label="分成编号" width="180" />
                      <el-table-column prop="gameName" label="游戏" width="120" />
                      <el-table-column prop="developerShare" label="开发商分成" width="110" align="right">
                        <template #default="{ row }">{{ formatCurrency(row) }}</template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>
              </div>

              <div v-if="row.evidence" class="bg-white p-4 rounded-lg border">
                <h5 class="font-medium mb-3 text-gray-700">数据证据</h5>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div v-for="(value, key) in row.evidence" :key="key" class="flex justify-between">
                    <span class="text-gray-500">{{ evidenceLabel(key as string) }}</span>
                    <span class="font-mono">{{ String(value) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="row.processingNote" class="bg-warning-50 p-4 rounded-lg border border-warning-200">
                <h5 class="font-medium mb-2 text-warning-700">处理说明</h5>
                <p class="text-sm text-warning-600">{{ row.processingNote }}</p>
                <p class="text-xs text-gray-500 mt-2">
                  {{ row.processedBy || '' }} · {{ row.processedTime ? formatDateTime(row.processedTime) : '' }}
                </p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="anomalyNo" label="异常编号" width="160" />
        <el-table-column label="类型" width="140">
          <template #default="{ row }">
            <span :class="typeClass(row.type)">{{ anomalyTypeLabel(row.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="风险" width="80" align="center">
          <template #default="{ row }">
            <span :class="row.impactAnalysis?.riskLevel === 'high' ? 'badge-danger' : row.impactAnalysis?.riskLevel === 'medium' ? 'badge-warning' : 'badge-info'">
              {{ riskLevelLabel(row.impactAnalysis?.riskLevel) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="collectionNo" label="归集编号" width="180" />
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="description" label="异常描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="detectTime" label="检测时间" width="160" :formatter="formatTime" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <span :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="showImpact(row)">
              <BarChart3 class="w-4 h-4" />
              影响分析
            </el-button>
            <el-button type="success" size="small" link @click="handleResolve(row)" v-if="row.status !== 'resolved'">
              <Check class="w-4 h-4" />
              处理
            </el-button>
            <el-button type="info" size="small" link @click="goToTrace(row)">
              <GitBranch class="w-4 h-4" />
              追溯
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>

    <el-dialog v-model="showResolveDialog" title="处理异常" width="500px">
      <div v-if="currentAnomaly" class="space-y-4">
        <div class="p-4 bg-gray-50 rounded-lg">
          <div class="flex items-start space-x-3">
            <AlertTriangle class="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">{{ anomalyTypeLabel(currentAnomaly.type) }}</p>
              <p class="text-sm text-gray-600 mt-1">{{ currentAnomaly.description }}</p>
            </div>
          </div>
        </div>
        <el-form label-width="100px">
          <el-form-item label="处理状态">
            <el-radio-group v-model="resolveForm.status">
              <el-radio value="resolved">已解决</el-radio>
              <el-radio value="ignored">忽略</el-radio>
              <el-radio value="in_progress">处理中</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="处理说明">
            <el-input 
              v-model="resolveForm.note" 
              type="textarea" 
              :rows="4" 
              placeholder="请详细说明处理方式和原因，便于后续追溯" 
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showResolveDialog = false">取消</button>
        <button class="btn-primary" @click="submitResolve">确认提交</button>
      </template>
    </el-dialog>

    <el-dialog v-model="showImpactDialog" title="影响分析详情" width="700px">
      <div v-if="currentAnomaly?.impactAnalysis" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-info-50 p-4 rounded-lg text-center">
            <p class="text-sm text-gray-500">影响范围</p>
            <p class="text-xl font-bold text-info-600 mt-1">{{ currentAnomaly.impactAnalysis.scope }}</p>
          </div>
          <div class="bg-danger-50 p-4 rounded-lg text-center">
            <p class="text-sm text-gray-500">影响金额</p>
            <p class="text-xl font-bold text-danger-600 mt-1">{{ formatCurrency(currentAnomaly.impactAnalysis.amountImpact || 0) }}</p>
          </div>
          <div class="bg-warning-50 p-4 rounded-lg text-center">
            <p class="text-sm text-gray-500">风险等级</p>
            <p class="text-xl font-bold text-warning-600 mt-1">{{ riskLevelLabel(currentAnomaly.impactAnalysis.riskLevel) }}</p>
          </div>
        </div>

        <div class="card">
          <h4 class="font-semibold mb-3">影响的分成结果</h4>
          <el-table :data="currentAnomaly.impactAnalysis.affectedRevenueResults || []" stripe border size="small">
            <el-table-column prop="revenueNo" label="分成编号" width="180" />
            <el-table-column prop="gameName" label="游戏" width="120" />
            <el-table-column prop="channel" label="渠道" width="110">
              <template #default="{ row }">{{ channelLabel(row) }}</template>
            </el-table-column>
            <el-table-column prop="developerShare" label="开发商分成" width="110" align="right">
              <template #default="{ row }">{{ formatCurrency(row) }}</template>
            </el-table-column>
            <el-table-column prop="channelShare" label="渠道分成" width="100" align="right">
              <template #default="{ row }">{{ formatCurrency(row) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { 
  AlertTriangle, Server, FileX, Copy, Search, Loader2, 
  BarChart3, Check, GitBranch
} from 'lucide-vue-next';
import { useAnomalyStore } from '@/stores/anomaly';
import { useDatasourceStore } from '@/stores/datasource';
import { useCollectionStore } from '@/stores/collection';
import { useRevenueStore } from '@/stores/revenue';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { AnomalyType, AnomalyStatus, Channel, RiskLevel } from '@/types';

const router = useRouter();
const anomalyStore = useAnomalyStore();
const datasourceStore = useDatasourceStore();
const collectionStore = useCollectionStore();
const revenueStore = useRevenueStore();

const page = ref(1);
const pageSize = ref(20);
const detecting = ref(false);
const filterType = ref<AnomalyType | ''>('');
const filterStatus = ref<AnomalyStatus | ''>('');
const filterKeyword = ref('');
const showResolveDialog = ref(false);
const showImpactDialog = ref(false);
const currentAnomaly = ref<any>(null);

const resolveForm = reactive({
  status: 'resolved' as AnomalyStatus,
  note: '',
});

const stats = computed(() => ({
  crossServer: anomalyStore.anomalies.filter(r => r.type === 'cross_server_refund').length,
  rateMismatch: anomalyStore.anomalies.filter(r => r.type === 'rate_version_mismatch').length,
  duplicateDeduction: anomalyStore.anomalies.filter(r => r.type === 'duplicate_deduction').length,
}));

const filtered = computed(() => {
  let list = anomalyStore.anomalies;
  if (filterType.value) {
    list = list.filter(r => r.type === filterType.value);
  }
  if (filterStatus.value) {
    list = list.filter(r => r.status === filterStatus.value);
  }
  if (filterKeyword.value) {
    const kw = filterKeyword.value.toLowerCase();
    list = list.filter(r => 
      r.orderNo?.toLowerCase().includes(kw) || 
      r.collectionNo?.toLowerCase().includes(kw) ||
      r.anomalyNo.toLowerCase().includes(kw)
    );
  }
  return list;
});

function anomalyTypeLabel(t: AnomalyType): string {
  const map: Record<AnomalyType, string> = {
    cross_server_refund: '跨服退款',
    rate_version_mismatch: '费率版本错配',
    duplicate_deduction: '抵扣重复',
  };
  return map[t] || t;
}

function typeClass(t: AnomalyType): string {
  switch (t) {
    case 'cross_server_refund': return 'badge-danger';
    case 'rate_version_mismatch': return 'badge-warning';
    case 'duplicate_deduction': return 'badge-info';
    default: return 'badge-secondary';
  }
}

function statusLabel(s: AnomalyStatus): string {
  const map: Record<AnomalyStatus, string> = {
    open: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    ignored: '已忽略',
  };
  return map[s] || s;
}

function statusClass(s: AnomalyStatus): string {
  switch (s) {
    case 'open': return 'badge-danger';
    case 'in_progress': return 'badge-warning';
    case 'resolved': return 'badge-success';
    case 'ignored': return 'badge-secondary';
    default: return 'badge-secondary';
  }
}

function riskLevelLabel(l?: RiskLevel): string {
  if (!l) return '-';
  const map: Record<RiskLevel, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };
  return map[l] || l;
}

function evidenceLabel(key: string): string {
  const map: Record<string, string> = {
    orderServerId: '订单服务器',
    refundServerId: '退款服务器',
    expectedRateVersion: '预期费率版本',
    actualRateVersion: '实际费率版本',
    duplicateCount: '重复次数',
    deductionIds: '抵扣记录ID',
  };
  return map[key] || key;
}

function channelLabel(c: Channel | string): string {
  const map: Record<string, string> = {
    apple: 'App Store',
    google: 'Google Play',
    taptap: 'TapTap',
  };
  return map[c] || c;
}

function formatTime(_row: any, _col: any, cellValue: string) {
  return formatDateTime(cellValue);
}

async function runDetection() {
  detecting.value = true;
  try {
    const period = new Date().toISOString().slice(0, 7);
    const result = await anomalyStore.runDetection(
      period,
      collectionStore.collections,
      revenueStore.results,
      datasourceStore.refundRecords
    );
    if (result.success) {
      ElMessage.success(`检测完成：发现 ${result.count} 条异常`);
    }
  } catch (e: any) {
    ElMessage.error('检测失败：' + e.message);
  } finally {
    detecting.value = false;
  }
}

async function analyzeImpact(row: any) {
  try {
    const result = await anomalyStore.analyzeImpact(row.id);
    if (result.success) {
      ElMessage.success('影响分析完成');
    }
  } catch (e: any) {
    ElMessage.error('分析失败：' + e.message);
  }
}

function showImpact(row: any) {
  currentAnomaly.value = row;
  if (!row.impactAnalysis) {
    analyzeImpact(row);
  }
  showImpactDialog.value = true;
}

function handleResolve(row: any) {
  currentAnomaly.value = row;
  resolveForm.status = 'resolved';
  resolveForm.note = '';
  showResolveDialog.value = true;
}

async function submitResolve() {
  if (!currentAnomaly.value || !resolveForm.note) {
    ElMessage.warning('请填写处理说明');
    return;
  }
  try {
    await anomalyStore.updateStatus(
      currentAnomaly.value.id,
      resolveForm.status,
      resolveForm.note
    );
    ElMessage.success('状态已更新');
    showResolveDialog.value = false;
  } catch (e: any) {
    ElMessage.error('更新失败：' + e.message);
  }
}

function goToTrace(row: any) {
  router.push({ path: '/audit/trace', query: { anomalyId: row.id } });
}

onMounted(async () => {
  await datasourceStore.loadAll();
  await collectionStore.loadAll();
  await revenueStore.loadAll();
  await anomalyStore.loadAll();
});
</script>
