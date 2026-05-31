<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <div class="page-title">首页仪表盘</div>
        <div class="text-muted" style="margin-top: 4px;">
          数据统计时间：{{ currentTime }}
        </div>
      </div>
      <el-button type="primary" @click="initDemoData" v-if="store.contracts.length === 0">
        <el-icon><MagicStick /></el-icon>
        加载演示数据
      </el-button>
    </div>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon contract">
              <el-icon size="28"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ store.stats.contractCount }}</div>
              <div class="stat-label">影片合同</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon boxoffice">
              <el-icon size="28"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value amount-display">{{ formatAmount(store.stats.totalBoxOfficeAmount) }}</div>
              <div class="stat-label">累计票房（元）</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon settlement">
              <el-icon size="28"><Calculator /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ store.stats.settlementCount }}</div>
              <div class="stat-label">分账记录</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon payable">
              <el-icon size="28"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value amount-display text-success">{{ formatAmount(store.stats.totalPayable) }}</div>
              <div class="stat-label">已完成回款（元）</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <div class="card-section">
          <div class="section-title">待处理异常 <el-tag type="danger" size="small">{{ store.openExceptions.length }}</el-tag></div>
          <el-empty v-if="store.openExceptions.length === 0" description="暂无待处理异常" :image-size="80" />
          <div v-else>
            <div
              v-for="item in store.openExceptions.slice(0, 5)"
              :key="item.exception.id"
              class="exception-card open"
            >
              <div class="flex-between mb-10">
                <div class="exception-title">
                  <el-icon class="text-warning"><Warning /></el-icon>
                  <strong>{{ item.exception.title }}</strong>
                </div>
                <el-tag :type="getExceptionTypeTag(item.exception.type)" size="small">
                  {{ getExceptionTypeName(item.exception.type) }}
                </el-tag>
              </div>
              <div class="text-muted mb-10">
                【{{ item.settlement.filmName }}】{{ item.settlement.settlementPeriod }}
              </div>
              <div class="exception-info mb-10">
                <div><span class="label">触发人：</span>{{ item.exception.triggeredBy.name }}</div>
                <div><span class="label">触发时间：</span>{{ item.exception.triggeredAt }}</div>
              </div>
              <div class="exception-desc mb-10">{{ item.exception.description }}</div>
              <div class="exception-points">
                <div class="point-item danger">
                  <el-icon><Lock /></el-icon>
                  <span>卡点：{{ item.exception.blockingPoint }}</span>
                </div>
                <div class="point-item success">
                  <el-icon><Right /></el-icon>
                  <span>下一步：{{ item.exception.nextAction }}</span>
                </div>
                <div class="point-item info">
                  <el-icon><User /></el-icon>
                  <span>负责人：{{ item.exception.responsiblePerson }}</span>
                </div>
              </div>
              <div class="flex-between" style="margin-top: 12px;">
                <el-button size="small" type="primary" @click="goToSettlement(item.settlement.id)">
                  查看详情
                </el-button>
                <el-button size="small" @click="resolveException(item.exception.id, item.settlement.id)">
                  处理异常
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="card-section">
          <div class="section-title">最近操作日志</div>
          <el-table :data="recentLogs" size="small" style="width: 100%">
            <el-table-column prop="operateAt" label="时间" width="170">
              <template #default="{ row }">
                <span class="text-muted" style="font-size: 12px;">{{ row.operateAt }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-tag :type="getOperationTag(row.operationType)" size="small">
                  {{ getOperationName(row.operationType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="entityName" label="对象" min-width="150">
              <template #default="{ row }">
                <span style="font-size: 13px;">{{ row.entityName }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作人" width="100">
              <template #default="{ row }">
                <span class="text-muted" style="font-size: 12px;">{{ row.operator.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150">
              <template #default="{ row }">
                <span style="font-size: 12px;">{{ row.remark || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="变更" width="60" align="center">
              <template #default="{ row }">
                <el-button
                  v-if="row.changedFields && row.changedFields.length > 0"
                  type="primary"
                  link
                  size="small"
                  @click="showLogDetail(row)"
                >
                  查看
                </el-button>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="card-section">
          <div class="section-title">待复核分账 <el-tag type="warning" size="small">{{ store.pendingSettlements.length }}</el-tag></div>
          <el-table :data="store.pendingSettlements.slice(0, 6)" size="small" style="width: 100%">
            <el-table-column prop="filmName" label="影片" width="120" />
            <el-table-column prop="settlementPeriod" label="周期" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="getStatusTag(row.status)" size="small">
                  {{ getStatusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="实际应付款" width="140">
              <template #default="{ row }">
                <span class="amount-display" :class="row.actualPayable >= 0 ? 'text-success' : 'text-danger'">
                  {{ formatAmount(row.actualPayable) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="保底结果" width="90">
              <template #default="{ row }">
                <el-tag
                  :type="row.guaranteeComparison.guaranteeComparison === 'below' ? 'danger' : 'success'"
                  size="small"
                >
                  {{ row.guaranteeComparison.guaranteeComparison === 'below' ? '未达标' : '达标' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="goToSettlement(row.id)">
                  处理
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="logDetailVisible" title="变更详情" width="600px">
      <div v-if="currentLog" class="log-detail">
        <div class="mb-10">
          <strong>操作：</strong>{{ getOperationName(currentLog.operationType) }}
          <strong class="ml-10">操作人：</strong>{{ currentLog.operator.name }}
          <strong class="ml-10">时间：</strong>{{ currentLog.operateAt }}
        </div>
        <div v-if="currentLog.beforeChange && currentLog.afterChange">
          <div v-for="field in currentLog.changedFields" :key="field" class="log-field">
            <div class="field-name">{{ getFieldLabel(field) }}:</div>
            <div class="field-before">变更前: {{ formatValue(currentLog.beforeChange[field]) }}</div>
            <div class="field-after">变更后: {{ formatValue(currentLog.afterChange[field]) }}</div>
          </div>
        </div>
        <div v-else-if="currentLog.afterChange" class="text-success">
          <el-icon><Plus /></el-icon> 新建记录
        </div>
        <div v-else-if="currentLog.beforeChange" class="text-danger">
          <el-icon><Delete /></el-icon> 删除记录
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="resolveVisible" title="处理异常" width="500px">
      <el-form v-if="resolveData" label-width="100px">
        <el-form-item label="异常类型">
          <el-tag :type="getExceptionTypeTag(resolveData.exception.type)" size="small">
            {{ getExceptionTypeName(resolveData.exception.type) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="异常描述">
          <span>{{ resolveData.exception.description }}</span>
        </el-form-item>
        <el-form-item label="卡点">
          <span class="text-warning">{{ resolveData.exception.blockingPoint }}</span>
        </el-form-item>
        <el-form-item label="处理结果" required>
          <el-input
            v-model="resolveResolution"
            type="textarea"
            :rows="3"
            placeholder="请输入处理结果说明..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResolve">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { useBusinessStore } from '../stores/business'
import type { OperationLog, OperationType, ExceptionType } from '../types'

const router = useRouter()
const store = useBusinessStore()

const currentTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
const logDetailVisible = ref(false)
const currentLog = ref<OperationLog | null>(null)
const resolveVisible = ref(false)
const resolveData = ref<{ exceptionId: string; settlementId: string; exception: any } | null>(null)
const resolveResolution = ref('')

const recentLogs = computed(() => store.operationLogs.slice(0, 10))

function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 100000000) {
    return (amount / 100000000).toFixed(2) + '亿'
  } else if (Math.abs(amount) >= 10000) {
    return (amount / 10000).toFixed(2) + '万'
  }
  return amount.toLocaleString()
}

function getOperationTag(type: OperationType): string {
  const map: Record<OperationType, string> = {
    import: 'info',
    create: 'success',
    update: 'warning',
    delete: 'danger',
    calculate: 'primary',
    export: '',
    status_change: 'warning'
  }
  return map[type] || ''
}

function getOperationName(type: OperationType): string {
  const map: Record<OperationType, string> = {
    import: '导入',
    create: '新建',
    update: '更新',
    delete: '删除',
    calculate: '计算',
    export: '导出',
    status_change: '状态变更'
  }
  return map[type] || type
}

function getExceptionTypeTag(type: ExceptionType): string {
  const map: Record<ExceptionType, string> = {
    guarantee_shortfall: 'danger',
    promo_deduction: 'warning',
    cross_period_adjustment: 'info',
    settlement_failed: 'danger'
  }
  return map[type] || ''
}

function getExceptionTypeName(type: ExceptionType): string {
  const map: Record<ExceptionType, string> = {
    guarantee_shortfall: '保底未达',
    promo_deduction: '宣发追扣',
    cross_period_adjustment: '跨期退补',
    settlement_failed: '分账失败'
  }
  return map[type] || type
}

function getStatusTag(status: string): string {
  const map: Record<string, string> = {
    success: 'success',
    pending: 'warning',
    blocked: 'danger',
    failed: 'danger',
    calculating: 'info'
  }
  return map[status] || ''
}

function getStatusName(status: string): string {
  const map: Record<string, string> = {
    pending: '待复核',
    calculating: '计算中',
    success: '已完成',
    failed: '失败',
    blocked: '已阻断'
  }
  return map[status] || status
}

function getFieldLabel(field: string): string {
  const map: Record<string, string> = {
    filmName: '影片名称',
    guaranteeAmount: '保底金额',
    guaranteeBoxOffice: '保底票房',
    producerShareRate: '出品方分账比例',
    boxOfficeAmount: '票房金额',
    netBoxOffice: '净票房',
    amount: '费用金额',
    status: '状态',
    isDeducted: '是否已扣'
  }
  return map[field] || field
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'number') return val.toLocaleString()
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function showLogDetail(log: OperationLog) {
  currentLog.value = log
  logDetailVisible.value = true
}

function goToSettlement(id: string) {
  router.push(`/settlements?highlight=${id}`)
}

function resolveException(exceptionId: string, settlementId: string) {
  const settlement = store.settlements.find(s => s.id === settlementId)
  const exception = settlement?.exceptions.find(e => e.id === exceptionId)
  if (exception) {
    resolveData.value = { exceptionId, settlementId, exception }
    resolveResolution.value = ''
    resolveVisible.value = true
  }
}

function confirmResolve() {
  if (!resolveData.value || !resolveResolution.value.trim()) {
    ElMessage.warning('请输入处理结果说明')
    return
  }
  const result = store.resolveException(
    resolveData.value.exceptionId,
    resolveData.value.settlementId,
    resolveResolution.value
  )
  if (result) {
    ElMessage.success('异常已处理')
    resolveVisible.value = false
  }
}

function initDemoData() {
  const contract1 = store.createContract({
    filmName: '流浪星球3',
    contractNo: 'HT-2026-001',
    contractDate: '2026-01-15',
    distributor: '中影发行有限公司',
    producer: '北京文化科技股份有限公司',
    guaranteeAmount: 80000000,
    guaranteeBoxOffice: 300000000,
    producerShareRate: 43,
    distributorShareRate: 57,
    promoBudget: 20000000,
    settlementCycle: '月度',
    validFrom: '2026-02-01',
    validTo: '2026-12-31'
  })

  const contract2 = store.createContract({
    filmName: '封神榜2',
    contractNo: 'HT-2026-002',
    contractDate: '2026-01-20',
    distributor: '光线传媒股份有限公司',
    producer: '上海美术电影制片厂',
    guaranteeAmount: 50000000,
    guaranteeBoxOffice: 200000000,
    producerShareRate: 45,
    distributorShareRate: 55,
    promoBudget: 15000000,
    settlementCycle: '月度',
    validFrom: '22-01-01',
    validTo: '2026-12-31'
  })

  store.createBoxOffice({
    contractId: contract1.id,
    filmName: '流浪星球3',
    flowDate: '2026-05-01',
    cinemaName: '万达影城CBD店',
    boxOfficeAmount: 15800000,
    serviceFee: 474000,
    netBoxOffice: 15326000,
    settlementPeriod: '2026-05',
    status: 'confirmed'
  })

  store.createBoxOffice({
    contractId: contract1.id,
    filmName: '流浪星球3',
    flowDate: '2026-05-02',
    cinemaName: '金逸影城朝阳店',
    boxOfficeAmount: 12500000,
    serviceFee: 375000,
    netBoxOffice: 12125000,
    settlementPeriod: '2026-05',
    status: 'confirmed'
  })

  store.createBoxOffice({
    contractId: contract2.id,
    filmName: '封神榜2',
    flowDate: '2026-05-01',
    cinemaName: '万达影城CBD店',
    boxOfficeAmount: 8600000,
    serviceFee: 258000,
    netBoxOffice: 8342000,
    settlementPeriod: '2026-05',
    status: 'confirmed'
  })

  store.createExpense({
    contractId: contract1.id,
    filmName: '流浪星球3',
    expenseDate: '2026-04-20',
    expenseType: '宣发推广',
    expenseItem: '抖音信息流投放',
    amount: 3000000,
    bearer: 'producer',
    shareRate: 100,
    settlementPeriod: '2026-05',
    status: 'approved'
  })

  store.createExpense({
    contractId: contract1.id,
    filmName: '流浪星球3',
    expenseDate: '2026-04-25',
    expenseType: '线下活动',
    expenseItem: '首映礼场地布置',
    amount: 800000,
    bearer: 'shared',
    shareRate: 50,
    settlementPeriod: '2026-05',
    status: 'pending'
  })

  store.createExpense({
    contractId: contract2.id,
    filmName: '封神榜2',
    expenseDate: '2026-04-15',
    expenseType: '宣发推广',
    expenseItem: '微博热搜话题',
    amount: 1500000,
    bearer: 'shared',
    shareRate: 60,
    settlementPeriod: '2026-04',
    status: 'approved',
    isDeducted: false
  })

  store.calculateSettlement(contract1.id, '2026-05')
  store.calculateSettlement(contract2.id, '2026-05')

  ElMessage.success('演示数据已加载')
}

setInterval(() => {
  currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}, 1000)
</script>

<style scoped>
.stat-card {
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.contract {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.boxoffice {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.settlement {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.payable {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.exception-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}

.exception-info {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #909399;
}

.exception-info .label {
  color: #606266;
}

.exception-desc {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  font-size: 13px;
}

.exception-points {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.point-item.danger {
  color: #f56c6c;
}

.point-item.success {
  color: #67c23a;
}

.point-item.info {
  color: #909399;
}
</style>
