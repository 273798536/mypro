<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>异常队列 - 样本泄漏等异常不参与正常指标</h2>
      <el-button size="small" type="primary" :icon="Plus" @click="showAdd = true">登记异常</el-button>
    </div>

    <el-alert style="margin-bottom: 16px;" type="error" :closable="false" show-icon
      title="重要：异常样本已从正常准确率中排除，处理结果不得写成'正常通过'">
      <p>样本泄漏、图像模糊、重复样本等异常会影响指标公平性，异常样本会打上专属红色标签。</p>
    </el-alert>

    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="12">
        <div class="card-section">
          <h3>按类型 × 状态</h3>
          <el-table :data="parsedTypeStats" size="small" border>
            <el-table-column prop="anomaly_type" label="异常类型" width="130" />
            <el-table-column label="Open" width="80">
              <template #default="{ row }">
                <span class="status-open">{{ row.open || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Resolved" width="100">
              <template #default="{ row }">
                <span class="status-resolved">{{ row.resolved || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="total" label="合计" width="80" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="card-section">
          <h3>异常处理指南</h3>
          <el-steps direction="vertical" active="0" :finish-status="'success'">
            <el-step title="标记异常" description="样本进入异常队列，从正常指标排除" />
            <el-step title="核查原因" description="确认是否样本泄漏/标注错误等" />
            <el-step title="处理并记录" description="解决后标记Resolved，不得写为正常通过" />
            <el-step title="追踪历史" description="所有操作进入change_history，可复盘" />
          </el-steps>
        </div>
      </el-col>
    </el-row>

    <div class="card-section">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <el-select v-model="filterStatus" placeholder="按状态" clearable style="width: 140px;" @change="load">
          <el-option label="未解决" value="open" />
          <el-option label="已解决" value="resolved" />
        </el-select>
        <el-select v-model="filterType" placeholder="按类型" clearable style="width: 160px;" @change="load">
          <el-option v-for="t in anomalyTypes" :key="t" :label="t" :value="t" />
        </el-select>
      </div>
      <el-table :data="rows" size="small" border stripe
        :row-class-name="({ row }) => row.anomaly_type === '样本泄漏' ? 'leak-row' : ''">
        <el-table-column label="严重度" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="severityTag(row.severity)">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="异常类型" width="120">
          <template #default="{ row }">
            <span v-if="row.anomaly_type === '样本泄漏'" class="tag-leak">样本泄漏</span>
            <span v-else class="tag-normal">{{ row.anomaly_type }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sample_id" label="样本ID" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="track(row.sample_id)">{{ row.sample_id }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <span :class="`status-${row.status}`">{{ row.status === 'open' ? '未解决' : '已解决' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="detected_at" label="发现时间" width="160" />
        <el-table-column prop="resolution_note" label="处理说明" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.resolution_note" style="color:#67c23a;">{{ row.resolution_note }}</span>
            <span v-else style="color:#909399;">{{ row.status === 'open' ? '待处理 - 不写正常通过' : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'open'">
              <el-button size="small" type="success" :icon="Check" @click="resolve(row)">解决</el-button>
            </template>
            <template v-else>
              <el-button size="small" link type="warning" @click="reopen(row)">重新打开</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showAdd" title="登记异常（处理结果不得写正常通过）" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="样本ID"><el-input v-model="form.sample_id" /></el-form-item>
        <el-form-item label="异常类型">
          <el-select v-model="form.anomaly_type" style="width:100%;">
            <el-option v-for="t in anomalyTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重度">
          <el-radio-group v-model="form.severity">
            <el-radio value="low">低</el-radio>
            <el-radio value="normal">中</el-radio>
            <el-radio value="high">高</el-radio>
            <el-radio value="critical">致命</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showResNote" title="处理说明（禁止写成正常通过）" width="460px">
      <el-input v-model="resolutionNote" type="textarea" :rows="4"
        placeholder="例如：确认样本泄漏，从v2验证集移除并重新计算指标；或：图像模糊，建议重新采集" />
      <div style="margin-top: 8px; color: #e6a23c; font-size: 12px;">
        <el-icon><Warning /></el-icon> 禁止填写"正常通过"、"没问题"、"通过"等字样
      </div>
      <template #footer>
        <el-button @click="showResNote = false">取消</el-button>
        <el-button type="success" @click="submitResolve">提交解决</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Check, Warning } from '@element-plus/icons-vue'
import api from '../api'

const props = defineProps({ versionId: Number })
const router = useRouter()
const currentVersionId = inject('currentVersionId', ref(null))

const rows = ref([])
const typeStats = ref([])
const filterStatus = ref('')
const filterType = ref('')
const showAdd = ref(false)
const showResNote = ref(false)
const resolutionNote = ref('')
const resTarget = ref(null)
const reload = inject('reloadVersions', () => {})

const anomalyTypes = ['样本泄漏', '标注错误', '重复样本', '图像模糊', '脏数据', '其他']

const form = ref({ sample_id: '', anomaly_type: '样本泄漏', severity: 'normal', description: '' })

const parsedTypeStats = computed(() => {
  const map = {}
  typeStats.value.forEach(r => {
    if (!map[r.anomaly_type]) map[r.anomaly_type] = { anomaly_type: r.anomaly_type, open: 0, resolved: 0, total: 0 }
    map[r.anomaly_type][r.status] = r.count
    map[r.anomaly_type].total += r.count
  })
  return Object.values(map)
})

function severityTag(s) {
  return { low: 'info', normal: '', high: 'warning', critical: 'danger' }[s] || ''
}

async function load() {
  const vid = currentVersionId.value || props.versionId
  if (!vid) return
  try {
    const { data } = await api.getAnomalies(vid, {
      status: filterStatus.value || undefined,
      anomaly_type: filterType.value || undefined
    })
    rows.value = data.rows
    typeStats.value = data.typeStats || []
  } catch (e) {}
}

async function submitAdd() {
  const vid = currentVersionId.value || props.versionId
  try {
    await api.createAnomaly(vid, form.value)
    ElMessage.success('登记成功，已从正常指标排除该样本')
    showAdd.value = false
    form.value = { sample_id: '', anomaly_type: '样本泄漏', severity: 'normal', description: '' }
    load()
    reload()
  } catch (e) { ElMessage.error(e.response?.data?.error || '失败') }
}

function resolve(row) { resTarget.value = row; resolutionNote.value = ''; showResNote.value = true }
async function submitResolve() {
  if (!resolutionNote.value.trim()) return ElMessage.warning('请填写处理说明')
  if (/正常通过|没问题|通过|ok/i.test(resolutionNote.value)) {
    return ElMessage.warning('禁止填写"正常通过"等字样，请写具体处理方式')
  }
  try {
    await api.updateAnomaly(resTarget.value.id, {
      status: 'resolved', resolution_note: resolutionNote.value, resolved_by: 'AI产品-阿宁'
    })
    ElMessage.success('已解决，历史已记录')
    showResNote.value = false
    load()
    reload()
  } catch (e) {}
}

async function reopen(row) {
  try {
    await api.updateAnomaly(row.id, { status: 'open', resolved_by: 'AI产品-阿宁' })
    ElMessage.success('已重新打开')
    load()
  } catch (e) {}
}

function track(sid) { router.push(`/sample-track?id=${sid}`) }

watch(() => currentVersionId.value, load)
onMounted(load)
</script>
