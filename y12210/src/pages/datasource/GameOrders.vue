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
            导入游戏订单
          </button>
          <el-select v-model="filterGame" placeholder="游戏" clearable size="default" style="width: 150px;">
            <el-option v-for="g in gameOptions" :key="g.value" :label="g.label" :value="g.value" />
          </el-select>
          <el-select v-model="filterServer" placeholder="服务器" clearable size="default" style="width: 140px;">
            <el-option v-for="s in serverOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
          <el-input v-model="filterKeyword" placeholder="搜索订单号/用户ID" clearable style="width: 240px;" />
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
                <div><span class="text-gray-500">商品ID：</span>{{ row.itemId }}</div>
                <div><span class="text-gray-500">商品名称：</span>{{ row.itemName }}</div>
                <div><span class="text-gray-500">渠道订单号：</span>{{ row.channelOrderNo }}</div>
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
        <el-table-column prop="serverName" label="服务器" width="120" />
        <el-table-column prop="userId" label="用户ID" width="120" />
        <el-table-column prop="itemName" label="商品" min-width="150" />
        <el-table-column prop="amount" label="金额" width="100" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="payTime" label="支付时间" width="160" :formatter="formatTime" />
        <el-table-column label="渠道" width="100">
          <template #default="{ row }">
            <span class="badge-info">{{ channelLabel(row.channel) }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, Trash2 } from 'lucide-vue-next';
import { useDatasourceStore } from '@/stores/datasource';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { parseExcelFile } from '@/utils/export';
import type { GameOrder, Channel } from '@/types';

const datasourceStore = useDatasourceStore();

const fileInput = ref<HTMLInputElement>();
const filterGame = ref('');
const filterServer = ref('');
const filterKeyword = ref('');
const page = ref(1);
const pageSize = ref(20);

const gameOptions = computed(() => {
  const map = new Map<string, string>();
  datasourceStore.gameOrders.forEach(b => {
    map.set(b.gameId, b.gameName);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const serverOptions = computed(() => {
  const map = new Map<string, string>();
  datasourceStore.gameOrders.forEach(b => {
    map.set(b.serverId, b.serverName);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const filtered = computed(() => {
  let list = datasourceStore.gameOrders;
  if (filterGame.value) {
    list = list.filter(b => b.gameId === filterGame.value);
  }
  if (filterServer.value) {
    list = list.filter(b => b.serverId === filterServer.value);
  }
  if (filterKeyword.value) {
    const kw = filterKeyword.value.toLowerCase();
    list = list.filter(b => 
      b.orderNo.toLowerCase().includes(kw) || 
      b.userId.toLowerCase().includes(kw)
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
    const data = await parseExcelFile<GameOrder>(file);
    const result = await datasourceStore.uploadGameOrders(data, file.name);
    ElMessage.success(`导入成功：${result.count} 条记录`);
  } catch (err: any) {
    ElMessage.error('导入失败：' + err.message);
  }
  input.value = '';
}

async function handleDelete(row: GameOrder) {
  try {
    await ElMessageBox.confirm(
      `确定要删除订单 ${row.orderNo} 吗？`,
      '确认删除',
      { type: 'warning' }
    );
    await datasourceStore.deleteRecord('game_order', row.id, '手动删除');
    ElMessage.success('删除成功');
  } catch {
  }
}

onMounted(() => datasourceStore.loadAll());
</script>
