<template>
  <div class="p-6 space-y-6">
    <div class="grid grid-cols-3 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">渠道账单</p>
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ stats.bills }}</p>
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
            <p class="text-2xl font-bold text-gray-800 mt-2">{{ stats.orders }}</p>
          </div>
          <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
            <ShoppingCart class="w-6 h-6 text-success-600" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">已归集</p>
            <p class="text-2xl font-bold text-primary-600 mt-2">{{ stats.collected }}</p>
            <p class="text-sm text-gray-500 mt-1">匹配率 {{ matchRate }}%</p>
          </div>
          <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Merge class="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-gray-800">归集规则配置</h3>
        <div class="flex items-center space-x-3">
          <el-select v-model="matchRule.orderNo" size="default" style="width: 140px;">
            <el-option label="订单号完全匹配" value="exact" />
            <el-option label="订单号模糊匹配" value="fuzzy" />
          </el-select>
          <el-select v-model="matchRule.amount" size="default" style="width: 140px;">
            <el-option label="金额完全一致" value="exact" />
            <el-option label="允许±1%误差" value="tolerance_1" />
            <el-option label="允许±5%误差" value="tolerance_5" />
          </el-select>
          <button 
            class="btn-primary flex items-center"
            @click="runCollection"
            :disabled="running"
          >
            <Play v-if="!running" class="w-4 h-4 mr-2" />
            <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
            {{ running ? '归集中...' : '执行归集' }}
          </button>
        </div>
      </div>

      <el-table :data="collections" stripe border style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="p-4 bg-gray-50 space-y-4">
              <div class="grid grid-cols-2 gap-6">
                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-medium mb-3 text-info-600 flex items-center">
                    <FileText class="w-4 h-4 mr-2" />
                    渠道账单
                  </h4>
                  <div v-if="row.channelBill" class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-500">订单号</span>
                      <span>{{ row.channelBill.orderNo }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">金额</span>
                      <span class="font-medium">{{ formatCurrency(row.channelBill.amount) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">交易时间</span>
                      <span>{{ formatDateTime(row.channelBill.transactionTime) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">渠道手续费</span>
                      <span>{{ formatCurrency(row.channelBill.channelFee) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">来源</span>
                      <span>{{ row.channelBill.source }}</span>
                    </div>
                  </div>
                  <div v-else class="text-center py-4 text-gray-400">
                    无匹配账单
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-medium mb-3 text-success-600 flex items-center">
                    <ShoppingCart class="w-4 h-4 mr-2" />
                    游戏订单
                  </h4>
                  <div v-if="row.gameOrder" class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-500">订单号</span>
                      <span>{{ row.gameOrder.orderNo }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">金额</span>
                      <span class="font-medium">{{ formatCurrency(row.gameOrder.amount) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">支付时间</span>
                      <span>{{ formatDateTime(row.gameOrder.payTime) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">用户/服务器</span>
                      <span>{{ row.gameOrder.userId }} / {{ row.gameOrder.serverName }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">商品</span>
                      <span>{{ row.gameOrder.itemName }}</span>
                    </div>
                  </div>
                  <div v-else class="text-center py-4 text-gray-400">
                    无匹配订单
                  </div>
                </div>
              </div>

              <div v-if="row.refunds && row.refunds.length > 0" class="bg-white p-4 rounded-lg border">
                <h4 class="font-medium mb-3 text-danger-600 flex items-center">
                  <RotateCcw class="w-4 h-4 mr-2" />
                  关联退款（{{ row.refunds.length }} 条）
                </h4>
                <el-table :data="row.refunds" size="small" style="width: 100%">
                  <el-table-column prop="refundNo" label="退款单号" width="180" />
                  <el-table-column prop="amount" label="退款金额" width="100" align="right">
                    <template #default="{ row }">
                      <span class="text-danger-600">-{{ formatCurrency(row.amount) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="refundReason" label="退款原因" />
                  <el-table-column prop="serverName" label="服务器" width="120" />
                </el-table>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="collectionNo" label="归集编号" width="180" />
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="gameName" label="游戏" width="120" />
        <el-table-column label="渠道" width="110">
          <template #default="{ row }">
            <span class="badge-info">{{ channelLabel(row.channel) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="grossAmount" label="总金额" width="100" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.grossAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="refundAmount" label="退款金额" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.refundAmount > 0" class="text-danger-600">-{{ formatCurrency(row.refundAmount) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="netAmount" label="净额" width="100" align="right">
          <template #default="{ row }">
            <span class="font-semibold">{{ formatCurrency(row.netAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="匹配度" width="90" align="center">
          <template #default="{ row }">
            <el-progress 
              :percentage="Math.round(row.matchScore * 100)" 
              :color="row.matchScore >= 0.9 ? '#10b981' : row.matchScore >= 0.7 ? '#f59e0b' : '#ef4444'"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <span :class="getStatusClass(row.status)">{{ statusLabel(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="goToTrace(row)">
              <GitBranch class="w-4 h-4" />
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-between items-center">
        <div class="text-sm text-gray-500">
          共 {{ collections.length }} 条归集记录
        </div>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="collections.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Play, Loader2, FileText, ShoppingCart, RotateCcw, Merge, GitBranch } from 'lucide-vue-next';
import { useDatasourceStore } from '@/stores/datasource';
import { useCollectionStore } from '@/stores/collection';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { Channel, CollectionStatus, MatchRule } from '@/types';

const router = useRouter();
const datasourceStore = useDatasourceStore();
const collectionStore = useCollectionStore();

const page = ref(1);
const pageSize = ref(20);
const running = ref(false);
const matchRule = ref<MatchRule>({
  orderNo: 'exact',
  amount: 'exact',
});

const stats = computed(() => ({
  bills: datasourceStore.channelBills.length,
  orders: datasourceStore.gameOrders.length,
  collected: collectionStore.records.length,
}));

const matchRate = computed(() => {
  if (stats.value.orders === 0) return 0;
  return ((stats.value.collected / stats.value.orders) * 100).toFixed(1);
});

const collections = computed(() => collectionStore.records);

function channelLabel(c: Channel): string {
  const map: Record<Channel, string> = {
    apple: 'App Store',
    google: 'Google Play',
    taptap: 'TapTap',
  };
  return map[c] || c;
}

function getStatusClass(s: CollectionStatus): string {
  switch (s) {
    case 'matched': return 'badge-success';
    case 'partial': return 'badge-warning';
    case 'unmatched': return 'badge-danger';
    case 'reconciled': return 'badge-info';
    default: return 'badge-secondary';
  }
}

function statusLabel(s: CollectionStatus): string {
  const map: Record<CollectionStatus, string> = {
    matched: '完全匹配',
    partial: '部分匹配',
    unmatched: '未匹配',
    reconciled: '已对账',
  };
  return map[s] || s;
}

async function runCollection() {
  running.value = true;
  try {
    collectionStore.setMatchRule(matchRule.value);
    const period = new Date().toISOString().slice(0, 7);
    const result = await collectionStore.runCollection(
      period,
      datasourceStore.channelBills,
      datasourceStore.gameOrders,
      datasourceStore.refundRecords
    );
    if (result.success) {
      ElMessage.success(`归集完成：${result.count} 条记录，匹配率 ${((result.count / stats.value.orders) * 100).toFixed(1)}%`);
    }
  } catch (e: any) {
    ElMessage.error('归集失败：' + e.message);
  } finally {
    running.value = false;
  }
}

function goToTrace(row: any) {
  router.push({ path: '/audit/trace', query: { collectionId: row.id } });
}

onMounted(async () => {
  await datasourceStore.loadAll();
  await collectionStore.loadAll();
});
</script>
