<template>
  <div class="fund-collection">
    <el-alert
      v-if="store.hasActiveCollection"
      title="资金归集进行中 - 所有页面、导出、报告将自动关联当前归集记录"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    />

    <el-row :gutter="20">
      <el-col :span="store.hasActiveCollection ? 10 : 24">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>资金归集操作</span>
              <el-tag :type="store.hasActiveCollection ? 'danger' : 'info'">
                {{ store.hasActiveCollection ? '归集进行中' : '未触发' }}
              </el-tag>
            </div>
          </template>

          <div v-if="!store.hasActiveCollection">
            <el-form :model="collectionForm" label-width="100px">
              <el-form-item label="归集金额">
                <el-input-number
                  v-model="collectionForm.amount"
                  :precision="2"
                  :min="0"
                  style="width: 100%"
                  placeholder="请输入归集金额"
                />
              </el-form-item>
              <el-form-item label="操作人">
                <el-input v-model="collectionForm.operator" placeholder="请输入操作人姓名" />
              </el-form-item>
              <el-form-item label="归集备注">
                <el-input v-model="collectionForm.remark" type="textarea" :rows="3" placeholder="请说明资金归集原因（如：监管账户划转、备付金调整等）" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="triggerCollection" :disabled="!canTrigger">
                  <el-icon :size="16" style="margin-right:4px"><Coin /></el-icon>
                  触发资金归集
                </el-button>
              </el-form-item>
            </el-form>

            <el-divider />

            <el-descriptions title="当前资金状态" :column="2" border size="small">
              <el-descriptions-item label="账户余额">{{ formatMoney(store.accountBalance) }}</el-descriptions-item>
              <el-descriptions-item label="充值总额">{{ formatMoney(store.totalRechargeAmount) }}</el-descriptions-item>
              <el-descriptions-item label="消费总额">{{ formatMoney(store.totalConsumptionAmount) }}</el-descriptions-item>
              <el-descriptions-item label="退款总额">{{ formatMoney(store.totalRefundAmount) }}</el-descriptions-item>
              <el-descriptions-item label="对账差额" :span="2">
                <span :style="{ color: store.currentDifference === 0 ? '#67C23A' : '#F56C6C', fontWeight: 700 }">
                  {{ formatMoney(store.currentDifference) }}
                </span>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div v-else>
            <el-result icon="warning" title="资金归集进行中">
              <template #sub-title>
                归集金额：{{ formatMoney(store.activeCollection.amount) }}，操作人：{{ store.activeCollection.operator }}
              </template>
              <template #extra>
                <el-button type="primary" @click="completeCollection">确认归集完成</el-button>
              </template>
            </el-result>

            <el-descriptions :column="1" border>
              <el-descriptions-item label="触发时间">{{ store.activeCollection.triggerTime }}</el-descriptions-item>
              <el-descriptions-item label="归集备注">{{ store.activeCollection.remark }}</el-descriptions-item>
              <el-descriptions-item label="归集前余额">{{ formatMoney(store.activeCollection.balanceBefore) }}</el-descriptions-item>
              <el-descriptions-item label="归集前充值">{{ formatMoney(store.activeCollection.rechargeBefore) }}</el-descriptions-item>
              <el-descriptions-item label="归集前消费">{{ formatMoney(store.activeCollection.consumptionBefore) }}</el-descriptions-item>
              <el-descriptions-item label="归集前退款">{{ formatMoney(store.activeCollection.refundBefore) }}</el-descriptions-item>
            </el-descriptions>

            <el-alert
              type="info"
              :closable="false"
              style="margin-top: 16px"
              title="归集期间的操作"
            >
              <ul>
                <li>• 所有差额解释自动关联此归集记录</li>
                <li>• 导出的报表将标注「归集进行中」</li>
                <li>• 监管报告将包含归集前后对比</li>
              </ul>
            </el-alert>
          </div>
        </el-card>
      </el-col>

      <el-col :span="store.hasActiveCollection ? 14 : 0" v-if="store.hasActiveCollection">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>归集期间差额解释 ({{ collectionExplanations.length }} 条)</span>
              <el-button type="success" :icon="Download" size="small" @click="exportCollectionData">
                导出归集数据
              </el-button>
            </div>
          </template>

          <div v-if="collectionExplanations.length > 0" class="exp-list">
            <div v-for="exp in collectionExplanations" :key="exp.id" class="exp-card">
              <div class="exp-card-header">
                <el-tag type="danger" size="small">关联归集</el-tag>
                <span class="exp-time">{{ exp.createTime }}</span>
              </div>
              <div class="exp-card-body">
                <div class="exp-amount-row">
                  <span class="exp-label">差额金额：</span>
                  <span class="exp-value danger">{{ formatMoney(exp.difference) }}</span>
                </div>
                <div class="exp-text-row">
                  <span class="exp-label">解释说明：</span>
                  <span class="exp-text">{{ exp.explanation }}</span>
                </div>
                <div class="exp-text-row">
                  <span class="exp-label">操作人：</span>
                  <span class="exp-text">{{ exp.operator }}</span>
                </div>
                <div v-if="exp.relatedRecords && exp.relatedRecords.length > 0" class="exp-records">
                  <span class="exp-label">关联记录：</span>
                  <el-tag v-for="(r, i) in exp.relatedRecords.slice(0, 3)" :key="i" size="small" style="margin-right:4px">
                    {{ r }}
                  </el-tag>
                  <el-tag v-if="exp.relatedRecords.length > 3" size="small">等 {{ exp.relatedRecords.length }} 条</el-tag>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="归集期间暂无差额解释" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header><span>归集历史记录</span></template>
      <el-table :data="store.fundCollectionRecords" border>
        <el-table-column prop="id" label="归集ID" width="180" />
        <el-table-column prop="amount" label="归集金额" width="150">
          <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'danger' : 'success'" size="small">
              {{ row.status === 'active' ? '进行中' : '已完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="triggerTime" label="触发时间" width="180" />
        <el-table-column prop="completeTime" label="完成时间" width="180">
          <template #default="{ row }">{{ row.completeTime || '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" />
        <el-table-column label="关联差额" width="100">
          <template #default="{ row }">
            {{ store.differenceExplanations.filter(e => e.collectionId === row.id).length }} 条
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewCollectionDetail(row)">查看</el-button>
            <el-button type="success" link size="small" @click="exportSingleCollection(row)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailVisible" title="归集详情" width="700px">
      <template v-if="currentCollection">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="归集ID">{{ currentCollection.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentCollection.status === 'active' ? 'danger' : 'success'">
              {{ currentCollection.status === 'active' ? '进行中' : '已完成' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="归集金额">{{ formatMoney(currentCollection.amount) }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ currentCollection.operator }}</el-descriptions-item>
          <el-descriptions-item label="触发时间">{{ currentCollection.triggerTime }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ currentCollection.completeTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="归集备注" :span="2">{{ currentCollection.remark }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>归集前后对比</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-descriptions :column="1" border size="small" title="归集前">
              <el-descriptions-item label="余额">{{ formatMoney(currentCollection.balanceBefore) }}</el-descriptions-item>
              <el-descriptions-item label="充值">{{ formatMoney(currentCollection.rechargeBefore) }}</el-descriptions-item>
              <el-descriptions-item label="消费">{{ formatMoney(currentCollection.consumptionBefore) }}</el-descriptions-item>
              <el-descriptions-item label="退款">{{ formatMoney(currentCollection.refundBefore) }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
          <el-col :span="12">
            <el-descriptions :column="1" border size="small" title="当前">
              <el-descriptions-item label="余额">{{ formatMoney(store.accountBalance) }}</el-descriptions-item>
              <el-descriptions-item label="充值">{{ formatMoney(store.totalRechargeAmount) }}</el-descriptions-item>
              <el-descriptions-item label="消费">{{ formatMoney(store.totalConsumptionAmount) }}</el-descriptions-item>
              <el-descriptions-item label="退款">{{ formatMoney(store.totalRefundAmount) }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>

        <el-divider>关联差额解释</el-divider>
        <div v-if="relatedExplanations.length > 0">
          <div v-for="exp in relatedExplanations" :key="exp.id" class="related-exp">
            <div class="related-exp-header">
              <span class="exp-amount">差额 {{ formatMoney(exp.difference) }}</span>
              <span class="exp-time">{{ exp.createTime }}</span>
            </div>
            <div class="related-exp-text">{{ exp.explanation }}</div>
          </div>
        </div>
        <el-empty v-else description="暂无关联的差额解释" :image-size="40" />
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Coin, Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useReconciliationStore } from '@/stores/reconciliation'

const store = useReconciliationStore()

const detailVisible = ref(false)
const currentCollection = ref(null)
const collectionForm = ref({
  amount: 0,
  operator: '',
  remark: ''
})

const canTrigger = computed(() => {
  return collectionForm.value.amount > 0 &&
    collectionForm.value.operator.trim() &&
    collectionForm.value.remark.trim()
})

const collectionExplanations = computed(() => {
  if (!store.activeCollection) return []
  return store.differenceExplanations.filter(e => e.collectionId === store.activeCollection.id)
})

const relatedExplanations = computed(() => {
  if (!currentCollection.value) return []
  return store.differenceExplanations.filter(e => e.collectionId === currentCollection.value.id)
})

function formatMoney(val) {
  if (val === undefined || val === null) return '¥0.00'
  return '¥' + Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function triggerCollection() {
  try {
    await ElMessageBox.confirm(
      `确认触发资金归集？归集金额 ${formatMoney(collectionForm.value.amount)}，操作人：${collectionForm.value.operator}`,
      '确认触发归集',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
    store.triggerFundCollection(
      collectionForm.value.amount,
      collectionForm.value.operator,
      collectionForm.value.remark
    )
    ElMessage.success('资金归集已触发，所有页面将自动关联此归集记录')
    collectionForm.value = { amount: 0, operator: '', remark: '' }
  } catch {
    // cancelled
  }
}

async function completeCollection() {
  try {
    await ElMessageBox.confirm(
      '确认归集已完成？完成后将不再关联新的差额解释。',
      '确认完成归集',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'success' }
    )
    store.completeFundCollection(store.activeCollection.id)
    ElMessage.success('资金归集已完成')
  } catch {
    // cancelled
  }
}

function viewCollectionDetail(row) {
  currentCollection.value = row
  detailVisible.value = true
}

function exportCollectionData() {
  const collection = store.activeCollection
  const explanations = collectionExplanations.value

  const wb = XLSX.utils.book_new()

  const collectionSheet = XLSX.utils.json_to_sheet([{
    '归集ID': collection.id,
    '归集金额': collection.amount,
    '操作人': collection.operator,
    '触发时间': collection.triggerTime,
    '备注': collection.remark,
    '归集前余额': collection.balanceBefore,
    '归集前充值': collection.rechargeBefore,
    '归集前消费': collection.consumptionBefore,
    '归集前退款': collection.refundBefore
  }])
  XLSX.utils.book_append_sheet(wb, collectionSheet, '归集信息')

  const expSheet = XLSX.utils.json_to_sheet(explanations.map(e => ({
    '差额金额': e.difference,
    '解释说明': e.explanation,
    '操作人': e.operator,
    '创建时间': e.createTime,
    '关联记录': (e.relatedRecords || []).join(',')
  })))
  XLSX.utils.book_append_sheet(wb, expSheet, '差额解释')

  XLSX.writeFile(wb, `资金归集数据_${collection.triggerTime.replace(/[: ]/g, '')}.xlsx`)
  ElMessage.success('归集数据导出成功')
}

function exportSingleCollection(row) {
  const explanations = store.differenceExplanations.filter(e => e.collectionId === row.id)

  const wb = XLSX.utils.book_new()
  const collectionSheet = XLSX.utils.json_to_sheet([{
    '归集ID': row.id,
    '归集金额': row.amount,
    '操作人': row.operator,
    '状态': row.status,
    '触发时间': row.triggerTime,
    '完成时间': row.completeTime || '',
    '备注': row.remark,
    '归集前余额': row.balanceBefore,
    '归集前充值': row.rechargeBefore,
    '归集前消费': row.consumptionBefore,
    '归集前退款': row.refundBefore
  }])
  XLSX.utils.book_append_sheet(wb, collectionSheet, '归集信息')

  const expSheet = XLSX.utils.json_to_sheet(explanations.map(e => ({
    '差额金额': e.difference,
    '解释说明': e.explanation,
    '操作人': e.operator,
    '创建时间': e.createTime
  })))
  XLSX.utils.book_append_sheet(wb, expSheet, '关联差额解释')

  XLSX.writeFile(wb, `归集记录_${row.id}_${row.triggerTime.replace(/[: ]/g, '')}.xlsx`)
  ElMessage.success('归集记录导出成功')
}
</script>

<style scoped>
.exp-list { max-height: 500px; overflow-y: auto; }
.exp-card { border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
.exp-card-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fef0f0; }
.exp-time { font-size: 12px; color: #909399; }
.exp-card-body { padding: 12px; }
.exp-amount-row, .exp-text-row { display: flex; margin-bottom: 6px; }
.exp-label { flex: 0 0 80px; color: #909399; font-size: 13px; }
.exp-value { font-size: 14px; }
.exp-value.danger { color: #F56C6C; font-weight: 700; }
.exp-text { font-size: 13px; color: #606266; }
.exp-records { display: flex; align-items: flex-start; margin-top: 6px; }
.related-exp { padding: 10px; background: #fafafa; border-radius: 4px; margin-bottom: 8px; }
.related-exp-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.related-exp-header .exp-amount { font-weight: 600; color: #F56C6C; }
.related-exp-header .exp-time { font-size: 12px; color: #909399; }
.related-exp-text { font-size: 13px; color: #606266; }
</style>
