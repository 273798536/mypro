<template>
  <div class="flex h-screen bg-gray-100">
    <aside class="w-64 bg-primary-800 text-white flex flex-col flex-shrink-0">
      <div class="p-6 border-b border-primary-700">
        <h1 class="text-xl font-display font-bold flex items-center">
          <Calculator class="w-8 h-8 mr-3 text-primary-300" />
          游戏渠道分成对账
        </h1>
        <p class="text-xs text-primary-300 mt-1">数据不丢失 · 变更可追溯 · 异常可解释</p>
      </div>
      
      <nav class="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <div class="px-4 mb-2 text-xs font-semibold text-primary-400 uppercase tracking-wider">
          概览
        </div>
        <router-link
          to="/dashboard"
          class="sidebar-link"
          active-class="active"
        >
          <LayoutDashboard class="sidebar-icon" />
          数据看板
        </router-link>

        <div class="px-4 mt-6 mb-2 text-xs font-semibold text-primary-400 uppercase tracking-wider">
          数据源管理
        </div>
        <router-link
          to="/datasource/channel"
          class="sidebar-link"
          active-class="active"
        >
          <FileText class="sidebar-icon" />
          渠道账单
        </router-link>
        <router-link
          to="/datasource/orders"
          class="sidebar-link"
          active-class="active"
        >
          <ShoppingCart class="sidebar-icon" />
          游戏订单
        </router-link>
        <router-link
          to="/datasource/refunds"
          class="sidebar-link"
          active-class="active"
        >
          <RotateCcw class="sidebar-icon" />
          退款记录
        </router-link>

        <div class="px-4 mt-6 mb-2 text-xs font-semibold text-primary-400 uppercase tracking-wider">
          对账流程
        </div>
        <router-link
          to="/collection"
          class="sidebar-link"
          active-class="active"
        >
          <Merge class="sidebar-icon" />
          订单归集
        </router-link>
        <router-link
          to="/revenue"
          class="sidebar-link"
          active-class="active"
        >
          <Calculator class="sidebar-icon" />
          分成计算
        </router-link>
        <router-link
          to="/anomaly"
          class="sidebar-link relative"
          active-class="active"
        >
          <AlertTriangle class="sidebar-icon" />
          异常检测
          <span v-if="anomalyStore.openCount > 0" class="absolute right-4 bg-danger-500 text-white text-xs px-2 py-0.5 rounded-full">
            {{ anomalyStore.openCount }}
          </span>
        </router-link>

        <div class="px-4 mt-6 mb-2 text-xs font-semibold text-primary-400 uppercase tracking-wider">
          审计追踪
        </div>
        <router-link
          to="/audit/trace"
          class="sidebar-link"
          active-class="active"
        >
          <GitBranch class="sidebar-icon" />
          链路追溯
        </router-link>
        <router-link
          to="/audit/logs"
          class="sidebar-link"
          active-class="active"
        >
          <History class="sidebar-icon" />
          操作日志
        </router-link>

        <div class="px-4 mt-6 mb-2 text-xs font-semibold text-primary-400 uppercase tracking-wider">
          导出
        </div>
        <router-link
          to="/export"
          class="sidebar-link"
          active-class="active"
        >
          <Download class="sidebar-icon" />
          报表导出
        </router-link>
      </nav>

      <div class="p-4 border-t border-primary-700">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
            {{ authStore.userName.charAt(0) }}
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ authStore.userName }}</p>
            <p class="text-xs text-primary-300">{{ authStore.isAdmin ? '财务管理员' : '运营人员' }}</p>
          </div>
          <button class="p-2 text-primary-300 hover:text-white rounded" @click="showSettings = true">
            <Settings class="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center">
          <h2 class="text-lg font-semibold text-gray-800">{{ $route.meta.title }}</h2>
          <span v-if="currentPeriod" class="ml-4 px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full">
            账期：{{ currentPeriod }}
          </span>
        </div>
        <div class="flex items-center space-x-4">
          <el-select v-model="currentPeriod" placeholder="选择账期" size="default" @change="handlePeriodChange" style="width: 140px;">
            <el-option v-for="p in periodList" :key="p" :label="p" :value="p" />
          </el-select>
          <button 
            v-if="!isMockLoaded"
            class="btn-secondary flex items-center"
            @click="loadMockData"
          >
            <Database class="w-4 h-4 mr-2" />
            加载示例数据
          </button>
          <button 
            v-if="isMockLoaded"
            class="btn-primary flex items-center"
            @click="runFullReconciliation"
            :disabled="!currentPeriod || reconciliationRunning"
          >
            <Play v-if="!reconciliationRunning" class="w-4 h-4 mr-2" />
            <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
            {{ reconciliationRunning ? '对账中...' : '一键对账' }}
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-auto animate-fade-in">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <el-dialog v-model="showSettings" title="系统设置" width="500px">
      <div class="space-y-4">
        <div>
          <h4 class="font-medium mb-2">数据管理</h4>
          <div class="flex space-x-3">
            <button class="btn-secondary" @click="exportBackup">
              <Download class="w-4 h-4 mr-2 inline" />
              导出备份
            </button>
            <label class="btn-secondary cursor-pointer">
              <Upload class="w-4 h-4 mr-2 inline" />
              导入备份
              <input type="file" accept=".json" class="hidden" @change="importBackup" />
            </label>
            <button class="btn-danger" @click="clearData">
              <Trash2 class="w-4 h-4 mr-2 inline" />
              清空数据
            </button>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showReconciliationResult" title="对账完成" width="600px">
      <div v-if="reconciliationResult" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-info-50 p-4 rounded-lg text-center">
            <p class="text-2xl font-bold text-info-600">{{ reconciliationResult.collection?.count || 0 }}</p>
            <p class="text-sm text-gray-600">归集记录</p>
          </div>
          <div class="bg-success-50 p-4 rounded-lg text-center">
            <p class="text-2xl font-bold text-success-600">{{ reconciliationResult.revenue?.count || 0 }}</p>
            <p class="text-sm text-gray-600">分成结果</p>
          </div>
          <div class="bg-warning-50 p-4 rounded-lg text-center">
            <p class="text-2xl font-bold text-warning-600">{{ reconciliationResult.anomaly?.count || 0 }}</p>
            <p class="text-sm text-gray-600">检测异常</p>
          </div>
        </div>
        
        <div v-if="reconciliationResult.anomaly?.count > 0" class="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <div class="flex items-start">
            <AlertTriangle class="w-5 h-5 text-danger-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium text-danger-800">检测到异常，请前往异常检测页面处理</p>
              <p class="text-sm text-danger-600 mt-1">
                跨服退款: {{ reconciliationResult.anomaly.byType?.cross_server_refund || 0 }} | 
                费率错配: {{ reconciliationResult.anomaly.byType?.rate_version_mismatch || 0 }} | 
                抵扣重复: {{ reconciliationResult.anomaly.byType?.duplicate_deduction || 0 }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button class="btn-secondary" @click="showReconciliationResult = false">关闭</button>
          <button class="btn-primary" @click="goToAnomaly">查看异常</button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  LayoutDashboard, FileText, ShoppingCart, RotateCcw, Merge, 
  Calculator, AlertTriangle, GitBranch, History, Download,
  Settings, Database, Play, Loader2, Upload, Trash2
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useDatasourceStore } from '@/stores/datasource';
import { useAnomalyStore } from '@/stores/anomaly';
import { useAuditStore } from '@/stores/audit';
import { generateMockData, mockDataConfig } from '@/mock';

