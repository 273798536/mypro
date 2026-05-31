<template>
  <div class="p-6 space-y-6">
    <div class="grid grid-cols-4 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">分成总额</p>
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ formatCurrency(summary.totalGross) }}</p>
          </div>
          <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
            <DollarSign class="w-6 h-6 text-success-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">渠道分成</p>
            <p class="text-2xl font-bold text-info-600 mt-2">{{ formatCurrency(summary.channelShare) }}</p>
            <p class="text-xs text-gray-500 mt-1">费率 {{ (avgChannelRate * 100).toFixed(0) }}%</p>
          </div>
          <div class="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center">
            <Building2 class="w-6 h-6 text-info-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">平台分成</p>
            <p class="text-2xl font-bold text-warning-600 mt-2">{{ formatCurrency(summary.platformShare) }}</p>
            <p class="text-xs text-gray-500 mt-1">费率 {{ (avgPlatformRate * 100).toFixed(0) }}%</p>
          </div>
          <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
            <Server class="w-6 h-6 text-warning-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">开发商分成</p>
            <p class="text-2xl font-bold text-primary-600 mt-2">{{ formatCurrency(summary.developerShare) }}</p>
            <p class="text-xs text-gray-500 mt-1">费率 {{ (avgDeveloperRate * 100).toFixed(0) }}%</p>
          </div>
          <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Users class="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="card col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-800">费率版本管理</h3>
          <button class="btn-secondary flex items-center" @click="showRateDialog = true">
            <Plus class="w-4 h-4 mr-2" />
            添加费率版本
          </button>
        </div>
        <el-table :data="rateVersions" stripe border size="small" style="width: 100%">
          <el-table-column prop="version" label="版本" width="90" />
          <el-table-column prop="gameName" label="游戏" width="120" />
          <el-table-column label="渠道" width="110">
            <template #default="{ row }">
              <span class="badge-info">{{ channelLabel(row.channel) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="有效期" width="220">
            <template #default="{ row }">
              {{ row.effectiveStart }} ~ {{ row.effectiveEnd || '长期' }}
            </template>
          </el-table-column>
          <el-table-column label="渠道费率" width="90" align="center">
            <template #default="{ row }">
              {{ (row.channelRate * 100).toFixed(0) }}%
            </template>
          </el-table-column>
          <el-table-column label="平台费率" width="90" align="center">
            <template #default="{ row }">
              {{ (row.platformRate * 100).toFixed(0) }}%
            </template>
          </el-table-column>
          <el-table-column label="开发商费率" width="100" align="center">
            <template #default="{ row }">
              {{ (row.developerRate * 100).toFixed(0) }}%
            </template>
          </el-table-column>
          <el-table-column label="状态" width="70" align="center">
            <template #default="{ row }">
              <span :class="row.isActive ? 'badge-success' : 'badge-secondary'">
                {{ row.isActive ? '启用' : '停用' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="创建人" width="100">
            <template #default="{ row }">{{ row.createBy }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="card">
        <h3 class="font-semibold text-gray-800 mb-4">操作</h3>
        <div class="space-y-3">
          <button 
            class="w-full btn-primary flex items-center justify-center"
            @click="calculateRevenue"
            :disabled="calculating || collectionStore.records.length === 0"
          >
            <Calculator v-if="!calculating" class="w-4 h-4 mr-2" />
            <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
            {{ calculating ? '计算中...' : '执行分成计算' }}
          </button>
          <button 
            class="w-full btn-secondary flex items-center justify-center"
            @click="showAdjustDialog = true"
            :disabled="revenueStore.records.length === 0"
          >
            <Pencil class="w-4 h-4 mr-2" />
            手动调整
          </button>
          <button 
            class="w-full btn-secondary flex items-center justify-center"
            @click="showDeductionDialog = true"
            :disabled="revenueStore.records.length === 0"
          >
            <Minus class="w-4 h-4 mr-2" />
            抵扣
          </button>
          <button 
            class="w-full btn-secondary flex items-center justify-center"
            @click="showRollbackDialog = true"
            :disabled="revenueStore.records.length === 0"
          >
            <RotateCcw class="w-4 h-4 mr-2" />
            抵扣回滚
          </button>
        </div>

        <div class="mt-6 pt-6 border-t">
          <h4 class="text-sm font-medium text-gray-700 mb-3">计算说明</h4>
          <div class="space-y-2 text-xs text-gray-600">
            <p class="flex items-start">
              <span class="text-primary-500 mr-2">•</span>
              渠道分成 = 净额 × 渠道费率
            </p>
            <p class="flex items-start">
              <span class="text-primary-500 mr-2">•</span>
              平台分成 = 净额 × 平台费率
            </p>
            <p class="flex items-start">
              <span class="text-primary-500 mr-2">•</span>
              开发商分成 = 净额 × 开发商费率
            </p>
            <p class="flex items-start">
              <span class="text-primary-500 mr-2">•</span>
              净额 = 总金额 - 退款金额
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="font-semibold text-gray-800 mb-4">分成结果</h3>
      <el-table :data="revenueRecords" stripe border style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="p-4 bg-gray-50">
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-500">计算公式</span>
                    <span class="font-mono text-xs bg-white px-2 py-1 rounded">{{ row.calculationFormula }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">使用费率版本</span>
                    <span>{{ row.rateVersionId }} ({{ row.rateVersion }})</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">关联归集记录</span>
                    <span class="text-primary-600 cursor-pointer" @click="goToCollection(row.collectionId)">
                      {{ row.collectionNo }}
                    </span>
                  </div>
                  <div v-if="row.adjustments && row.adjustments.length > 0" class="pt-3 mt-3 border-t">
                    <p class="font-medium mb-2">调整记录</p>
                    <div v-for="adj in row.adjustments" :key="adj.id" class="bg-white p-3 rounded mb-2">
                      <div class="flex justify-between text-xs">
                        <span>{{ adj.reason }}</span>
                        <span :class="adj.amount > 0 ? 'text-success-600' : 'text-danger-600'">
                          {{ adj.amount > 0 ? '+' : '' }}{{ formatCurrency(adj.amount) }}
                        </span>
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        {{ adj.operator }} · {{ formatDateTime(adj.createTime) }}
                      </div>
                    </div>
                  </div>
                  <div v-if="row.deductions && row.deductions.length > 0" class="pt-3 mt-3 border-t">
                    <p class="font-medium mb-2">抵扣记录</p>
                    <div v-for="ded in row.deductions" :key="ded.id" class="bg-white p-3 rounded mb-2">
                      <div class="flex justify-between text-xs">
                        <span>{{ ded.reason }}</span>
                        <span class="text-danger-600">-{{ formatCurrency(ded.amount) }}</span>
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        {{ ded.operator }} · {{ formatDateTime(ded.createTime) }}
                        <span v-if="ded.rollback" class="ml-2 text-warning-600">
                          (已回滚：{{ ded.rollback.reason }})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-info-50 p-4 rounded-lg text-center">
                    <p class="text-xs text-gray-500">渠道分成</p>
                    <p class="text-lg font-bold text-info-600 mt-1">{{ formatCurrency(row.channelShare) }}</p>
                    <p class="text-xs text-gray-400">{{ (row.channelRate * 100).toFixed(0) }}%</p>
                  </div>
                  <div class="bg-warning-50 p-4 rounded-lg text-center">
                    <p class="text-xs text-gray-500">平台分成</p>
                    <p class="text-lg font-bold text-warning-600 mt-1">{{ formatCurrency(row.platformShare) }}</p>
                    <p class="text-xs text-gray-400">{{ (row.platformRate * 100).toFixed(0) }}%</p>
                  </div>
                  <div class="bg-primary-50 p-4 rounded-lg text-center">
                    <p class="text-xs text-gray-500">开发商分成</p>
                    <p class="text-lg font-bold text-primary-600 mt-1">{{ formatCurrency(row.developerShare) }}</p>
                    <p class="text-xs text-gray-400">{{ (row.developerRate * 100).toFixed(0) }}%</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
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
        <el-table-column label="费率版本" width="90" align="center">
          <template #default="{ row }">{{ row.rateVersion }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="goToTrace(row)">
              <GitBranch class="w-4 h-4" />
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="revenueRecords.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>

    <el-dialog v-model="showRateDialog" title="添加费率版本" width="500px">
      <el-form :model="rateForm" label-width="100px">
        <el-form-item label="版本号">
          <el-input v-model="rateForm.version" placeholder="如：v1.0" />
        </el-form-item>
        <el-form-item label="游戏">
          <el-select v-model="rateForm.gameId" style="width: 100%;">
            <el-option v-for="g in gameOptions" :key="g.value" :label="g.label" :value="g.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="rateForm.channel" style="width: 100%;">
            <el-option label="App Store" value="apple" />
            <el-option label="Google Play" value="google" />
            <el-option label="TapTap" value="taptap" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期起">
          <el-date-picker v-model="rateForm.effectiveStart" type="date" style="width: 100%;" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="有效期止">
          <el-date-picker v-model="rateForm.effectiveEnd" type="date" style="width: 100%;" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="渠道费率%">
          <el-input-number v-model="rateForm.channelRate" :min="0" :max="100" :step="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="平台费率%">
          <el-input-number v-model="rateForm.platformRate" :min="0" :max="100" :step="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="开发商费率%">
          <el-input-number v-model="rateForm.developerRate" :min="0" :max="100" :step="1" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <button class="btn-secondary" @click="showRateDialog = false">取消</button>
        <button class="btn-primary" @click="addRateVersion">确认添加</button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAdjustDialog" title="手动调整" width="400px">
      <el-form :model="adjustForm" label-width="80px">
        <el-form-item label="分成记录">
          <el-select v-model="adjustForm.revenueId" filterable placeholder="选择分成记录" style="width: 100%;">
            <el-option 
              v-for="r in revenueRecords" 
              :key="r.id" 
              :label="`${r.revenueNo} - ${formatCurrency(r.netAmount)}`" 
              :value="r.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调整金额">
          <el-input-number v-model="adjustForm.amount" :step="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="adjustForm.reason" type="textarea" :rows="3" placeholder="请说明调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <button class="btn-secondary" @click="showAdjustDialog = false">取消</button>
        <button class="btn-primary" @click="applyAdjustment">确认调整</button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDeductionDialog" title="添加抵扣" width="400px">
      <el-form :model="deductionForm" label-width="80px">
        <el-form-item label="分成记录">
          <el-select v-model="deductionForm.revenueId" filterable placeholder="选择分成记录" style="width: 100%;">
            <el-option 
              v-for="r in revenueRecords" 
              :key="r.id" 
              :label="`${r.revenueNo} - ${formatCurrency(r.netAmount)}`" 
              :value="r.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="抵扣金额">
          <el-input-number v-model="deductionForm.amount" :min="0" :step="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="抵扣原因">
          <el-input v-model="deductionForm.reason" type="textarea" :rows="3" placeholder="请说明抵扣原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <button class="btn-secondary" @click="showDeductionDialog = false">取消</button>
        <button class="btn-primary" @click="applyDeduction">确认抵扣</button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRollbackDialog" title="抵扣回滚" width="500px">
      <el-table v-if="pendingDeductions.length > 0" :data="pendingDeductions" stripe border size="small" style="width: 100%;">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="revenueNo" label="分成编号" width="180" />
        <el-table-column prop="deductionAmount" label="抵扣金额" width="110" align="right">
          <template #default="{ row }">{{ formatCurrency(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="抵扣原因" min-width="150" />
        <el-table-column prop="operator" label="操作人" width="100" />
      </el-table>
      <div v-else class="text-center py-8 text-gray-500">
        暂无待回滚的抵扣记录
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showRollbackDialog = false">取消</button>
        <button class="btn-primary" :disabled="selectedRollbackIds.length === 0" @click="rollbackDeduction">
          回滚选中
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { 
  DollarSign, Building2, Server, Users, Plus, Calculator, Loader2, 
  Pencil, Minus, RotateCcw, GitBranch 
} from 'lucide-vue-next';
import { useDatasourceStore } from '@/stores/datasource';
import { useCollectionStore } from '@/stores/collection';
import { useRevenueStore } from '@/stores/revenue';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { Channel, RateVersion } from '@/types';

const router = useRouter();
const datasourceStore = useDatasourceStore();
const collectionStore = useCollectionStore();
const revenueStore = useRevenueStore();

const page = ref(1);
const pageSize = ref(20);
const calculating = ref(false);
const showRateDialog = ref(false);
const showAdjustDialog = ref(false);
const showDeductionDialog = ref(false);
const showRollbackDialog = ref(false);
const selectedRollbackIds = ref<string[]>([]);

const rateForm = reactive({
  version: '',
  gameId: '',
  channel: '' as Channel | '',
  effectiveStart: '',
  effectiveEnd: '',
  channelRate: 30,
  platformRate: 30,
  developerRate: 40,
});

const adjustForm = reactive({
  revenueId: '',
  amount: 0,
  reason: '',
});

const deductionForm = reactive({
  revenueId: '',
  amount: 0,
  reason: '',
});

const gameOptions = computed(() => {
  const map = new Map<string, string>();
  datasourceStore.channelBills.forEach(b => {
    map.set(b.gameId, b.gameName);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const revenueRecords = computed(() => revenueStore.records);
const rateVersions = computed(() => revenueStore.rateVersions);

const summary = computed(() => {
  let totalGross = 0, channelShare = 0, platformShare = 0, developerShare = 0;
  let totalChannelRate = 0, totalPlatformRate = 0, totalDeveloperRate = 0, count = 0;
  
  revenueRecords.value.forEach(r => {
    totalGross += r.grossAmount;
    channelShare += r.channelShare;
    platformShare += r.platformShare;
    developerShare += r.developerShare;
    totalChannelRate += r.channelRate;
    totalPlatformRate += r.platformRate;
    totalDeveloperRate += r.developerRate;
    count++;
  });
  
  return { totalGross, channelShare, platformShare, developerShare };
});

const avgChannelRate = computed(() => {
  if (revenueRecords.value.length === 0) return 0;
  return revenueRecords.value.reduce((s, r) => s + r.channelRate, 0) / revenueRecords.value.length;
});

const avgPlatformRate = computed(() => {
  if (revenueRecords.value.length === 0) return 0;
  return revenueRecords.value.reduce((s, r) => s + r.platformRate, 0) / revenueRecords.value.length;
});

const avgDeveloperRate = computed(() => {
  if (revenueRecords.value.length === 0) return 0;
  return revenueRecords.value.reduce((s, r) => s + r.developerRate, 0) / revenueRecords.value.length;
});

const pendingDeductions = computed(() => {
  const list: any[] = [];
  revenueRecords.value.forEach(r => {
    r.deductions?.forEach(d => {
      if (!d.rollback) {
        list.push({ ...d, revenueNo: r.revenueNo, revenueId: r.id });
      }
    });
  });
  return list;
});

function channelLabel(c: Channel): string {
  const map: Record<Channel, string> = {
    apple: 'App Store',
    google: 'Google Play',
    taptap: 'TapTap',
  };
  return map[c] || c;
}

async function addRateVersion() {
  const gameName = gameOptions.value.find(g => g.value === rateForm.gameId)?.label || '';
  const version: RateVersion = {
    id: '',
    version: rateForm.version,
    channel: rateForm.channel as any,
    gameId: rateForm.gameId,
    gameName,
    effectiveStart: rateForm.effectiveStart,
    effectiveEnd: rateForm.effectiveEnd || undefined,
    channelRate: rateForm.channelRate / 100,
    platformRate: rateForm.platformRate / 100,
    developerRate: rateForm.developerRate / 100,
    isActive: true,
    createTime: new Date().toISOString(),
    createBy: '财务管理员',
  };
  await revenueStore.addRateVersion(version, '新增费率版本');
  ElMessage.success('费率版本添加成功');
  showRateDialog.value = false;
}

async function calculateRevenue() {
  calculating.value = true;
  try {
    const period = new Date().toISOString().slice(0, 7);
    const result = await revenueStore.calculateRevenue(
      period,
      collectionStore.records,
      '执行分成计算'
    );
    if (result.success) {
      ElMessage.success(`分成计算完成：${result.count} 条记录`);
    }
  } catch (e: any) {
    ElMessage.error('计算失败：' + e.message);
  } finally {
    calculating.value = false;
  }
}

async function applyAdjustment() {
  if (!adjustForm.revenueId || !adjustForm.reason) {
    ElMessage.warning('请完善信息');
    return;
  }
  try {
    await revenueStore.applyAdjustment(adjustForm.revenueId, adjustForm.amount, adjustForm.reason);
    ElMessage.success('调整已应用');
    showAdjustDialog.value = false;
    adjustForm.revenueId = '';
    adjustForm.amount = 0;
    adjustForm.reason = '';
  } catch (e: any) {
    ElMessage.error('调整失败：' + e.message);
  }
}

async function applyDeduction() {
  if (!deductionForm.revenueId || !deductionForm.reason || deductionForm.amount <= 0) {
    ElMessage.warning('请完善信息');
    return;
  }
  try {
    await revenueStore.applyDeduction(deductionForm.revenueId, deductionForm.amount, deductionForm.reason);
    ElMessage.success('抵扣已应用');
    showDeductionDialog.value = false;
    deductionForm.revenueId = '';
    deductionForm.amount = 0;
    deductionForm.reason = '';
  } catch (e: any) {
    ElMessage.error('抵扣失败：' + e.message);
  }
}

async function rollbackDeduction() {
  if (selectedRollbackIds.value.length === 0) {
    ElMessage.warning('请选择要回滚的记录');
    return;
  }
  try {
    for (const id of selectedRollbackIds.value) {
      await revenueStore.rollbackDeduction(id, '用户主动回滚');
    }
    ElMessage.success(`已回滚 ${selectedRollbackIds.value.length} 条抵扣记录`);
    showRollbackDialog.value = false;
    selectedRollbackIds.value = [];
  } catch (e: any) {
    ElMessage.error('回滚失败：' + e.message);
  }
}

function goToCollection(id: string) {
  router.push({ path: '/collection' });
}

function goToTrace(row: any) {
  router.push({ path: '/audit/trace', query: { revenueId: row.id } });
}

onMounted(async () => {
  await datasourceStore.loadAll();
  await collectionStore.loadAll();
  await revenueStore.loadAll();
});
</script>
