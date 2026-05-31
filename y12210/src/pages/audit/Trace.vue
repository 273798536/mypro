<template>
  <div class="p-6 space-y-6">
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-gray-800">链路追溯</h3>
        <div class="flex items-center space-x-3">
          <el-select v-model="traceType" placeholder="追溯类型" size="default" style="width: 140px;">
            <el-option label="分成结果" value="revenue" />
            <el-option label="归集记录" value="collection" />
            <el-option label="异常记录" value="anomaly" />
          </el-select>
          <el-select 
            v-model="traceId" 
            placeholder="选择记录" 
            filterable 
            size="default" 
            style="width: 300px;"
            @change="loadTrace"
          >
            <el-option 
              v-for="item in selectOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </div>
      </div>

      <div v-if="traceChain" class="space-y-6">
        <div class="flex items-center justify-center p-6 bg-primary-50 rounded-xl border border-primary-200">
          <div class="text-center">
            <p class="text-sm text-gray-500">{{ rootLabel }}</p>
            <p class="text-xl font-bold text-primary-700 mt-1">{{ rootNo }}</p>
            <p class="text-sm text-gray-600 mt-2">{{ rootDesc }}</p>
          </div>
        </div>

        <div class="flex justify-center">
          <div class="w-0.5 h-8 bg-gray-300"></div>
        </div>

        <div v-for="(level, levelIdx) in traceChain.levels" :key="levelIdx" class="space-y-4">
          <div class="flex items-center justify-center">
            <div class="px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
              {{ level.name }}
            </div>
          </div>

          <div class="grid" :class="level.items.length <= 1 ? 'grid-cols-1 max-w-2xl mx-auto' : level.items.length === 2 ? 'grid-cols-2 gap-6 max-w-4xl mx-auto' : 'grid-cols-3 gap-6 max-w-6xl mx-auto'">
            <div 
              v-for="item in level.items" 
              :key="item.id"
              class="card cursor-pointer hover:border-primary-400 transition-colors"
              @click="showItemDetail(item)"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center">
                  <component 
                    :is="getTypeIcon(item.type)" 
                    :class="getTypeColor(item.type)" 
                    class="w-5 h-5 mr-2" 
                  />
                  <span class="text-sm font-medium">{{ item.type }}</span>
                </div>
                <span class="text-xs text-gray-400">{{ item.date }}</span>
              </div>
              <p class="text-sm font-semibold text-gray-800">{{ item.no }}</p>
              <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ item.description }}</p>
              <div class="flex items-center justify-between mt-3 pt-3 border-t">
                <span class="text-xs text-gray-400">{{ item.operator }}</span>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div v-if="levelIdx < traceChain.levels.length - 1" class="flex justify-center">
            <div class="w-0.5 h-8 bg-gray-300"></div>
          </div>
        </div>

        <div class="flex items-center justify-center">
          <div class="w-0.5 h-8 bg-gray-300"></div>
        </div>

        <div v-for="source in traceChain.sources" :key="source.id" class="card max-w-2xl mx-auto border-l-4 border-l-info-500">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center">
              <Database class="w-5 h-5 text-info-600 mr-2" />
              <span class="text-sm font-medium text-gray-800">{{ source.sourceName }}</span>
            </div>
            <span class="text-xs text-gray-400">v{{ source.version }}</span>
          </div>
          <p class="text-sm font-mono text-primary-600">{{ source.recordNo }}</p>
          <div class="grid grid-cols-3 gap-3 mt-3 text-xs">
            <div>
              <span class="text-gray-500">金额：</span>
              <span class="font-medium">{{ formatCurrency(source.amount || 0) }}</span>
            </div>
            <div>
              <span class="text-gray-500">来源：</span>
              <span>{{ source.source }}</span>
            </div>
            <div>
              <span class="text-gray-500">上传：</span>
              <span>{{ source.uploadBy }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-16 text-gray-500">
        <GitBranch class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p class="text-lg">请选择要追溯的记录</p>
        <p class="text-sm mt-2">支持追溯分成结果、归集记录、异常记录的完整链路</p>
      </div>
    </div>

    <el-dialog v-model="showDetailDialog" title="详情" width="600px">
      <div v-if="currentItem" class="space-y-4">
        <div class="p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center mb-2">
            <component 
              :is="getTypeIcon(currentItem.type)" 
              :class="getTypeColor(currentItem.type)" 
              class="w-5 h-5 mr-2" 
            />
            <span class="font-semibold">{{ currentItem.type }} - {{ currentItem.no }}</span>
          </div>
          <p class="text-sm text-gray-600">{{ currentItem.description }}</p>
        </div>

        <div v-if="currentItem.detail" class="space-y-3">
          <div v-for="(value, key) in currentItem.detail" :key="key" class="flex justify-between text-sm">
            <span class="text-gray-500">{{ detailLabel(String(key)) }}</span>
            <span>{{ formatDetailValue(String(key), value) }}</span>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button class="btn-secondary" @click="showDetailDialog = false">关闭</button>
          <button class="btn-primary" @click="goToModule(currentItem)">
            前往 {{ currentItem.type }} 页面
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { 
  FileText, ShoppingCart, RotateCcw, Merge, Calculator, AlertTriangle, 
  Database, ChevronRight, GitBranch 
} from 'lucide-vue-next';
import { useAuditStore } from '@/stores/audit';
import { useRevenueStore } from '@/stores/revenue';
import { useCollectionStore } from '@/stores/collection';
import { useAnomalyStore } from '@/stores/anomaly';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { TraceChain, TraceNode } from '@/types';

const route = useRoute();
const router = useRouter();
const auditStore = useAuditStore();
const revenueStore = useRevenueStore();
const collectionStore = useCollectionStore();
const anomalyStore = useAnomalyStore();

const traceType = ref<'revenue' | 'collection' | 'anomaly'>('revenue');
const traceId = ref('');
const traceChain = ref<TraceChain | null>(null);
const showDetailDialog = ref(false);
const currentItem = ref<TraceNode | null>(null);

const rootLabel = computed(() => {
  const map = { revenue: '分成结果', collection: '归集记录', anomaly: '异常记录' };
  return map[traceType.value] || '';
});

const rootNo = computed(() => traceChain.value?.rootNo || '');
const rootDesc = computed(() => traceChain.value?.rootDesc || '');

const selectOptions = computed(() => {
  if (traceType.value === 'revenue') {
    return revenueStore.records.map(r => ({
      value: r.id,
      label: `${r.revenueNo} - ${r.gameName} - ${formatCurrency(r.netAmount)}`,
    }));
  } else if (traceType.value === 'collection') {
    return collectionStore.records.map(r => ({
      value: r.id,
      label: `${r.collectionNo} - ${r.orderNo} - ${formatCurrency(r.netAmount)}`,
    }));
  } else {
    return anomalyStore.records.map(r => ({
      value: r.id,
      label: `${r.anomalyNo} - ${r.orderNo || r.collectionNo} - ${r.description.slice(0, 30)}`,
    }));
  }
});

function getTypeIcon(type: string) {
  const map: Record<string, any> = {
    '分成计算': Calculator,
    '订单归集': Merge,
    '异常检测': AlertTriangle,
    '抵扣操作': RotateCcw,
    '调整操作': Calculator,
    '渠道账单': FileText,
    '游戏订单': ShoppingCart,
    '退款记录': RotateCcw,
  };
  return map[type] || FileText;
}

function getTypeColor(type: string) {
  const map: Record<string, string> = {
    '分成计算': 'text-primary-600',
    '订单归集': 'text-success-600',
    '异常检测': 'text-danger-600',
    '抵扣操作': 'text-warning-600',
    '调整操作': 'text-info-600',
    '渠道账单': 'text-info-600',
    '游戏订单': 'text-success-600',
    '退款记录': 'text-danger-600',
  };
  return map[type] || 'text-gray-600';
}

function detailLabel(key: string): string {
  const map: Record<string, string> = {
    grossAmount: '总金额',
    netAmount: '净额',
    channelShare: '渠道分成',
    platformShare: '平台分成',
    developerShare: '开发商分成',
    matchScore: '匹配度',
    gameName: '游戏',
    serverName: '服务器',
    itemName: '商品',
    channelFee: '渠道手续费',
    transactionTime: '交易时间',
    reason: '原因',
    operator: '操作人',
    createTime: '操作时间',
  };
  return map[key] || key;
}

function formatDetailValue(key: string, value: any): string {
  if (['grossAmount', 'netAmount', 'channelShare', 'platformShare', 'developerShare', 'amount', 'channelFee'].includes(key)) {
    return formatCurrency(Number(value));
  }
  if (['matchScore'].includes(key)) {
    return (Number(value) * 100).toFixed(0) + '%';
  }
  if (['transactionTime', 'payTime', 'refundTime', 'createTime'].includes(key)) {
    return formatDateTime(String(value));
  }
  return String(value);
}

async function loadTrace() {
  if (!traceId.value) {
    traceChain.value = null;
    return;
  }
  try {
    const result = await auditStore.traceResult(traceId.value, traceType.value);
    if (result.success) {
      traceChain.value = result.traceChain;
    }
  } catch (e: any) {
    ElMessage.error('追溯失败：' + e.message);
  }
}

function showItemDetail(item: TraceNode) {
  currentItem.value = item;
  showDetailDialog.value = true;
}

function goToModule(item: TraceNode) {
  showDetailDialog.value = false;
  const map: Record<string, string> = {
    '分成计算': '/revenue',
    '订单归集': '/collection',
    '异常检测': '/anomaly',
    '渠道账单': '/datasource/channel',
    '游戏订单': '/datasource/orders',
    '退款记录': '/datasource/refunds',
  };
  const path = map[item.type];
  if (path) {
    router.push(path);
  }
}

onMounted(async () => {
  await Promise.all([
    revenueStore.loadAll(),
    collectionStore.loadAll(),
    anomalyStore.loadAll(),
  ]);

  if (route.query.revenueId) {
    traceType.value = 'revenue';
    traceId.value = String(route.query.revenueId);
    loadTrace();
  } else if (route.query.collectionId) {
    traceType.value = 'collection';
    traceId.value = String(route.query.collectionId);
    loadTrace();
  } else if (route.query.anomalyId) {
    traceType.value = 'anomaly';
    traceId.value = String(route.query.anomalyId);
    loadTrace();
  }
});

watch(traceType, () => {
  traceId.value = '';
  traceChain.value = null;
});
</script>
