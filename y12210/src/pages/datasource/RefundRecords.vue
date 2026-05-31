<template>
  <div class="p-6 space-y-6">
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-4">
          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept=".xlsx,.xls,.csv"
            @change="handleFileUpload"
          />
          <button class="btn-primary flex items-center" @click="triggerUpload">
            <Upload class="w-4 h-4 mr-2" />
            导入退款记录
          </button>
          <el-select v-model="filterReason" placeholder="退款原因" clearable size="default" style="width: 160px;">
            <el-option v-for="r in reasonOptions" :key="r" :label="r" :value="r" />
          </el-select>
          <el-input v-model="filterKeyword" placeholder="搜索退款单号/原订单号" clearable style="width: 240px;" />
        </div>
        <div class="text-sm text-gray-500">
          共 <span class="font-semibold text-primary-600">{{ filtered.length }}</span> 条，
          金额 <span class="font-semibold text-danger-600">{{ formatCurrency(totalAmount) }}</span>
        </div>
      </div>

      <el-table :data="filtered" stripe border style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="p-4 bg-gray-50 space-y-2">
              <div class="grid grid-cols-4 gap-4 text-sm">
                <div><span class="text-gray-500">数据来源：</span>{{ row.source }}</div>
                <div><span class="text-gray-500">版本号：</span>{{ row.version }}</div>
                <div><span class="text-gray-500">上传人：</span>{{ row.uploadBy }}</div>
                <div><span class="text-gray-500">上传时间：</span>{{ formatDateTime(row.uploadTime) }}</div>
              </div>
              <div class="grid grid-cols-4 gap-4 text-sm">
                <div><span class="text-gray-500">原订单号：</span>{{ row.originalOrderNo }}</div>
                <div><span class="text-gray-500">用户ID：</span>{{ row.userId }}</div>
                <div><span class="text-gray-500">货币：</span>{{ row.currency }}</div>
                <div><span class="text-gray-500">版本状态：</span>
                  <span :class="row.versionStatus === 'active' ? 'badge-success' : 'badge-secondary'">
                    {{ row.versionStatus === 'active' ? '当前' : '历史' }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="refundNo" label="退款单号" width="180" />
        <el-table-column prop="originalOrderNo" label="原订单号" width="200" />
        <el-table-column prop="gameName" label="游戏" width="120" />
        <el-table-column prop="serverName" label="服务器" width="120" />
        <el-table-column prop="userId" label="用户ID" width="120" />
        <el-table-column prop="amount" label="退款金额" width="110" align="right">
          <template #default="{ row }">
            <span class="text-danger-600">-{{ formatCurrency(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="refundReason" label="退款原因" min-width="130" />
        <el-table-column prop="refundTime" label="退款时间" width="160" :formatter="formatTime" />
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" link @click="handleDelete(row)">
              <Trash2 class="w-4 h-4" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, Trash2 } from 'lucide-vue-next';
import { useDatasourceStore } from '@/stores/datasource';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { parseExcelFile } from '@/utils/export';
import type { RefundRecord } from '@/types';

const datasourceStore = useDatasourceStore();

const fileInput = ref<HTMLInputElement>();
const filterReason = ref('');
const filterKeyword = ref('');
const page = ref(1);
const pageSize = ref(20);

const reasonOptions = computed(() => {
  const set = new Set(datasourceStore.refundRecords.map(r => r.refundReason));
  return Array.from(set);
});

const filtered = computed(() => {
  let list = datasourceStore.refundRecords;
  if (filterReason.value) {
    list = list.filter(b => b.refundReason === filterReason.value);
  }
  if (filterKeyword.value) {
    const kw = filterKeyword.value.toLowerCase();
    list = list.filter(b => 
      b.refundNo.toLowerCase().includes(kw) || 
      b.originalOrderNo.toLowerCase().includes(kw)
    );
  }
  return list;
});

const totalAmount = computed(() => filtered.value.reduce((sum, b) => sum + b.amount, 0));

function formatTime(_row: any, _col: any, cellValue: string) {
  return formatDateTime(cellValue);
}

function triggerUpload() {
  fileInput.value?.click();
}

async function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const data = await parseExcelFile<RefundRecord>(file);
    const result = await datasourceStore.uploadRefundRecords(data, file.name);
    ElMessage.success(`导入成功：${result.count} 条记录`);
  } catch (err: any) {
    ElMessage.error('导入失败：' + err.message);
  }
  input.value = '';
}

async function handleDelete(row: RefundRecord) {
  try {
    await ElMessageBox.confirm(
      `确定要删除退款 ${row.refundNo} 吗？`,
      '确认删除',
      { type: 'warning' }
    );
    await datasourceStore.deleteRecord('refund_record', row.id, '手动删除');
    ElMessage.success('删除成功');
  } catch {
  }
}

onMounted(() => datasourceStore.loadAll());
</script>
