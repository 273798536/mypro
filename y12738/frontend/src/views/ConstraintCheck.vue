<template>
  <div class="page-container">
    <div class="section-card">
      <div class="section-title">
        <el-icon><CircleCheck /></el-icon>
        约束校验（月底 / 课前复核）
      </div>
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px;">
        复核时请注意：默认不要假设材料干净。空值、重复、备注混写、近似误差过大都很常见。
        同一条记录的多次导入/补录会自动合并，不会出现两份互相打架的结论。
      </el-alert>

      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <el-upload
          :show-file-list="false"
          :before-upload="handleBeforeUpload"
          accept=".csv,.xlsx,.xls"
          :http-request="customUpload"
        >
          <el-button type="warning" :loading="importing">
            <el-icon><Upload /></el-icon>
            导入（月底/课前·约束校验）
          </el-button>
        </el-upload>
        <span style="color: #909399; font-size: 12px;">
          导入时会自动比对已有记录，重复题目会被更新而非新增，避免同一题目两份结论。
        </span>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">
        <el-icon><Warning /></el-icon>
        待复核问题（重点关注）
      </div>
      <el-row :gutter="12">
        <el-col :span="6">
          <el-card shadow="hover" @click="quickFilter('critical')" style="cursor: pointer;">
            <el-statistic title="严重误差" :value="stats.critical" value-style="color: #f56c6c;" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" @click="quickFilter('warning')" style="cursor: pointer;">
            <el-statistic title="警告误差" :value="stats.warning" value-style="color: #e6a23c;" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" @click="quickFilter('empty')" style="cursor: pointer;">
            <el-statistic title="空值字段" :value="stats.empty" value-style="color: #909399;" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" @click="quickFilter('pending')" style="cursor: pointer;">
            <el-statistic title="待确认" :value="stats.pending" value-style="color: #409eff;" />
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="section-card">
      <div class="section-title">
        <el-icon><List /></el-icon>
        复核记录
      </div>
      <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <el-select v-model="filterSource" placeholder="按批次来源" clearable size="small" style="width: 160px;">
          <el-option label="误差分析导入" value="error_analysis" />
          <el-option label="约束校验导入" value="constraint_check" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="按状态" clearable size="small" style="width: 120px;">
          <el-option label="待确认" value="pending" />
          <el-option label="通过" value="passed" />
          <el-option label="驳回" value="rejected" />
          <el-option label="需复核" value="need_review" />
        </el-select>
        <el-select v-model="filterError" placeholder="按误差级别" clearable size="small" style="width: 120px;">
          <el-option label="正常" value="normal" />
          <el-option label="警告" value="warning" />
          <el-option label="严重" value="critical" />
        </el-select>
        <el-checkbox v-model="filterIssue" size="small">仅显示有质量问题</el-checkbox>
        <el-checkbox v-model="filterNoPass" size="small">仅显示未通过约束</el-checkbox>
        <el-button size="small" type="primary" @click="loadRecords">刷新</el-button>
      </div>

      <el-table :data="records" size="small" border stripe @selection-change="onSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column label="ID" prop="id" width="60" />
        <el-table-column label="题号" width="100">
          <template #default="{ row }">{{ row.question_no || row.question_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="题目标题" prop="question_title" show-overflow-tooltip min-width="180" />
        <el-table-column label="精确值" prop="eigenvalue_exact" show-overflow-tooltip width="130" />
        <el-table-column label="近似值" prop="eigenvalue_approx" show-overflow-tooltip width="130" />
        <el-table-column label="误差" width="80" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.error_level === 'critical' ? '#f56c6c' : row.error_level === 'warning' ? '#e6a23c' : '' }">
              {{ Number(row.error_value || 0).toFixed(4) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="质量" width="200">
          <template #default="{ row }">
            <el-tooltip v-if="row.error_level === 'critical'" content="近似误差过大，需重点复核" placement="top">
              <el-tag size="small" type="danger" effect="dark">大误差</el-tag>
            </el-tooltip>
            <el-tooltip v-if="row.error_level === 'warning'" content="误差较大，建议复核" placement="top">
              <el-tag size="small" type="warning" style="margin-left: 4px;">偏大</el-tag>
            </el-tooltip>
            <el-tag v-if="row.has_empty" size="small" type="info" style="margin-left: 4px;">空值</el-tag>
            <el-tag v-if="row.has_duplicate" size="small" type="info" effect="plain" style="margin-left: 4px;">重复</el-tag>
            <el-tag v-if="row.remark_mixed" size="small" type="danger" effect="plain" style="margin-left: 4px;">备注混写</el-tag>
            <span v-if="cleanRow(row)" style="color: #67c23a;">✓</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :class="`tag-status-${row.status}`">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="约束" width="80">
          <el-tag v-if="row.constraint_pass" size="small" type="success">通过</el-tag>
          <el-tag v-else size="small" type="danger">未通过</el-tag>
        </el-table-column>
        <el-table-column label="复核人" prop="reviewed_by" width="90" />
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" link @click="quickPass(row)">标记通过</el-button>
            <el-button size="small" type="warning" link @click="markReview(row)">需复核</el-button>
            <el-button size="small" type="primary" link @click="openEdit(row)">修正并留痕</el-button>
            <el-button size="small" type="info" link @click="viewAudit(row)">变更历史</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <el-button size="small" type="success" :disabled="!selected.length" @click="batchPass">
            批量通过（{{ selected.length }}）
          </el-button>
          <el-button size="small" type="warning" :disabled="!selected.length" style="margin-left: 8px;" @click="batchNeedReview">
            批量标记需复核
          </el-button>
        </div>
        <el-pagination
          v-model:current-page="page" v-model:page-size="pageSize"
          :total="totalRecords" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadRecords" @current-change="loadRecords" />
      </div>
    </div>

    <RecordEditDialog v-model="editVisible" :record="editingRecord" @saved="onRecordSaved" />

    <el-dialog v-model="auditVisible" title="变更历史（人工修正留痕）" width="700px" top="6vh">
      <el-empty v-if="!auditLogs.length" description="暂无变更记录" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="log in auditLogs"
          :key="log.id"
          :timestamp="formatTime(log.created_at)"
          :type="log.operation === 'manual_update' ? 'primary' : 'info'"
        >
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>{{ log.field_name }}</strong>
              <span style="margin: 0 6px; color: #909399;">→</span>
              <code style="background: #f4f4f5; padding: 0 6px; border-radius: 4px;">
                {{ log.old_value || '(空)' }}
              </code>
              <span style="margin: 0 6px; color: #909399;">➜</span>
              <code style="background: #ecf5ff; padding: 0 6px; border-radius: 4px; color: #409eff;">
                {{ log.new_value || '(空)' }}
              </code>
            </div>
            <el-tag size="small" :type="log.operation === 'manual_update' ? 'primary' : 'info'">
              {{ log.operation === 'manual_update' ? '人工修改' : '导入自动更新' }}
            </el-tag>
          </div>
          <div style="margin-top: 6px; font-size: 12px; color: #909399;">
            操作人：{{ log.operator }}
            <span v-if="log.comment" style="margin-left: 16px;">说明：{{ log.comment }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, Upload, Warning, List } from '@element-plus/icons-vue'
import { api } from '../api.js'
import RecordEditDialog from '../components/RecordEditDialog.vue'

const importing = ref(false)
const records = ref([])
const totalRecords = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterSource = ref('')
const filterStatus = ref('')
const filterError = ref('')
const filterIssue = ref(false)
const filterNoPass = ref(false)
const selected = ref([])

const stats = ref({ critical: 0, warning: 0, empty: 0, pending: 0 })

const editVisible = ref(false)
const editingRecord = ref(null)
const auditVisible = ref(false)
const auditLogs = ref([])

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}
function statusText(s) {
  return { pending: '待确认', passed: '通过', rejected: '驳回', need_review: '需复核' }[s] || s
}
function cleanRow(row) {
  return !row.has_empty && !row.has_duplicate && !row.remark_mixed && row.error_level === 'normal'
}

function quickFilter(type) {
  filterStatus.value = ''
  filterError.value = ''
  filterIssue.value = false
  if (type === 'critical') filterError.value = 'critical'
  else if (type === 'warning') filterError.value = 'warning'
  else if (type === 'empty') filterIssue.value = true
  else if (type === 'pending') filterStatus.value = 'pending'
  page.value = 1
  loadRecords()
}

async function loadStats() {
  try {
    const all = await api.listBatches()
    let c = 0, w = 0, e = 0, p = 0
    for (const b of all) {
      try {
        const r = await api.getBatchRecords(b.id, { page: 1, page_size: 1000 })
        for (const rec of r.items) {
          if (rec.error_level === 'critical') c++
          if (rec.error_level === 'warning') w++
          if (rec.has_empty) e++
          if (rec.status === 'pending') p++
        }
      } catch {}
    }
    stats.value = { critical: c, warning: w, empty: e, pending: p }
  } catch {}
}

async function loadRecords() {
  const allBatches = await api.listBatches(
    filterSource.value || undefined
  )
  const all = []
  for (const b of allBatches) {
    try {
      const params = { page: 1, page_size: 1000 }
      if (filterStatus.value) params.status = filterStatus.value
      if (filterError.value) params.error_level = filterError.value
      if (filterIssue.value) params.has_issue = true
      const r = await api.getBatchRecords(b.id, params)
      for (const it of r.items) {
        if (filterNoPass.value && it.constraint_pass) continue
        all.push(it)
      }
    } catch {}
  }
  all.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  totalRecords.value = all.length
  const start = (page.value - 1) * pageSize.value
  records.value = all.slice(start, start + pageSize.value)
}

function onSelectionChange(val) {
  selected.value = val
}

function handleBeforeUpload(file) {
  const ok = /\.(csv|xlsx|xls)$/i.test(file.name)
  if (!ok) {
    ElMessage.error('仅支持 CSV / Excel 文件')
    return false
  }
  return true
}

async function customUpload(opt) {
  importing.value = true
  try {
    const result = await api.importBatch(opt.file, 'constraint_check', '排课老师')
    ElMessage.success(
      `约束校验导入完成：${result.new_count} 新增，${result.updated_count} 更新，${result.duplicate_count} 重复，${result.quality_issues?.length || 0} 个质量问题`
    )
    await loadStats()
    await loadRecords()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    importing.value = false
  }
}

async function quickPass(row) {
  try {
    await ElMessageBox.confirm(
      `确认将题目「${row.question_title || row.question_no || '#' + row.id}」标记为通过？此变更将记录审计日志。`,
      '确认通过',
      { type: 'success' }
    )
    await api.updateRecord(row.id, {
      status: 'passed',
      constraint_pass: true,
      operator: '排课老师',
      comment: '约束校验复核通过',
    })
    ElMessage.success('已标记通过，变更已留痕')
    loadRecords()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message)
  }
}

