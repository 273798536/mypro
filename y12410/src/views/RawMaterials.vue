<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">原始材料</div>
    </div>

    <div class="card-section mb-20">
      <div class="section-title">材料列表</div>
      <el-table :data="store.rawMaterials" style="width: 100%">
        <el-table-column prop="fileName" label="文件名" min-width="180" />
        <el-table-column label="数据类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="sourceTag(row.sourceType)" size="small">{{ sourceLabel(row.sourceType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="文件大小" width="100" align="right">
          <template #default="{ row }">
            <span class="text-muted">{{ formatSize(row.fileSize) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="uploadTime" label="上传时间" width="170" />
        <el-table-column label="上传人" width="100">
          <template #default="{ row }">{{ row.uploader.name }}</template>
        </el-table-column>
        <el-table-column label="原始条数" width="90" align="center">
          <template #default="{ row }">{{ row.originalData.length }}</template>
        </el-table-column>
        <el-table-column label="已处理" width="80" align="center">
          <template #default="{ row }">
            <span :class="row.processedCount === row.originalData.length ? 'text-success' : 'text-warning'">
              {{ row.processedCount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewMaterial(row)">查看</el-button>
            <el-button type="info" link size="small" @click="viewDerived(row)">处理结果</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" :title="`原始材料 - ${currentMaterial?.fileName || ''}`" width="800px">
      <div v-if="currentMaterial">
        <el-descriptions :column="3" border size="small" class="mb-20">
          <el-descriptions-item label="数据类型">{{ sourceLabel(currentMaterial.sourceType) }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ currentMaterial.uploadTime }}</el-descriptions-item>
          <el-descriptions-item label="上传人">{{ currentMaterial.uploader.name }}</el-descriptions-item>
          <el-descriptions-item label="原始条数">{{ currentMaterial.originalData.length }}</el-descriptions-item>
          <el-descriptions-item label="已处理">{{ currentMaterial.processedCount }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ currentMaterial.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="currentMaterial.originalData" size="small" max-height="400">
          <el-table-column v-for="col in materialColumns" :key="col" :prop="col" :label="col" min-width="120" />
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="derivedVisible" title="处理结果" width="800px">
      <div v-if="currentMaterial">
        <el-tabs>
          <el-tab-pane :label="`合同 (${derivedData.contracts.length})`">
            <el-table v-if="derivedData.contracts.length > 0" :data="derivedData.contracts" size="small">
              <el-table-column prop="filmName" label="影片" min-width="120" />
              <el-table-column prop="contractNo" label="合同号" width="130" />
              <el-table-column label="保底金额" width="120" align="right">
                <template #default="{ row }">{{ row.guaranteeAmount.toLocaleString() }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="无合同数据" :image-size="60" />
          </el-tab-pane>
          <el-tab-pane :label="`票房 (${derivedData.boxOffices.length})`">
            <el-table v-if="derivedData.boxOffices.length > 0" :data="derivedData.boxOffices" size="small">
              <el-table-column prop="filmName" label="影片" width="120" />
              <el-table-column prop="flowDate" label="日期" width="100" />
              <el-table-column prop="cinemaName" label="影院" min-width="150" />
              <el-table-column label="票房" width="120" align="right">
                <template #default="{ row }">{{ row.boxOfficeAmount.toLocaleString() }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="无票房数据" :image-size="60" />
          </el-tab-pane>
          <el-tab-pane :label="`费用 (${derivedData.expenses.length})`">
            <el-table v-if="derivedData.expenses.length > 0" :data="derivedData.expenses" size="small">
              <el-table-column prop="filmName" label="影片" width="120" />
              <el-table-column prop="expenseItem" label="项目" min-width="140" />
              <el-table-column label="金额" width="120" align="right">
                <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="无费用数据" :image-size="60" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBusinessStore } from '../stores/business'
import type { RawMaterial, DataSource } from '../types'

const store = useBusinessStore()
const detailVisible = ref(false)
const derivedVisible = ref(false)
const currentMaterial = ref<RawMaterial | null>(null)

const materialColumns = computed(() => {
  if (!currentMaterial.value || currentMaterial.value.originalData.length === 0) return []
  return Object.keys(currentMaterial.value.originalData[0])
})

const derivedData = computed(() => {
  if (!currentMaterial.value) return { contracts: [], boxOffices: [], expenses: [] }
  return store.getDataByRawMaterial(currentMaterial.value.id)
})

function sourceTag(s: DataSource) { return { contract: '', boxoffice: 'warning', expense: 'info' }[s] || '' }
function sourceLabel(s: DataSource) { return { contract: '合同', boxoffice: '票房流水', expense: '宣发费用' }[s] || s }

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}

function viewMaterial(m: RawMaterial) { currentMaterial.value = m; detailVisible.value = true }
function viewDerived(m: RawMaterial) { currentMaterial.value = m; derivedVisible.value = true }
</script>
