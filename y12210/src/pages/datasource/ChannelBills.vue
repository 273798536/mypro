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
            导入渠道账单
          </button>
          <el-select v-model="filterGame" placeholder="游戏" clearable size="default" style="width: 150px;">
            <el-option v-for="g in gameOptions" :key="g.value" :label="g.label" :value="g.value" />
          </el-select>
          <el-select v-model="filterChannel" placeholder="渠道" clearable size="default" style="width: 140px;">
            <el-option label="App Store" value="apple" />
            <el-option label="Google Play" value="google" />
            <el-option label="TapTap" value="taptap" />
          </el-select>
          <el-input v-model="filterKeyword" placeholder="搜索订单号/渠道订单号" clearable style="width: 240px;" />
        </div>
        <div class="text-sm text-gray-500">
          共 <span class="font-semibold text-primary-600">{{ filtered.length }}</span> 条，
          金额 <span class="font-semibold text-success-600">{{ formatCurrency(totalAmount) }}</span>
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
                <div><span class="text-gray-500">货币：</span>{{ row.currency }}</div>
                <div><span class="text-gray-500">渠道订单号：</span>{{ row.channelOrderNo }}</div>
                <div><span class="text-gray-500">渠道手续费：</span>{{ formatCurrency(row.channelFee) }}</div>
                <div><span class="text-gray-500">版本状态：</span>
                  <span :class="row.versionStatus === 'active' ? 'badge-success' : 'badge-secondary'">
                    {{ row.versionStatus === 'active' ? '当前' : '历史' }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="gameName" label="游戏" width="120" />
        <el-table-column label="渠道" width="110">
          <template #default="{ row }">
            <span class="badge-info">{{ channelLabel(row.channel) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="110" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="channelFee" label="渠道手续费" width="110" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.channelFee) }}
          </template>
        </el-table-column>
        <el-table-column prop="transactionTime" label="交易时间" width="160" :formatter="formatTime" />
        <el-table-column label="版本" width="80" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="showVersionHistory(row.orderNo)">
              <History class="w-4 h-4" />
            </el-button>
          </template>
        </el-table-column>
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

    <el-dialog v-model="showVersionDialog" title="版本历史" width="700px">
      <el-timeline v-if="versionHistory.length > 0">
        <el-timeline-item
          v-for="item in versionHistory"
          :key="item.id"
          :timestamp="formatDateTime(item.uploadTime)"
          placement="top"
          :type="item.versionStatus === 'active' ? 'primary' : 'default'"
        >
          <div class="p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium">版本 {{ item.version }}</span>
              <span :class="item.versionStatus === 'active' ? 'badge-success' : 'badge-secondary'">
                {{ item.versionStatus === 'active' ? '当前版本' : '历史版本' }}
              </span>
            </div>
            <div class="text-sm space-y-1">
              <div>金额：{{ formatCurrency(item.amount) }}</div>
              <div>来源：{{ item.source }}</div>
              <div>上传人：{{ item.uploadBy }}</div>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <div v-else class="text-center py-8 text-gray-500">
        暂无版本历史
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, Trash2, History } from 'lucide-vue-next';
import { useDatasourceStore } from '@/stores/datasource';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { parseExcelFile } from '@/utils/export';
import type { ChannelBill, Channel } from '@/types';

const datasourceStore = useDatasourceStore();

const fileInput = ref<HTMLInputElement>();
const filterGame = ref('');
const filterChannel = ref('');
const filterKeyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const showVersionDialog = ref(false);
const versionHistory = ref<ChannelBill[]>([]);

const gameOptions = computed(() => {
  const map = new Map<string, string>();
  datasourceStore.channelBills.forEach(b => {
    map.set(b.gameId, b.gameName);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const filtered = computed(() => {
  let list = datasourceStore.channelBills;
  if (filterGame.value) {
    list = list.filter(b => b.gameId === filterGame.value);
  }
  if (filterChannel.value) {
    list = list.filter(b => b.channel === filterChannel.value);
  }
  if (filterKeyword.value) {
    const kw = filterKeyword.value.toLowerCase();
    list = list.filter(b => 
      b.orderNo.toLowerCase().includes(kw) || 
      b.channelOrderNo.toLowerCase().includes(kw)
    );
  }
  return list;
});

const totalAmount = computed(() => filtered.value.reduce((sum, b) => sum + b.amount, 0));

function channelLabel(c: Channel): string {
  const map: Record<Channel, string> = {
    apple: 'App Store',
    google: 'Google Play',
    taptap: 'TapTap',
  };
  return map[c] || c;
}

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
    const data = await parseExcelFile<ChannelBill>(file);
    const result = await datasourceStore.uploadChannelBills(data, file.name);
    ElMessage.success(`导入成功：${result.count} 条记录，${result.newVersion ? '已创建新版本' : '更新了现有版本'}`);
  } catch (err: any) {
    ElMessage.error('导入失败：' + err.message);
  }
  input.value = '';
}

async function handleDelete(row: ChannelBill) {
  try {
    await ElMessageBox.confirm(
      `确定要删除订单 ${row.orderNo} 吗？`,
      '确认删除',
      { type: 'warning' }
    );
    await datasourceStore.deleteRecord('channel_bill', row.id, '手动删除');
    ElMessage.success('删除成功');
  } catch {
  }
}

async function showVersionHistory(orderNo: string) {
  versionHistory.value = await datasourceStore.getVersionHistory('channel_bill', orderNo);
  versionHistory.value.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
  showVersionDialog.value = true;
}

onMounted(() => datasourceStore.loadAll());
</script>
