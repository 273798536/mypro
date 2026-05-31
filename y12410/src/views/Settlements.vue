<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">回款分账</div>
      <div>
        <el-button type="primary" @click="showCalcDialog">
          <el-icon><Calculator /></el-icon>发起分账计算
        </el-button>
      </div>
    </div>

    <div class="card-section" style="margin-bottom: 16px;">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filterFilm" placeholder="筛选影片" clearable style="width:100%">
            <el-option v-for="c in store.contracts" :key="c.id" :label="c.filmName" :value="c.id" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width:100%">
            <el-option label="待复核" value="pending" />
            <el-option label="已完成" value="success" />
            <el-option label="已阻断" value="blocked" />
            <el-option label="计算失败" value="failed" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div v-for="s in filteredSettlements" :key="s.id" class="card-section settlement-card" :class="settlementClass(s)">
      <div class="flex-between mb-10">
        <div>
          <span style="font-size: 18px; font-weight: 600;">{{ s.filmName }}</span>
          <el-tag :type="statusTag(s.status)" size="small" class="ml-10">{{ statusLabel(s.status) }}</el-tag>
          <span class="text-muted ml-10">{{ s.settlementPeriod }}</span>
        </div>
        <div>
          <el-button type="primary" size="small" @click="recalculate(s.id)">
            <el-icon><Refresh /></el-icon>重新计算
          </el-button>
          <el-button type="success" size="small" @click="exportLetter(s.id)" :disabled="s.status === 'failed'">
            <el-icon><Download /></el-icon>导出结算函
          </el-button>
        </div>
      </div>

      <el-row :gutter="16" class="mb-10">
        <el-col :span="6">
          <div class="stat-mini">
            <div class="stat-mini-label">总票房</div>
            <div class="stat-mini-value amount-display">{{ fmtAmt(s.totalBoxOffice) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-mini">
            <div class="stat-mini-label">净票房</div>
            <div class="stat-mini-value amount-display">{{ fmtAmt(s.totalNetBoxOffice) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-mini">
            <div class="stat-mini-label">出品方分账</div>
            <div class="stat-mini-value amount-display text-success">{{ fmtAmt(s.producerShare) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-mini">
            <div class="stat-mini-label">实际应付款</div>
            <div class="stat-mini-value amount-display" :class="s.actualPayable >= 0 ? 'text-success' : 'text-danger'">
              {{ fmtAmt(s.actualPayable) }}
            </div>
          </div>
        </el-col>
      </el-row>

      <div class="guarantee-compare" :class="{ below: s.guaranteeComparison.guaranteeComparison === 'below' }">
        <div class="flex-between mb-10">
          <strong>
            保底条款比较：
            <el-tag v-if="s.guaranteeComparison.guaranteeComparison === 'below'" type="danger" size="small">未达标</el-tag>
            <el-tag v-else type="success" size="small">达标</el-tag>
          </strong>
          <el-button type="primary" link size="small" @click="showBasis(s.guaranteeComparison)">查看依据</el-button>
        </div>
        <div class="text-muted" style="font-size: 13px;">
          实际分账 {{ fmtAmt(s.guaranteeComparison.calculatedShare) }}
          {{ s.guaranteeComparison.guaranteeComparison === 'below' ? '<' : '≥' }}
          保底金额 {{ fmtAmt(s.guaranteeComparison.guaranteeAmount) }}
          <span v-if="s.guaranteeComparison.guaranteeComparison === 'below'" class="text-danger">
            （差额 {{ fmtAmt(Math.abs(s.guaranteeComparison.difference)) }}）
          </span>
        </div>
      </div>

      <div v-if="s.totalPromoExpense > 0" class="promo-section mb-10">
        <strong>宣发费用追扣：</strong>
        总额 {{ fmtAmt(s.totalPromoExpense) }}，
        出品方承担 {{ fmtAmt(s.producerPromoShare) }}，
        发行方承担 {{ fmtAmt(s.distributorPromoShare) }}
      </div>

      <div v-if="s.failureReason" class="failure-reason mb-10">
        <el-icon class="text-danger"><CircleClose /></el-icon>
        <span class="text-danger"><strong>失败原因：</strong>{{ s.failureReason }}</span>
      </div>

      <div v-if="s.exceptions.filter(e => e.status !== 'resolved').length > 0">
        <div class="section-title" style="font-size: 14px;">待处理异常</div>
        <div v-for="exc in s.exceptions.filter(e => e.status !== 'resolved')" :key="exc.id" class="exception-card open">
          <div class="flex-between mb-10">
            <div>
              <el-tag :type="excTypeTag(exc.type)" size="small">{{ excTypeName(exc.type) }}</el-tag>
              <strong class="ml-10">{{ exc.title }}</strong>
            </div>
          </div>
          <div class="text-muted mb-10" style="font-size: 13px;">{{ exc.description }}</div>
          <div class="exception-points">
            <div class="point-item danger"><el-icon><Lock /></el-icon>卡点：{{ exc.blockingPoint }}</div>
            <div class="point-item success"><el-icon><Right /></el-icon>下一步：{{ exc.nextAction }}</div>
            <div class="point-item info"><el-icon><User /></el-icon>负责人：{{ exc.responsiblePerson }}</div>
            <div class="point-item text-muted"><el-icon><Clock /></el-icon>触发人：{{ exc.triggeredBy.name }} | {{ exc.triggeredAt }}</div>
          </div>
          <el-button type="primary" size="small" style="margin-top: 8px;" @click="openResolve(exc, s.id)">
            处理异常
          </el-button>
        </div>
      </div>

      <div v-if="s.exceptions.filter(e => e.status === 'resolved').length > 0" style="margin-top: 8px;">
        <el-collapse>
          <el-collapse-item :title="`已处理异常 (${s.exceptions.filter(e => e.status === 'resolved').length})`">
            <div v-for="exc in s.exceptions.filter(e => e.status === 'resolved')" :key="exc.id" class="exception-card resolved">
              <div class="flex-between">
                <el-tag type="success" size="small">{{ excTypeName(exc.type) }} - 已处理</el-tag>
                <span class="text-muted" style="font-size: 12px;">{{ exc.resolvedAt }}</span>
              </div>
              <div style="font-size: 13px; margin-top: 4px;">{{ exc.title }}: {{ exc.resolution }}</div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <div class="text-muted" style="margin-top: 8px; font-size: 12px;">
        计算时间：{{ s.calculatedAt }} | 计算人：{{ s.calculatedBy?.name || '-' }}
        <el-button type="info" link size="small" class="ml-10" @click="viewTraces(s)">影响链路</el-button>
      </div>
    </div>

    <el-empty v-if="filteredSettlements.length === 0" description="暂无分账记录，请先发起分账计算" />

    <el-dialog v-model="calcVisible" title="发起分账计算" width="500px">
      <el-form label-width="100px">
        <el-form-item label="选择影片" required>
          <el-select v-model="calcContractId" placeholder="选择合同" style="width:100%">
            <el-option v-for="c in store.contracts" :key="c.id" :label="`${c.filmName} (${c.contractNo})`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="结算周期" required>
          <el-input v-model="calcPeriod" placeholder="如 2026-05" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="calcVisible = false">取消</el-button>
        <el-button type="primary" @click="doCalculate">开始计算</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="basisVisible" title="保底比较依据" width="650px">
      <div v-if="currentBasis" class="calculation-basis">
        <div v-for="(item, idx) in currentBasis.calculationBasis" :key="idx" class="basis-item" :class="{ highlight: idx === currentBasis.calculationBasis.length - 1 }">
          {{ idx + 1 }}. {{ item }}
        </div>
        <el-divider />
        <div class="section-title" style="font-size: 14px;">证据材料</div>
        <div v-for="(item, idx) in currentBasis.basisEvidence" :key="'e'+idx" class="basis-item">
          {{ idx + 1 }}. {{ item }}
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="resolveVisible" title="处理异常" width="500px">
      <el-form v-if="resolveExc" label-width="100px">
        <el-form-item label="异常类型">
          <el-tag :type="excTypeTag(resolveExc.type)" size="small">{{ excTypeName(resolveExc.type) }}</el-tag>
        </el-form-item>
        <el-form-item label="描述">{{ resolveExc.description }}</el-form-item>
        <el-form-item label="卡点"><span class="text-warning">{{ resolveExc.blockingPoint }}</span></el-form-item>
        <el-form-item label="下一步"><span class="text-success">{{ resolveExc.nextAction }}</span></el-form-item>
        <el-form-item label="处理结果" required>
          <el-input v-model="resolveResolution" type="textarea" :rows="3" placeholder="请输入处理说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" @click="doResolve">确认处理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="traceVisible" title="影响链路" width="700px">
      <el-empty v-if="traces.length === 0" description="暂无追踪记录" :image-size="60" />
      <div v-else>
        <div v-for="t in traces" :key="t.id" class="trace-item" :class="t.impactType === 'exception_trigger' ? 'danger' : t.impactType === 'status_change' ? 'warning' : ''">
          <div class="flex-between mb-10">
            <strong>{{ t.impactDescription }}</strong>
            <el-tag :type="t.impactType === 'exception_trigger' ? 'danger' : 'info'" size="small">
              {{ t.impactType === 'value_change' ? '值变更' : t.impactType === 'status_change' ? '状态变更' : '异常触发' }}
            </el-tag>
          </div>
          <div class="text-muted" style="font-size: 12px;">
            {{ t.sourceEntity }}.{{ t.sourceField }} → {{ t.targetEntity }}.{{ t.targetField }}
          </div>
          <div class="text-muted" style="font-size: 12px;">{{ t.createdAt }} | {{ t.createdBy.name }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useBusinessStore } from '../stores/business'
import type { SettlementResult, SettlementException, GuaranteeComparison, ImpactTrace, ExceptionType } from '../types'

const route = useRoute()
const store = useBusinessStore()

const filterFilm = ref('')
const filterStatus = ref('')
const calcVisible = ref(false)
const calcContractId = ref('')
const calcPeriod = ref('')
const basisVisible = ref(false)
const currentBasis = ref<GuaranteeComparison | null>(null)
const resolveVisible = ref(false)
const resolveExc = ref<SettlementException | null>(null)
const resolveSettlementId = ref('')
const resolveResolution = ref('')
const traceVisible = ref(false)
const traces = ref<ImpactTrace[]>([])

const filteredSettlements = computed(() => {
  return store.settlements.filter(s => {
    if (filterFilm.value && s.contractId !== filterFilm.value) return false
    if (filterStatus.value && s.status !== filterStatus.value) return false
    return true
  })
})

function fmtAmt(n: number): string {
  if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(2) + '亿'
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + '万'
  return n.toLocaleString()
}

function statusTag(s: string) { return { success: 'success', pending: 'warning', blocked: 'danger', failed: 'danger', calculating: 'info' }[s] || '' }
function statusLabel(s: string) { return { pending: '待复核', calculating: '计算中', success: '已完成', failed: '计算失败', blocked: '已阻断' }[s] || s }
function excTypeTag(t: ExceptionType) { return { guarantee_shortfall: 'danger', promo_deduction: 'warning', cross_period_adjustment: 'info', settlement_failed: 'danger' }[t] || '' }
function excTypeName(t: ExceptionType) { return { guarantee_shortfall: '保底未达', promo_deduction: '宣发追扣', cross_period_adjustment: '跨期退补', settlement_failed: '分账失败' }[t] || t }
function settlementClass(s: SettlementResult) { return { blocked: 'settlement-blocked', failed: 'settlement-failed', success: 'settlement-success' }[s.status] || '' }

function showCalcDialog() { calcContractId.value = ''; calcPeriod.value = ''; calcVisible.value = true }

function doCalculate() {
  if (!calcContractId.value || !calcPeriod.value) { ElMessage.warning('请选择影片和结算周期'); return }
  try {
    const result = store.calculateSettlement(calcContractId.value, calcPeriod.value)
    calcVisible.value = false
    if (result.status === 'blocked') ElMessage.warning('计算完成，存在阻断性异常需处理')
    else if (result.status === 'pending') ElMessage.info('计算完成，存在待处理事项')
    else ElMessage.success('分账计算完成')
  } catch (e: any) {
    ElMessage.error(e.message || '计算失败')
  }
}

function recalculate(id: string) {
  ElMessageBox.confirm('重新计算将基于当前最新数据，是否继续？', '确认', { type: 'warning' }).then(() => {
    store.recalculateSettlement(id)
    ElMessage.success('已重新计算')
  }).catch(() => {})
}

function exportLetter(id: string) {
  store.exportLetter(id)
  ElMessage.success('结算函已导出')
}

function showBasis(gc: GuaranteeComparison) { currentBasis.value = gc; basisVisible.value = true }

function openResolve(exc: SettlementException, sid: string) {
  resolveExc.value = exc
  resolveSettlementId.value = sid
  resolveResolution.value = ''
  resolveVisible.value = true
}

function doResolve() {
  if (!resolveResolution.value.trim()) { ElMessage.warning('请输入处理说明'); return }
  store.resolveException(resolveExc.value!.id, resolveSettlementId.value, resolveResolution.value)
  resolveVisible.value = false
  ElMessage.success('异常已处理')
}

function viewTraces(s: SettlementResult) { traces.value = store.getEntityTraces(s.id); traceVisible.value = true }
</script>

<style scoped>
.settlement-card { transition: all 0.2s; }
.settlement-blocked { border-left: 4px solid #f56c6c; }
.settlement-failed { border-left: 4px solid #f56c6c; }
.settlement-success { border-left: 4px solid #67c23a; }

.stat-mini { text-align: center; padding: 8px; background: #f5f7fa; border-radius: 6px; }
.stat-mini-label { font-size: 12px; color: #909399; }
.stat-mini-value { font-size: 16px; margin-top: 4px; }

.promo-section { padding: 10px; background: #fdf6ec; border-radius: 6px; font-size: 13px; }

.failure-reason { padding: 10px; background: #fef0f0; border-radius: 6px; display: flex; align-items: center; gap: 6px; }

.exception-points { display: flex; flex-direction: column; gap: 4px; }
.point-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.point-item.danger { color: #f56c6c; }
.point-item.success { color: #67c23a; }
.point-item.info { color: #909399; }
</style>