async function markReview(row) {
  try {
    await api.updateRecord(row.id, {
      status: 'need_review',
      operator: '排课老师',
      comment: '需进一步复核',
    })
    ElMessage.success('已标记需复核')
    loadRecords()
    loadStats()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function batchPass() {
  if (!selected.value.length) return
  try {
    await ElMessageBox.confirm(`确认将选中的 ${selected.value.length} 条记录标记为通过？`, '批量通过', { type: 'success' })
    for (const row of selected.value) {
      try {
        await api.updateRecord(row.id, {
          status: 'passed',
          constraint_pass: true,
          operator: '排课老师',
          comment: '批量复核通过',
        })
      } catch {}
    }
    ElMessage.success(`已批量通过 ${selected.value.length} 条`)
    loadRecords()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message)
  }
}

async function batchNeedReview() {
  if (!selected.value.length) return
  for (const row of selected.value) {
    try {
      await api.updateRecord(row.id, {
        status: 'need_review',
        operator: '排课老师',
        comment: '批量标记需复核',
      })
    } catch {}
  }
  ElMessage.success(`已标记 ${selected.value.length} 条需复核`)
  loadRecords()
  loadStats()
}

function openEdit(row) {
  editingRecord.value = row
  editVisible.value = true
}

function onRecordSaved() {
  loadRecords()
  loadStats()
}

async function viewAudit(row) {
  try {
    auditLogs.value = await api.getAuditLogs(row.id)
    auditVisible.value = true
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(async () => {
  await loadStats()
  await loadRecords()
})
</script>
