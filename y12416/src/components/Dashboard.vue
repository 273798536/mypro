<template>
  <div class="dashboard">
    <el-row :gutter="20" class="summary-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card recharge">
          <div class="stat-icon"><el-icon :size="32"><Wallet /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">账户余额</div>
            <div class="stat-value">{{ formatMoney(store.accountBalance) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card consumption">
          <div class="stat-icon"><el-icon :size="32"><CreditCard /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">充值总额</div>
            <div class="stat-value">{{ formatMoney(store.totalRechargeAmount) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card difference">
          <div class="stat-icon"><el-icon :size="32"><ShoppingCart /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">消费总额</div>
            <div class="stat-value">{{ formatMoney(store.totalConsumptionAmount) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card" :class="store.currentDifference === 0 ? 'balanced' : 'warning'">
          <div class="stat-icon"><el-icon :size="32"><Warning /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">对账差额</div>
            <div class="stat-value">{{ formatMoney(store.currentDifference) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header><span>资金流水结构</span></template>
          <div ref="pieChartRef" style="height: 350px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>对账平衡验证</span></template>
          <div ref="barChartRef" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="8">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>资金归集状态</span>
              <el-tag v-if="store.hasActiveCollection" type="danger">进行中</el-tag>
              <el-tag v-else type="info">未触发</el-tag>
            </div>
          </template>
          <div v-if="store.hasActiveCollection" class="collection-info">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="归集金额">{{ formatMoney(store.activeCollection.amount) }}</el-descriptions-item>
              <el-descriptions-item label="操作人">{{ store.activeCollection.operator }}</el-descriptions-item>
              <el-descriptions-item label="触发时间">{{ store.activeCollection.triggerTime }}</el-descriptions-item>
              <el-descriptions-item label="备注">{{ store.activeCollection.remark }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <el-empty v-else description="暂无进行中的资金归集" :image-size="60" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><span>对账公式</span></template>
          <div class="formula-box">
            <div class="formula-line">
              <span class="formula-label">账户余额</span>
              <span class="formula-value">{{ formatMoney(store.accountBalance) }}</span>
            </div>
            <div class="formula-line">
              <span class="formula-label">- 充值总额</span>
              <span class="formula-value">-{{ formatMoney(store.totalRechargeAmount) }}</span>
            </div>
            <div class="formula-line">
              <span class="formula-label">+ 消费总额</span>
              <span class="formula-value">+{{ formatMoney(store.totalConsumptionAmount) }}</span>
            </div>
            <div class="formula-line">
              <span class="formula-label">+ 退款总额</span>
              <span class="formula-value">+{{ formatMoney(store.totalRefundAmount) }}</span>
            </div>
            <el-divider />
            <div class="formula-line result">
              <span class="formula-label">对账差额</span>
              <span class="formula-value" :class="store.currentDifference === 0 ? 'zero' : 'nonzero'">
                {{ formatMoney(store.currentDifference) }}
              </span>
            </div>
            <div class="formula-hint">
              差额 = 账户余额 - (充值 - 消费 - 退款)
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><span>最近差额解释</span></template>
          <div v-if="store.differenceExplanations.length > 0">
            <div v-for="exp in store.differenceExplanations.slice(-3).reverse()" :key="exp.id" class="exp-item">
              <div class="exp-header">
                <el-tag size="small" :type="exp.hasCollection ? 'danger' : 'info'">
                  {{ exp.hasCollection ? '已关联归集' : '独立解释' }}
                </el-tag>
                <span class="exp-time">{{ exp.createTime }}</span>
              </div>
              <div class="exp-amount">差额: {{ formatMoney(exp.difference) }}</div>
              <div class="exp-text">{{ exp.explanation }}</div>
            </div>
          </div>
          <el-empty v-else description="暂无差额解释" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { Wallet, CreditCard, ShoppingCart, Warning } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useReconciliationStore } from '@/stores/reconciliation'

const store = useReconciliationStore()
const pieChartRef = ref(null)
const barChartRef = ref(null)
let pieChart = null
let barChart = null

function formatMoney(val) {
  if (val === undefined || val === null) return '¥0.00'
  return '¥' + Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function renderPieChart() {
  if (!pieChartRef.value) return
  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
  }
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n¥{c}' },
      data: [
        { value: store.totalRechargeAmount, name: '充值', itemStyle: { color: '#67C23A' } },
        { value: store.totalConsumptionAmount, name: '消费', itemStyle: { color: '#E6A23C' } },
        { value: store.totalRefundAmount, name: '退款', itemStyle: { color: '#F56C6C' } },
        { value: Math.max(0, store.accountBalance - store.totalConsumptionAmount - store.totalRefundAmount), name: '余额留存', itemStyle: { color: '#409EFF' } }
      ].filter(d => d.value > 0)
    }]
  })
}

function renderBarChart() {
  if (!barChartRef.value) return
  if (!barChart) {
    barChart = echarts.init(barChartRef.value)
  }
  const recharge = store.totalRechargeAmount
  const consumption = store.totalConsumptionAmount
  const refund = store.totalRefundAmount
  const theoretical = store.theoreticalBalance
  const actual = store.accountBalance
  const diff = store.currentDifference

  barChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0 },
    grid: { left: 80, right: 30, bottom: 40 },
    xAxis: { type: 'category', data: ['充值总额', '消费总额', '退款总额', '理论余额', '实际余额', '对账差额'] },
    yAxis: { type: 'value', axisLabel: { formatter: '¥{value}' } },
    series: [{
      type: 'bar',
      data: [
        { value: recharge, itemStyle: { color: '#67C23A' } },
        { value: -consumption, itemStyle: { color: '#E6A23C' } },
        { value: -refund, itemStyle: { color: '#F56C6C' } },
        { value: theoretical, itemStyle: { color: '#409EFF' } },
        { value: actual, itemStyle: { color: '#909399' } },
        { value: diff, itemStyle: { color: diff === 0 ? '#67C23A' : '#F56C6C' } }
      ],
      barWidth: '50%',
      label: { show: true, position: 'top', formatter: (p) => '¥' + p.value.toLocaleString() }
    }]
  })
}

function renderCharts() {
  nextTick(() => {
    renderPieChart()
    renderBarChart()
  })
}

watch([
  () => store.accountBalance,
  () => store.totalRechargeAmount,
  () => store.totalConsumptionAmount,
  () => store.totalRefundAmount,
  () => store.currentDifference
], renderCharts, { deep: true })

onMounted(() => {
  renderCharts()
  window.addEventListener('resize', () => {
    pieChart?.resize()
    barChart?.resize()
  })
})
</script>

<style scoped>
.summary-row { margin-bottom: 8px; }
.stat-card { display: flex; align-items: center; padding: 8px 0; }
.stat-card .stat-icon { flex: 0 0 56px; text-align: center; opacity: 0.8; }
.stat-card .stat-info { flex: 1; }
.stat-label { font-size: 13px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 700; }
.stat-card.recharge .stat-value { color: #67C23A; }
.stat-card.consumption .stat-value { color: #E6A23C; }
.stat-card.difference .stat-value { color: #409EFF; }
.stat-card.warning .stat-value { color: #F56C6C; }
.stat-card.balanced .stat-value { color: #67C23A; }
.collection-info { padding: 4px 0; }
.formula-box { padding: 12px; background: #fafbfc; border-radius: 6px; }
.formula-line { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; }
.formula-line.result { font-weight: 700; font-size: 16px; }
.formula-value.zero { color: #67C23A; }
.formula-value.nonzero { color: #F56C6C; }
.formula-hint { text-align: center; font-size: 12px; color: #c0c4cc; margin-top: 8px; }
.exp-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.exp-item:last-child { border-bottom: none; }
.exp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.exp-time { font-size: 12px; color: #909399; }
.exp-amount { font-size: 13px; font-weight: 600; color: #F56C6C; margin-bottom: 2px; }
.exp-text { font-size: 13px; color: #606266; line-height: 1.5; }
</style>
