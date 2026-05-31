<template>
  <div class="p-6 space-y-6">
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-gray-800">操作日志</h3>
        <div class="flex items-center space-x-3">
          <el-select v-model="filterModule" placeholder="模块" clearable size="default" style="width: 140px;">
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
          </el-select>
          <el-select v-model="filterOperation" placeholder="操作" clearable size="default" style="width: 120px;">
            <el-option label="上传" value="upload" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="计算" value="calculate" />
            <el-option label="检测" value="detect" />
            <el-option label="调整" value="adjust" />
            <el-option label="抵扣" value="deduct" />
            <el-option label="回滚" value="rollback" />
          </el-select>
          <el-input v-model="filterOperator" placeholder="操作人" clearable style="width: 140px;" />
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            size="default"
            style="width: 280px;"
          />
        </div>
      </div>

      <el-table :data="filtered" stripe border style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="p-4 bg-gray-50 space-y-3">
              <div class="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">模块：</span>
                  <span>{{ row.module }}</span>
                </div>
                <div>
                  <span class="text-gray-500">操作类型：</span>
                  <span>{{ operationLabel(row.operationType) }}</span>
                </div>
                <div>
                  <span class="text-gray-500">资源ID：</span>
                  <span class="font-mono">{{ row.resourceId }}</span>
                </div>
                <div>
                  <span class="text-gray-500">资源类型：</span>
                  <span>{{ row.resourceType }}</span>
                </div>
              </div>

              <div v-if="row.beforeChange" class="bg-white p-4 rounded-lg border">
                <p class="text-sm font-medium text-gray-700 mb-2">变更前</p>
                <pre class="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">{{ JSON.stringify(row.beforeChange, null, 2) }}</pre>
              </div>

              <div v-if="row.afterChange" class="bg-white p-4 rounded-lg border">
                <p class="text-sm font-medium text-gray-700 mb-2">变更后</p>
                <pre class="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">{{ JSON.stringify(row.afterChange, null, 2) }}</pre>
              </div>

              <div v-if="row.changeReason" class="bg-warning-50 p-4 rounded-lg border border-warning-200">
                <p class="text-sm font-medium text-warning-700 mb-1">变更原因</p>
                <p class="text-sm text-warning-600">{{ row.changeReason }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="operateTime" label="时间" width="160" :formatter="formatTime" />
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <span :class="getOperationClass(row.operationType)">{{ operationLabel(row.operationType) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="resourceType" label="资源类型" width="120" />
        <el-table-column prop="changeReason" label="变更原因" min-width="200" show-overflow-tooltip />
        <el-table-column label="对比" width="80" align="center" v-if="hasChanges">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              link 
              @click="compareVersions(row)"
              v-if="row.beforeChange && row.afterChange"
            >
              <GitCompare class="w-4 h-4" />
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-between items-center">
        <div class="text-sm text-gray-500">
          共 {{ filtered.length }} 条记录
        </div>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>

    <el-dialog v-model="showCompareDialog" title="版本对比" width="700px">
      <div v-if="compareData" class="space-y-4">
        <div class="grid grid-cols-2 gap-6">
          <div>
            <p class="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <ArrowLeft class="w-4 h-4 mr-1 text-gray-500" />
              变更前
            </p>
            <div class="bg-red-50 p-4 rounded-lg border border-red-200 max-h-96 overflow-auto">
              <pre class="text-xs">{{ JSON.stringify(compareData.before, null, 2) }}</pre>
            </div>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700 mb-2 flex items-center justify-end">
              变更后
              <ArrowRight class="w-4 h-4 ml-1 text-gray-500" />
            </p>
            <div class="bg-green-50 p-4 rounded-lg border border-green-200 max-h-96 overflow-auto">
              <pre class="text-xs">{{ JSON.stringify(compareData.after, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <div v-if="diffFields.length > 0" class="p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-medium text-gray-700 mb-2">变更字段</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="field in diffFields" :key="field" class="px-3 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
              {{ field }}
            </span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { GitCompare, ArrowLeft, ArrowRight } from 'lucide-vue-next';
import { useAuditStore } from '@/stores/audit';
import { formatDateTime } from '@/utils/format';
import type { AuditLog, OperationType } from '@/types';

const auditStore = useAuditStore();

const page = ref(1);
const pageSize = ref(20);
const filterModule = ref('');
const filterOperation = ref('');
const filterOperator = ref('');
const dateRange = ref<string[] | null>(null);
const showCompareDialog = ref(false);
const compareData = ref<{ before: any; after: any } | null>(null);
const diffFields = ref<string[]>([]);

const moduleOptions = computed(() => {
  const set = new Set(auditStore.logs.map(l => l.module));
  return Array.from(set);
});

const filtered = computed(() => {
  let list = auditStore.logs;
  if (filterModule.value) {
    list = list.filter(l => l.module === filterModule.value);
  }
  if (filterOperation.value) {
    list = list.filter(l => l.operationType === filterOperation.value);
  }
  if (filterOperator.value) {
    list = list.filter(l => l.operator.includes(filterOperator.value));
  }
  if (dateRange.value && dateRange.value.length === 2) {
    const start = new Date(dateRange.value[0]).getTime();
    const end = new Date(dateRange.value[1]).getTime() + 24 * 60 * 60 * 1000;
    list = list.filter(l => {
      const t = new Date(l.operateTime).getTime();
      return t >= start && t < end;
    });
  }
  return list;
});

const hasChanges = computed(() => {
  return auditStore.logs.some(l => l.beforeChange && l.afterChange);
});

function operationLabel(t: OperationType): string {
  const map: Record<OperationType, string> = {
    upload: '上传',
    update: '更新',
    delete: '删除',
    calculate: '计算',
    detect: '检测',
    adjust: '调整',
    deduct: '抵扣',
    rollback: '回滚',
  };
  return map[t] || t;
}

function getOperationClass(t: OperationType): string {
  switch (t) {
    case 'delete': return 'badge-danger';
    case 'upload': return 'badge-success';
    case 'calculate':
    case 'detect': return 'badge-info';
    case 'adjust':
    case 'deduct': return 'badge-warning';
    case 'rollback': return 'badge-secondary';
    default: return 'badge-secondary';
  }
}

function formatTime(_row: any, _col: any, cellValue: string) {
  return formatDateTime(cellValue);
}

function compareVersions(row: AuditLog) {
  if (!row.beforeChange || !row.afterChange) return;
  compareData.value = {
    before: row.beforeChange,
    after: row.afterChange,
  };
  const beforeKeys = Object.keys(row.beforeChange || {});
  const afterKeys = Object.keys(row.afterChange || {});
  const allKeys = new Set([...beforeKeys, ...afterKeys]);
  diffFields.value = Array.from(allKeys).filter(key => {
    const b = JSON.stringify((row.beforeChange as any)[key]);
    const a = JSON.stringify((row.afterChange as any)[key]);
    return b !== a;
  });
  showCompareDialog.value = true;
}

onMounted(async () => {
  try {
    await auditStore.loadLogs();
  } catch (e: any) {
    ElMessage.error('加载失败：' + e.message);
  }
});
</script>
