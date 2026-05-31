<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">异常追踪</div>
    </div>

    <div class="card-section mb-20">
      <div class="section-title">异常类型分布</div>
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="exc-stat danger">
            <div class="exc-stat-value">{{ exceptionStats.guarantee_shortfall }}</div>
            <div class="exc-stat-label">保底未达</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="exc-stat warning">
            <div class="exc-stat-value">{{ exceptionStats.promo_deduction }}</div>
            <div class="exc-stat-label">宣发追扣</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="exc-stat info">
            <div class="exc-stat-value">{{ exceptionStats.cross_period_adjustment }}</div>
            <div class="exc-stat-label">跨期退补</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="exc-stat failed">
            <div class="exc-stat-value">{{ exceptionStats.settlement_failed }}</div>
            <div class="exc-stat-label">分账失败</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="card-section">
      <div class="flex-between mb-10">
        <div class="section-title" style="margin-bottom: 0;">全部异常</div>
        <el-select v-model="filterType" placeholder="筛选类型" clearable size="small" style="width: 150px;">
          <el-option label="保底未达" value="guarantee_shortfall" />
          <el-option label="宣发追扣" value="promo_deduction" />
          <el-option label="跨期退补" value="cross_period_adjustment" />
          <el-option label="分账失败" value="settlement_failed" />
        </el-select>
      </div>

      <div v-for="item in filteredExceptions" :key="item.exception.id" class="exception-card" :class="item.exception.status">
        <div class="flex-between mb-10">
          <div>
            <el-tag :type="excTypeTag(item.exception.type)" size="small">{{ excTypeName(item.exception.type) }}</el-tag>
            <strong class="ml-10">{{ item.exception.title }}</strong>
            <el-tag v-if="item.exception.status === 'resolved'" type="success" size="small" class="ml-10">已处理</el-tag>
          </div>
          <span class="text-muted" style="font-size: 12px;">{{ item.exception.triggeredAt }}</span>
        </div>

        <div class="mb-10" style="font-size: 14px;">
          <span class="text-muted">【{{ item.settlement.filmName }}】{{ item.settlement.settlementPeriod }}</span>
        </div>

        <div class="mb-10" style="font-size: 13px;">{{ item.exception.description }}</div>

        <div class="exception-points">
          <div class="point-item danger"><el-icon><Lock /></el-icon>卡点：{{ item.exception.blockingPoint }}</div>
          <div class="point-item success"><el-icon><Right /></el-icon>下一步：{{ item.exception.nextAction }}</div>
          <div class="point-item info"><el-icon><User /></el-icon>负责人：{{ item.exception.responsiblePerson }}</div>
        </div>

        <div class="flex-between" style="margin-top: 10px;">
          <div class="text-muted" style="font-size: 12px;">
            触发人：{{ item.exception.triggeredBy.name }}
            <span v-if="item.exception.status === 'resolved'"> | 处理人：{{ item.exception.resolvedBy?.name }} | {{ item.exception.resolvedAt }}</span>
          </div>
          <div>
            <el-button v-if="item.exception.status !== 'resolved'" type="primary" size="small" @click="openResolve(item)">
              处理
            </el-button>
            <el-button type="info" link size="small" @click="goToSettlement(item.settlement.id)">查看分账</el-button>
          </div>
        </div>

        <div v-if="item.exception.status === 'resolved' && item.exception.resolution" style="margin-top: 8px; padding: 8px; background: #f0f9eb; border-radius: 4px; font-size: 13px;">
          <strong>处理结果：</strong>{{ item.exception.resolution }}
        </div>
      </div>

      <el-empty v-if="filteredExceptions.length === 0" description="暂无异常记录" />
    </div>

    <el-dialog v-model="resolveVisible" title="处理异常" width="500px">
      <el-form v-if="resolveItem" label-width="100px">
        <el-form-item label="异常类型">
          <el-tag :type="excTypeTag(resolveItem.exception.type)" size="small">{{ excTypeName(resolveItem.exception.type) }}</el-tag>
        </el-form-item>
        <el-form-item label="描述">{{ resolveItem.exception.description }}</el-form-item>
        <el-form-item label="卡点"><span class="text-warning">{{ resolveItem.exception.blockingPoint }}</span></el-form-item>
        <el-form-item label="下一步"><span class="text-success">{{ resolveItem.exception.nextAction }}</span></el-form-item>
        <el-form-item label="处理结果" required>
          <el-input v-model="resolveResolution" type="textarea" :rows="3" placeholder="请输入处理说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" @click="doResolve">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBusinessStore } from '../stores/business'
import type { ExceptionType } from '../types'

const router = useRouter()
const store = useBusinessStore()
const filterType = ref('')
const resolveVisible = ref(false)
const resolveItem = ref<{ exception: any; settlement: any } | null>(null)
const resolveResolution = ref('')

const exceptionStats = computed(() => {
  const stats: Record<string, number> = { guarantee_shortfall: 0, promo_deduction: 0, cross_period_adjustment: 0, settlement_failed: 0 }
  store.openExceptions.forEach(e => { stats[e.exception.type] = (stats[e.exception.type] || 0) + 1 })
  return stats
})

const filteredExceptions = computed(() => {
  if (!filterType.value) return store.openExceptions
  return store.openExceptions.filter(e => e.exception.type === filterType.value)
})

function excTypeTag(t: ExceptionType) { return { guarantee_shortfall: 'danger', promo_deduction: 'warning', cross_period_adjustment: 'info', settlement_failed: 'danger' }[t] || '' }
function excTypeName(t: ExceptionType) { return { guarantee_shortfall: '保底未达', promo_deduction: '宣发追扣', cross_period_adjustment: '跨期退补', settlement_failed: '分账失败' }[t] || t }

function openResolve(item: any) { resolveItem.value = item; resolveResolution.value = ''; resolveVisible.value = true }
function doResolve() {
  if (!resolveItem.value || !resolveResolution.value.trim()) { ElMessage.warning('请输入处理说明'); return }
  store.resolveException(resolveItem.value.exception.id, resolveItem.value.settlement.id, resolveResolution.value)
  resolveVisible.value = false
  ElMessage.success('异常已处理')
}
function goToSettlement(id: string) { router.push(`/settlements?highlight=${id}`) }
</script>

<style scoped>
.exc-stat { padding: 20px; border-radius: 8px; text-align: center; color: #fff; }
.exc-stat.danger { background: linear-gradient(135deg, #f56c6c, #e6363a); }
.exc-stat.warning { background: linear-gradient(135deg, #e6a23c, #d48a06); }
.exc-stat.info { background: linear-gradient(135deg, #909399, #6b6e73); }
.exc-stat.failed { background: linear-gradient(135deg, #f56c6c, #c45656); }
.exc-stat-value { font-size: 28px; font-weight: 700; }
.exc-stat-label { font-size: 13px; margin-top: 4px; }

.exception-points { display: flex; flex-direction: column; gap: 4px; }
.point-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.point-item.danger { color: #f56c6c; }
.point-item.success { color: #67c23a; }
.point-item.info { color: #909399; }
</style>
