<template>
  <div class="card-merge">
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>卡号合并</span>
          <el-button type="primary" :icon="Connection" @click="showMergeDialog = true">发起合并</el-button>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        合并后，被合并卡号的所有流水将归入目标卡号，合并记录永久保留，导出报表和历史查询均可追溯。
      </el-alert>

      <el-table :data="activeAccounts" border style="margin-bottom: 20px">
        <el-table-column prop="cardNo" label="卡号" width="200" />
        <el-table-column prop="cardHolder" label="持卡人" width="120" />
        <el-table-column prop="balance" label="余额" width="150">
          <template #default="{ row }">{{ formatMoney(row.balance) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isMerged ? 'info' : 'success'" size="small">
              {{ row.isMerged ? '已合并' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dataSourceVersion" label="来源版本" width="100">
          <template #default="{ row }">v{{ row.dataSourceVersion }}</template>
        </el-table-column>
        <el-table-column prop="importTime" label="导入时间" width="180" />
        <el-table-column label="合并信息" min-width="200">
          <template #default="{ row }">
            <template v-if="row.isMerged">
              <el-tag type="warning" size="small">已合并至 {{ row.mergedTo }}</el-tag>
              <el-button type="primary" link size="small" @click="viewMergeDetail(row.mergeId)" style="margin-left:8px">
                查看记录
              </el-button>
            </template>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.isMerged"
              type="primary"
              link
              size="small"
              @click="selectAsSource(row)"
            >
              选为源卡
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>合并历史 ({{ store.cardMergeHistory.length }} 条)</span>
          <el-button type="success" :icon="Download" @click="exportMergeHistory">导出合并记录</el-button>
        </div>
      </template>

      <el-table :data="store.cardMergeHistory" border>
        <el-table-column prop="id" label="合并ID" width="180" />
        <el-table-column prop="targetCardNo" label="目标卡号" width="160" />
        <el-table-column label="被合并卡号" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="no in row.sourceCardNos" :key="no" size="small" style="margin-right:4px">{{ no }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="合并原因" min-width="160" />
        <el-table-column prop="mergeTime" label="合并时间" width="180" />
        <el-table-column prop="version" label="数据版本" width="100">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewMergeDetail(row.id)">明细</el-button>
            <el-button type="success" link size="small" @click="exportSingleMerge(row)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showMergeDialog" title="发起卡号合并" width="600px" :close-on-click-modal="false">
      <el-form :model="mergeForm" label-width="100px">
        <el-form-item label="目标卡号">
          <el-select v-model="mergeForm.targetCardNo" placeholder="选择目标卡号" filterable style="width:100%">
            <el-option
              v-for="acc in activeAccounts.filter(a => !a.isMerged)"
              :key="acc.cardNo"
              :label="`${acc.cardNo} (${acc.cardHolder || ''}) 余额:${formatMoney(acc.balance)}`"
              :value="acc.cardNo"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="源卡号">
          <el-select v-model="mergeForm.sourceCardNos" multiple placeholder="选择要合并的卡号" filterable style="width:100%">
            <el-option
              v-for="acc in activeAccounts.filter(a => !a.isMerged && a.cardNo !== mergeForm.targetCardNo)"
              :key="acc.cardNo"
              :label="`${acc.cardNo} (${acc.cardHolder || ''}) 余额:${formatMoney(acc.balance)}`"
              :value="acc.cardNo"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="合并原因">
          <el-input v-model="mergeForm.reason" type="textarea" :rows="3" placeholder="请说明合并原因（如：同户名换卡、旧卡挂失补办等）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMergeDialog = false">取消</el-button>
        <el-button type="primary" @click="executeMerge" :disabled="!canMerge">确认合并</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="mergeDetailVisible" title="合并详情" width="700px">
      <template v-if="currentMergeDetail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="合并ID">{{ currentMergeDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="合并时间">{{ currentMergeDetail.mergeTime }}</el-descriptions-item>
          <el-descriptions-item label="目标卡号">{{ currentMergeDetail.targetCardNo }}</el-descriptions-item>
          <el-descriptions-item label="数据版本">v{{ currentMergeDetail.version }}</el-descriptions-item>
          <el-descriptions-item label="被合并卡号" :span="2">
            <el-tag v-for="no in currentMergeDetail.sourceCardNos" :key="no" size="small" style="margin-right:4px">{{ no }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="合并原因" :span="2">{{ currentMergeDetail.reason }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>受影响的流水记录</el-divider>

        <el-tabs>
          <el-tab-pane :label="`充值 (${affectedRecharges.length})`">
            <el-table :data="affectedRecharges" border size="small" max-height="200">
              <el-table-column prop="cardNo" label="原卡号" width="160" />
              <el-table-column prop="amount" label="金额" width="120">
                <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="date" label="日期" width="140" />
              <el-table-column prop="dataSourceVersion" label="来源版本" width="100">
                <template #default="{ row }">v{{ row.dataSourceVersion }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="`消费 (${affectedConsumptions.length})`">
            <el-table :data="affectedConsumptions" border size="small" max-height="200">
              <el-table-column prop="cardNo" label="原卡号" width="160" />
              <el-table-column prop="amount" label="金额" width="120">
                <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="date" label="日期" width="140" />
              <el-table-column prop="dataSourceVersion" label="来源版本" width="100">
                <template #default="{ row }">v{{ row.dataSourceVersion }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="`退款 (${affectedRefunds.length})`">
            <el-table :data="affectedRefunds" border size="small" max-height="200">
              <el-table-column prop="cardNo" label="原卡号" width="160" />
              <el-table-column prop="amount" label="金额" width="120">
                <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="date" label="日期" width="140" />
              <el-table-column prop="dataSourceVersion" label="来源版本" width="100">
                <template #default="{ row }">v{{ row.dataSourceVersion }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useReconciliationStore } from '@/stores/reconciliation'

const store = useReconciliationStore()

const showMergeDialog = ref(false)
const mergeDetailVisible = ref(false)
const currentMergeDetail = ref(null)
const mergeForm = ref({
  targetCardNo: '',
  sourceCardNos: [],
  reason: ''
})

const activeAccounts = computed(() => store.cardAccounts)

const canMerge = computed(() => {
  return mergeForm.value.targetCardNo &&
    mergeForm.value.sourceCardNos.length > 0 &&
    mergeForm.value.reason.trim()
})

const affectedRecharges = computed(() => {
  if (!currentMergeDetail.value) return []
  return store.rechargeRecords.filter(r => r.mergeId === currentMergeDetail.value.id)
})

const affectedConsumptions = computed(() => {
  if (!currentMergeDetail.value) return []
  return store.consumptionRecords.filter(r => r.mergeId === currentMergeDetail.value.id)
})

const affectedRefunds = computed(() => {
  if (!currentMergeDetail.value) return []
  return store.refundRecords.filter(r => r.mergeId === currentMergeDetail.value.id)
})

function formatMoney(val) {
  if (val === undefined || val === null) return '¥0.00'
  return '¥' + Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function selectAsSource(row) {
  if (!mergeForm.value.sourceCardNos.includes(row.cardNo)) {
    mergeForm.value.sourceCardNos.push(row.cardNo)
  }
  showMergeDialog.value = true
}

async function executeMerge() {
  try {
    await ElMessageBox.confirm(
      `将卡号 ${mergeForm.value.sourceCardNos.join('、')} 合并至 ${mergeForm.value.targetCardNo}，此操作不可撤销。`,
      '确认合并',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
    store.mergeCards(
      mergeForm.value.targetCardNo,
      mergeForm.value.sourceCardNos,
      mergeForm.value.reason
    )
    ElMessage.success('卡号合并成功，合并记录已保存')
    showMergeDialog.value = false
    mergeForm.value = { targetCardNo: '', sourceCardNos: [], reason: '' }
  } catch {
    // cancelled
  }
}

function viewMergeDetail(mergeId) {
  const record = store.cardMergeHistory.find(m => m.id === mergeId)
  if (record) {
    currentMergeDetail.value = record
    mergeDetailVisible.value = true
  }
}

function exportMergeHistory() {
  const data = store.cardMergeHistory.map(m => ({
    '合并ID': m.id,
    '目标卡号': m.targetCardNo,
    '被合并卡号': m.sourceCardNos.join(','),
    '合并原因': m.reason,
    '合并时间': m.mergeTime,
    '数据版本': `v${m.version}`
  }))
  downloadXlsx(data, '卡号合并历史')
}

function exportSingleMerge(row) {
  const headerData = [{
    '合并ID': row.id,
    '目标卡号': row.targetCardNo,
    '被合并卡号': row.sourceCardNos.join(','),
    '合并原因': row.reason,
    '合并时间': row.mergeTime,
    '数据版本': `v${row.version}`
  }]

  const recharges = store.rechargeRecords
    .filter(r => r.mergeId === row.id)
    .map(r => ({ '类型': '充值', '原卡号': r.cardNo, '金额': r.amount, '日期': r.date, '来源版本': `v${r.dataSourceVersion}` }))
  const consumptions = store.consumptionRecords
    .filter(r => r.mergeId === row.id)
    .map(r => ({ '类型': '消费', '原卡号': r.cardNo, '金额': r.amount, '日期': r.date, '来源版本': `v${r.dataSourceVersion}` }))
  const refunds = store.refundRecords
    .filter(r => r.mergeId === row.id)
    .map(r => ({ '类型': '退款', '原卡号': r.cardNo, '金额': r.amount, '日期': r.date, '来源版本': `v${r.dataSourceVersion}` }))

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(headerData)
  XLSX.utils.book_append_sheet(wb, ws1, '合并信息')
  const ws2 = XLSX.utils.json_to_sheet([...recharges, ...consumptions, ...refunds])
  XLSX.utils.book_append_sheet(wb, ws2, '受影响流水')
  XLSX.writeFile(wb, `合并记录_${row.targetCardNo}_${row.mergeTime.replace(/[: ]/g, '')}.xlsx`)
}

function downloadXlsx(data, sheetName) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
</script>

<style scoped>
</style>
