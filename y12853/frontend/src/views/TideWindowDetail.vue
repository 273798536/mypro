<template>
  <div class="page-wrapper">
    <el-page-header :content="`潮窗详情 · ${result?.vessel_name || '-'}`" style="margin-bottom: 16px;" @back="$router.back()" />

    <!-- 顶部状态摘要 -->
    <div class="detail-block" v-if="summary">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <h3 style="display: inline; margin-right: 12px;">📌 结果说明（简短版）</h3>
          <el-tag size="large" :type="tagType">{{ summary.status_label || result.data_status }}</el-tag>
        </div>
        <el-space>
          <el-button v-if="result.data_status !== 'confirmed' && result.data_status !== 'recollect'"
                     type="success" size="large" @click="confirmDialog = true">
            <el-icon><CircleCheck /></el-icon> 海事安全员复核通过
          </el-button>
          <el-button type="primary" size="large" @click="recompute">
            <el-icon><Refresh /></el-icon> 强制重算
          </el-button>
        </el-space>
      </div>
      <div :class="['summary-text', result.data_status]">{{ summary.summary_text }}</div>
    </div>

    <el-row :gutter="16">
      <!-- 左：详细信息 -->
      <el-col :span="14">
        <div class="detail-block">
          <h3>🚢 船舶与港口信息</h3>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="船名">{{ result.vessel_name }}</el-descriptions-item>
            <el-descriptions-item label="MMSI">{{ result.mmsi || '-' }}</el-descriptions-item>
            <el-descriptions-item label="作业日期">{{ result.work_date }}</el-descriptions-item>
            <el-descriptions-item label="港口代码">{{ result.port_code }}</el-descriptions-item>
            <el-descriptions-item label="港口名称" :span="2">{{ result.port_name }}</el-descriptions-item>
            <el-descriptions-item label="船舶吃水">{{ result.draft?.toFixed?.(2) }} m</el-descriptions-item>
            <el-descriptions-item label="要求水深">{{ result.required_depth?.toFixed?.(2) }} m</el-descriptions-item>
            <el-descriptions-item label="富余水深">{{ result.under_keel_clearance?.toFixed?.(2) }} m</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-block">
          <h3>🌊 潮窗与水深统计</h3>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="潮窗开始">
              <span style="color:#409eff; font-weight:600;">{{ fmt(result.window_start) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="潮窗结束">
              <span style="color:#409eff; font-weight:600;">{{ fmt(result.window_end) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="潮窗时长">{{ result.window_duration_min?.toFixed?.(0) }} 分钟</el-descriptions-item>
            <el-descriptions-item label="起始潮高">{{ result.tide_height_at_start?.toFixed?.(2) }} m</el-descriptions-item>
            <el-descriptions-item label="最小水深" :span="2">
              <el-tag :type="result.min_depth >= (result.required_depth || 0) ? 'success' : 'danger'">
                {{ result.min_depth?.toFixed?.(2) }} m
              </el-tag>
              <span style="margin-left:8px; color:#909399;">
                （要求 {{ result.required_depth?.toFixed?.(2) }} m / 最大 {{ result.max_depth?.toFixed?.(2) }} m / 平均 {{ result.avg_depth?.toFixed?.(2) }} m）
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-block">
          <h3>🔍 数据质量检查</h3>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-statistic title="负深度样点（已自动剔除，不可混入结果）"
                            :value="result.negative_depth_count || 0"
                            :value-style="{ color: (result.negative_depth_count || 0) > 0 ? '#f56c6c' : '#67c23a' }" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="潮汐-水深匹配度"
                            :value="result.tide_water_match_score?.toFixed?.(0) || 0"
                            suffix="%"
                            :value-style="{ color: (result.tide_water_match_score || 0) >= 60 ? '#67c23a' : '#e6a23c' }" />
              <div style="font-size: 12px; color: #909399; margin-top:4px;">阈值 ≥ 60% 可直接用</div>
            </el-col>
            <el-col :span="8">
              <el-statistic title="当前状态" :value="statusText" :value-style="{ color: statusColor }" />
            </el-col>
          </el-row>
          <el-divider />
          <div v-if="result.pending_reason" style="background:#fdf6ec; padding:10px 14px; border-radius:6px; margin-bottom:8px;">
            <strong style="color:#b88230;">⏳ 暂缓原因：</strong>{{ result.pending_reason }}
          </div>
          <div v-if="result.recollect_reason" style="background:#fef0f0; padding:10px 14px; border-radius:6px; margin-bottom:8px;">
            <strong style="color:#f56c6c;">🔄 需重采原因：</strong>{{ result.recollect_reason }}
          </div>
          <div v-if="result.failure_reason" style="background:#fef0f0; padding:10px 14px; border-radius:6px;">
            <strong style="color:#f56c6c;">❌ 失败原因：</strong>{{ result.failure_reason }}
          </div>
        </div>

        <div class="detail-block">
          <h3>📐 计算参数与公式</h3>
          <div class="formula-card">
            <div class="title">公式表达式</div>
            <div class="expr">{{ result.formula_used }}</div>
          </div>
          <el-alert v-if="result.formula_note" type="info" :closable="false" show-icon
                    style="white-space: pre-wrap; margin-top:8px;" :title="result.formula_note" />
          <el-descriptions v-if="result.calc_params" :column="2" border size="small" style="margin-top: 12px;" title="计算参数快照">
            <el-descriptions-item v-for="(v, k) in displayParams" :key="k" :label="k">{{ v }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-block">
          <h3>✍️ 人工修正（修改自动留痕）</h3>
          <el-form :inline="true" :model="corr" label-width="80px" label-position="top">
            <el-form-item label="操作人"><el-input v-model="corr.operator" /></el-form-item>
            <el-form-item label="修改字段">
              <el-select v-model="corr.field_name" placeholder="选择字段" clearable style="width:180px;">
                <el-option label="最小水深(min_depth)" value="min_depth" />
                <el-option label="潮窗开始(window_start)" value="window_start" />
                <el-option label="潮窗结束(window_end)" value="window_end" />
                <el-option label="潮窗时长(min)" value="window_duration_min" />
                <el-option label="潮汐-水深匹配度" value="tide_water_match_score" />
                <el-option label="负深度计数" value="negative_depth_count" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="corr.field_name" label="原值">
              <el-input :value="oldValue" disabled style="width:180px; background:#f5f7fa;" />
            </el-form-item>
            <el-form-item v-if="corr.field_name" label="新值">
              <el-input v-model="corr.new_value_str" style="width:180px;" placeholder="输入新值" />
            </el-form-item>
            <el-form-item label="状态变更">
              <el-select v-model="corr.new_status" placeholder="（可选）" clearable style="width:180px;">
                <el-option label="✅ 可用 available" value="available" />
                <el-option label="⏳ 暂缓 pending" value="pending" />
                <el-option label="🔄 需重采 recollect" value="recollect" />
                <el-option label="✅ 已确认 confirmed" value="confirmed" />
              </el-select>
            </el-form-item>
            <el-form-item label="修改原因/备注" style="flex:1; min-width: 280px;">
              <el-input v-model="corr.remark" placeholder="请说明修改原因（留痕）" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="doCorrect">
                <el-icon><EditPen /></el-icon> 提交修正（留痕）
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-col>

      <!-- 右：修正留痕历史 -->
      <el-col :span="10">
        <div class="detail-block">
          <h3>📜 修正/确认历史（前后变化可追溯）</h3>
          <el-timeline>
            <el-timeline-item
              v-for="log in auditLog"
              :key="log.id"
              :timestamp="fmt(log.created_at)"
              :type="logTypeColor(log.action)"
              :hollow="true"
            >
              <el-card shadow="never" style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <strong>
                    <el-tag size="small" :type="logTypeColor(log.action)">{{ actionText(log.action) }}</el-tag>
                    <span style="margin-left: 8px;">{{ log.operator }}</span>
                  </strong>
                </div>
                <div v-if="log.change_summary" style="line-height:1.7; color:#303133; margin-bottom:4px;">
                  <strong style="color:#409eff;">变化：</strong>{{ log.change_summary }}
                </div>
                <div v-if="log.old_value || log.new_value" style="background:#f5f7fa; padding:6px 10px; border-radius:4px; margin-bottom:4px; font-family:monospace; font-size:12px;">
                  <div v-if="log.field_name"><strong>字段：</strong>{{ log.field_name }}</div>
                  <div v-if="log.old_value != null" style="color:#f56c6c;">← 旧值：{{ JSON.stringify(log.old_value) }}</div>
                  <div v-if="log.new_value != null" style="color:#67c23a;">→ 新值：{{ JSON.stringify(log.new_value) }}</div>
                </div>
                <div v-if="log.old_status || log.new_status" style="margin-bottom:4px;">
                  <el-tag v-if="log.old_status" size="small" type="info">{{ log.old_status }}</el-tag>
                  <el-icon style="vertical-align:middle; margin:0 4px;"><ArrowRight /></el-icon>
                  <el-tag v-if="log.new_status" size="small" type="success">{{ log.new_status }}</el-tag>
                </div>
                <div v-if="log.remark" style="color:#909399; font-size:12px; margin-top:4px;">
                  💬 {{ log.remark }}
                </div>
              </el-card>
            </el-timeline-item>
            <el-empty v-if="!auditLog.length" description="暂无修正记录" />
          </el-timeline>
        </div>

        <div class="detail-block">
          <h3>📎 源数据引用</h3>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="批次号">{{ result.batch_id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="潮汐记录数">{{ (result.source_tide_ids || []).length }} 条</el-descriptions-item>
            <el-descriptions-item label="水质记录数">{{ (result.source_water_ids || []).length }} 条</el-descriptions-item>
            <el-descriptions-item label="轨迹记录数">{{ (result.source_trajectory_ids || []).length }} 条</el-descriptions-item>
            <el-descriptions-item label="结果编号">{{ result.result_no }}</el-descriptions-item>
            <el-descriptions-item label="确认人/时间">
              {{ result.confirmed_by || '-' }} / {{ fmt(result.confirmed_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>
    </el-row>

    <!-- 确认通过对话框 -->
    <el-dialog v-model="confirmDialog" title="✅ 海事安全员复核通过" width="460px">
      <el-form :model="cf" label-width="80px">
        <el-form-item label="复核人"><el-input v-model="cf.operator" /></el-form-item>
        <el-form-item label="备注">
          <el-input type="textarea" v-model="cf.remark" :rows="3" placeholder="请输入复核意见，例如：匹配度不足原因查明为水质记录时钟偏差15分钟，数据可信" />
        </el-form-item>
      </el-form>
      <el-alert type="warning" :closable="false" show-icon
                title="复核通过会将状态从「待确认」改为「已通过」，变更留痕将永久保存。" />
      <template #footer>
        <el-button @click="confirmDialog = false">取消</el-button>
        <el-button type="success" @click="doConfirm">确认通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { tideApi } from '@/api'
import dayjs from 'dayjs'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const result = ref({})
const summary = ref(null)
const auditLog = ref([])
const corr = reactive({ operator: '海事安全员', field_name: '', new_value_str: '', new_status: '', remark: '' })
const confirmDialog = ref(false)
const cf = reactive({ operator: '海事安全员', remark: '' })

const fmt = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'
const statusText = computed(() => ({
  available: '✅ 可用', pending: '⏳ 暂缓', recollect: '🔄 需重采', confirmed: '✅ 已确认'
}[result.value.data_status] || result.value.data_status))
const statusColor = computed(() => ({
  available: '#67c23a', pending: '#e6a23c', recollect: '#f56c6c', confirmed: '#409eff'
}[result.value.data_status] || '#909399'))
const tagType = computed(() => ({
  available: 'success', pending: 'warning', recollect: 'danger', confirmed: 'primary'
}[result.value.data_status] || 'info'))

const oldValue = computed(() => {
  if (!corr.field_name) return ''
  const v = result.value[corr.field_name]
  return typeof v === 'object' ? JSON.stringify(v) : (v ?? '')
})

const displayParams = computed(() => {
  const p = result.value.calc_params || {}
  const out = {}
  for (const k in p) {
    const v = p[k]
    out[k] = typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v
  }
  return out
})

const load = async () => {
  const [d, s, a] = await Promise.all([
    tideApi.detail(id.value),
    tideApi.summary(id.value),
    tideApi.audit(id.value),
  ])
  result.value = d.data.data || {}
  summary.value = s.data
  auditLog.value = a.data.items || []
}

const recompute = async () => {
  await ElMessageBox.confirm('强制重算会根据最新输入重新生成结果，是否继续？', '提示', { type: 'warning' })
  const payload = {
    port_code: result.value.port_code,
    port_name: result.value.port_name,
    vessel_name: result.value.vessel_name,
    mmsi: result.value.mmsi,
    work_date: result.value.work_date,
    required_depth: result.value.required_depth,
    draft: result.value.draft,
    under_keel_margin: result.value.calc_params?.under_keel_margin || 0.5,
    time_window_hours: result.value.calc_params?.time_window_hours || 24,
    operator: corr.operator,
  }
  await tideApi.calc(payload, true)
  ElMessage.success('重算完成，已留痕')
  load()
}

const doCorrect = async () => {
  if (!corr.operator) return ElMessage.warning('请填写操作人')
  if (!corr.field_name && !corr.new_status && !corr.remark) return ElMessage.warning('请至少修改字段或变更状态')
  let new_val = corr.new_value_str
  if (corr.field_name && oldValue.value !== '') {
    const old = oldValue.value
    if (!isNaN(Number(old))) new_val = Number(corr.new_value_str)
    if (JSON.stringify(old) === JSON.stringify(new_val)) return ElMessage.warning('新值与原值相同')
  }
  await tideApi.correct(id.value, {
    result_id: id.value,
    operator: corr.operator,
    field_name: corr.field_name || undefined,
    old_value: corr.field_name ? (typeof oldValue.value === 'string' && !isNaN(Number(oldValue.value)) ? Number(oldValue.value) : oldValue.value) : undefined,
    new_value: corr.field_name ? new_val : undefined,
    new_status: corr.new_status || undefined,
    remark: corr.remark || undefined,
    change_summary: corr.field_name ? `人工修正字段${corr.field_name}` : undefined,
  })
  ElMessage.success('修正已提交，留痕完成')
  corr.field_name = ''; corr.new_value_str = ''; corr.new_status = ''; corr.remark = ''
  load()
}

const doConfirm = async () => {
  if (!cf.operator) return ElMessage.warning('请填写复核人')
  await tideApi.confirm(id.value, { operator: cf.operator, remark: cf.remark })
  ElMessage.success('已复核通过，前后变化已留痕')
  confirmDialog.value = false
  cf.remark = ''
  load()
}

const logTypeColor = (a) => ({
  create: 'primary', recompute: 'warning', status_change: '',
  manual_correct: 'warning', confirm: 'success', update: ''
}[a] || '')
const actionText = (a) => ({
  create: '初始计算', recompute: '自动重算', status_change: '状态变更',
  manual_correct: '人工修正', confirm: '复核通过', update: '更新'
}[a] || a)

onMounted(load)
watch(id, load)
</script>