const authStore = useAuthStore();
const datasourceStore = useDatasourceStore();
const anomalyStore = useAnomalyStore();
const auditStore = useAuditStore();
const router = useRouter();

const showSettings = ref(false);
const isMockLoaded = ref(false);
const currentPeriod = ref('');
const periodList = ref<string[]>([]);
const reconciliationRunning = ref(false);
const showReconciliationResult = ref(false);
const reconciliationResult = ref<any>(null);

onMounted(async () => {
  await datasourceStore.loadAll();
  periodList.value = datasourceStore.periodList;
  if (periodList.value.length > 0) {
    currentPeriod.value = periodList.value[0];
    isMockLoaded.value = true;
  } else {
    currentPeriod.value = mockDataConfig.period;
  }
  await anomalyStore.loadAll();
});

async function loadMockData() {
  try {
    const result = await generateMockData();
    if (result.loaded) {
      ElMessage.success(`示例数据加载成功：${result.channelBills}条账单、${result.gameOrders}条订单、${result.refundRecords}条退款`);
      isMockLoaded.value = true;
      await datasourceStore.loadAll();
      periodList.value = datasourceStore.periodList;
      if (periodList.value.length > 0) {
        currentPeriod.value = periodList.value[0];
      }
    }
  } catch (e: any) {
    ElMessage.error('数据加载失败：' + e.message);
  }
}

async function handlePeriodChange(period: string) {
  await Promise.all([
    datasourceStore.loadAll(period),
    anomalyStore.loadAll(period),
  ]);
}

async function runFullReconciliation() {
  if (!currentPeriod.value) return;
  
  reconciliationRunning.value = true;
  try {
    const result = await anomalyStore.runFullReconciliation(currentPeriod.value);
    if (result.success) {
      reconciliationResult.value = result;
      showReconciliationResult.value = true;
    } else {
      ElMessage.error((result as any).error || '对账失败');
    }
  } catch (e: any) {
    ElMessage.error('对账失败：' + e.message);
  } finally {
    reconciliationRunning.value = false;
  }
}

function goToAnomaly() {
  showReconciliationResult.value = false;
  router.push('/anomaly');
}

async function exportBackup() {
  try {
    const data = await auditStore.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `对账数据备份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('备份导出成功');
  } catch (e: any) {
    ElMessage.error('导出失败：' + e.message);
  }
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const result = await auditStore.importAllData(text);
    if (result.success) {
      ElMessage.success(`导入成功，共${result.count}条数据`);
      await datasourceStore.loadAll();
      periodList.value = datasourceStore.periodList;
    } else {
      ElMessage.error('导入失败');
    }
  } catch (e: any) {
    ElMessage.error('导入失败：' + e.message);
  }
  input.value = '';
}

async function clearData() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有数据吗？此操作不可恢复！',
      '确认清空',
      { type: 'warning' }
    );
    await auditStore.clearDatabase();
    isMockLoaded.value = false;
    periodList.value = [];
    currentPeriod.value = mockDataConfig.period;
    ElMessage.success('数据已清空');
  } catch {
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
