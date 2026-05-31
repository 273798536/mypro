<template>
  <div class="difference-explanation">
    <el-alert
      v-if="store.hasActiveCollection"
      title="当前有进行中的资金归集，新增的差额解释将自动关联此归集"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    />

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header><span>当前对账差额</span></template>
          <div class="current-diff-box">
            <div class="diff-amount" :class="store.currentDifference === 0 ? 'balanced' : 'warning'">
              {{ formatMoney(store.currentDifference) }}
            </div>
            <div class="diff-hint">
              {{ store.currentDifference === 0 ? '对账平衡，无需解释' : '存在差额，请添加解释说明' }}
            </div>
            <el-descriptions :column="1" border size="small" style="margin-top: 16px">
              <el-descriptions-item label="账户余额">{{ formatMoney(store.accountBalance) }}</el-descriptions-item>
              <el-descriptions-item label="理论余额">{{ formatMoney(store.theoreticalBalance) }}</el-descriptions-item>
              <el-descriptions-item label="充值总额">{{ formatMoney(store.totalRechargeAmount) }}</el-descriptions-item>
              <el-descriptions-item label="消费总额">{{ formatMoney(store.totalConsumptionAmount) }}</el-descriptions-item>
              <el-descriptions-item label="退款总额">{{ formatMoney(store.totalRefundAmount) }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card>
          <template #header><span>添加差额解释</span></template>
          <el-form :model="explanationForm" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="差额金额">
                  <el-input-number
                    v-model="explanationForm.difference"
                    :precision="2"
                    style="width: 100%"
                    :placeholder="'当前差额: ' + formatMoney(store.currentDifference)"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="操作人">
                  <el-input v-model="explanationForm.operator" placeholder="请输入操作人姓名" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="解释说明">
              <el-input
                v-model="explanationForm.explanation"
                type="textarea"
                :rows="4"
                placeholder="请详细说明差额产生的原因，包括时间、涉及交易、处理方式等"
              />
            </el-form-item>
            <el-form-item label="关联记录">
              <el-select
                v-model="explanationForm.relatedRecords"
                multiple
                filterable
                style="width: 100%"
                placeholder="选择相关的流水记录（可选）"
              >
                <el-option-group label="充值记录">
                  <el-option
                    v-for="r in recentRecharges"
                    :key="r.id"
                    :label="`${r.cardNo} - ${formatMoney(r.amount)} - ${r.date || ''}`"
                    :value="r.id"
                  />
                </el-option-group>
                <el-option-group label="消费记录">
                  <el-option
                    v-for="r in recentConsumptions"
                    :key="r.id"
                    :label="`${r.cardNo} - ${formatMoney(r.amount)} - ${r.date || ''}`"
                    :value="r.id"
                  />
                </el-option-group>
                <el-option-group label="退款记录">
                  <el-option
                    v-for="r in recentRefunds"
                    :key="r.id"
                    :label="`${r.cardNo} - ${formatMoney(r.amount)} - ${r.date || ''}`"
                    :value="r.id"
                  />
                </el-option-group>
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="addExplanation" :disabled="!canAdd">
                添加解释
              </el-button>
              <el-button @click="quickFillCurrent">快速填入当前差额</el-button>
              <el-button type="success" :icon="Download" @click="exportAllExplanations">导出全部</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>差额解释历史 ({{ store.differenceExplanations.length }} 条)</span>
          <div>
            <el-radio-group v-model="filterType" size="small">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="withCollection">关联归集</el-radio-button>
              <el-radio-button label="withoutCollection">独立解释</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table :data="filteredExplanations" border>
        <el-table-column prop="id" label="解释ID" width="180" />
        <el-table-column prop="difference" label="差额金额" width="150">
          <template #default="{ row }">
            <span style="color: #F56C6C; font-weight: 600">{{ formatMoney(row.difference) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="explanation" label="解释说明" min-width="250" show-overflow-tooltip />
        <el-table-column label="关联记录" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.relatedRecords && row.relatedRecords.length" size="small">
              {{ row.relatedRecords.length }} 条
            </el-tag>
            <span v-else style="color: #c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="归集关联" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.hasCollection" type="danger" size="small">已关联归集</el-tag>
            <el-tag v-else type="info" size="small">独立解释</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">查看详情</el-button>
            <el-button type="success" link size="small" @click="exportSingle(row)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailVisible" title="差额解释详情" width="650px">
      <template v-if="currentExplanation">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="解释ID" :span="2">{{ currentExplanation.id }}</el-descriptions-item>
          <el-descriptions-item label="差额金额">
            <span style="color: #F56C6C; font-weight: 600">{{ formatMoney(currentExplanation.difference) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="操作人">{{ currentExplanation.operator }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentExplanation.createTime }}</el-descriptions-item>
          <el-descriptions-item label="归集关联">
            <el-tag v-if="currentExplanation.hasCollection" type="danger" size="small">已关联归集</el-tag>
            <el-tag v-else type="info" size="small">独立解释</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="归集ID" v-if="currentExplanation.collectionId" :span="2">
            {{ currentExplanation.collectionId }}
          </el-descriptions-item>
          <el-descriptions-item label="解释说明" :span="2">{{ currentExplanation.explanation }}</el-descriptions-item>
        </el-descriptions>

        <el-divider v-if="currentExplanation.relatedRecords && currentExplanation.relatedRecords.length > 0">
          关联流水记录
        </el-divider>
        <div v-if="currentExplanation.relatedRecords && currentExplanation.relatedRecords.length > 0">
          <el-table :data="relatedRecordsDetail" border size="small" max-height="250">
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="getRecordTypeTag(row.type)" size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="cardNo" label="卡号" width="160" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="140" />
            <el-table-column prop="dataSourceVersion" label="来源版本" width="100">
              <template #default="{ row }">v{{ row.dataSourceVersion }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useReconciliationStore } from '@/stores/reconciliation'

const store = useReconciliationStore()

const detailVisible = ref(false)
const currentExplanation = ref(null)
const filterType = ref('all')
const explanationForm = ref({
  difference: 0,
  explanation: '',
  operator: '',
  relatedRecords: []
})

const canAdd = computed(() => {
  return Math.abs(explanationForm.value.difference) > 0 &&
    explanationForm.value.explanation.trim() &&
    explanationForm.value.operator.trim()
})

const recentRecharges = computed(() => store.rechargeRecords.slice(-50))
const recentConsumptions = computed(() => store.consumptionRecords.slice(-50))
const recentRefunds = computed(() => store.refundRecords.slice(-50))

const filteredExplanations = computed(() => {
  const all = store.differenceExplanations
  if (filterType.value === 'withCollection') return all.filter(e => e.hasCollection)
  if (filterType.value === 'withoutCollection') return all.filter(e => !e.hasCollection)
  return all
})

const relatedRecordsDetail = computed(() => {
  if (!currentExplanation.value?.relatedRecords) return []
  const ids = currentExplanation.value.relatedRecords
  const result = []

  store.rechargeRecords.forEach(r => {
    if (ids.includes(r.id)) result.push({ ...r, type: '充值' })
  })
  store.consumptionRecords.forEach(r => {
    if (ids.includes(r.id)) result.push({ ...r, type: '消费' })
  })
  store.refundRecords.forEach(r => {
    if (ids.includes(r.id)) result.push({ ...r, type: '退款' })
  })

  return result
})

function formatMoney(val) {
  if (val === undefined || val === null) return '¥0.00'
  return '¥' + Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getRecordTypeTag(type) {
  const map = { '充值': 'success', '消费': 'warning', '退款': 'danger' }
  return map[type] || 'info'
}

function quickFillCurrent() {
  explanationForm.value.difference = store.currentDifference
}

function addExplanation() {
  store.addDifferenceExplanation(
    explanationForm.value.difference,
    explanationForm.value.explanation,
    explanationForm.value.operator,
    explanationForm.value.relatedRecords
  )
  ElMessage.success('差额解释已添加' + (store.hasActiveCollection ? '，已关联当前资金归集' : ''))
  explanationForm.value = { difference: 0, explanation: '', operator: '', relatedRecords: [] }
}

function exportAllExplanations() {
  const data = store.differenceExplanations.map(e => ({
    '解释ID': e.id,
    '差额金额': e.difference,
    '解释说明': e.explanation,
    '操作人': e.operator,
    '关联记录数': (e.relatedRecords || []).length,
    '是否关联归集': e.hasCollection ? '是' : '否',
    '归集ID': e.collectionId || '',
    '创建时间': e.createTime
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), '差额解释')
  XLSX.writeFile(wb, `差额解释历史_${new Date().toISOString().slice(0, 10)}.xlsx`)
  ElMessage.success('导出成功')
}

function exportSingle(row) {
  const relatedRecs = []
  const ids = row.relatedRecords || []
  store.rechargeRecords.forEach(r => {
    if (ids.includes(r.id)) relatedRecs.push({ ...r, type: '充值' })
  })
  store.consumptionRecords.forEach(r => {
    if (ids.includes(r.id)) relatedRecs.push({ ...r, type: '消费' })
  })
  store.refundRecords.forEach(r => {
    if (ids.includes(r.id)) relatedRecs.push({ ...r, type: '退款' })
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
    '解释ID': row.id,
    '差额金额': row.difference,
    '解释说明': row.explanation,
    '操作人': row.operator,
    '是否关联归集': row.hasCollection ? '是' : '否',
    '归集ID': row.collectionId || '',
    '创建时间': row.createTime
  }]), '解释信息')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(relatedRecs.map(r => ({
    '类型': r.type,
    '卡号': r.cardNo,
    '金额': r.amount,
    '日期': r.date,
    '来源版本': `v${r.dataSourceVersion}`
  }))), '关联记录')
  XLSX.writeFile(wb, `差额解释_${row.id}_${row.createTime.replace(/[: ]/g, '')}.xlsx`)
}

function viewDetail(row) {
  currentExplanation.value = row
  detailVisible.value = true
}
</script>

<style scoped>
.current-diff-box { text-align: center; }
.diff-amount { font-size: 36px; font-weight: 700; }
.diff-amount.balanced { color: #67C23A; }
.diff-amount.warning { color: #F56C6C; }
.diff-hint { color: #909399; font-size: 14px; margin-top: 8px; }
</style>
