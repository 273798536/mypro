<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>人工修正 - 复核入口</h2>
      <div style="display: flex; gap: 8px;">
        <el-upload
          :show-file-list="false"
          accept=".json,.csv"
          :before-upload="handleBatchFile"
        >
          <el-button size="small" type="success" :icon="Upload">批量导入排班修正</el-button>
        </el-upload>
        <el-button size="small" :icon="Plus" @click="showAdd = true">新增单条</el-button>
      </div>
    </div>

    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="6">
        <el-card shadow="hover"><div style="text-align:center;">
          <div style="font-size: 12px; color: #909399;">待复核</div>
          <div style="font-size: 24px; color: #e6a23c; font-weight: 600;">{{ statusStats.pending || 0 }}</div>
        </div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover"><div style="text-align:center;">
          <div style="font-size: 12px; color: #909399;">已确认</div>
          <div style="font-size: 24px; color: #67c23a; font-weight: 600;">{{ statusStats.confirmed || 0 }}</div>
        </div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover"><div style="text-align:center;">
          <div style="font-size: 12px; color: #909399;">已驳回</div>
          <div style="font-size: 24px; color: #f56c6c; font-weight: 600;">{{ statusStats.rejected || 0 }}</div>
        </div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover"><div style="text-align:center;">
          <div style="font-size: 12px; color: #909399;">来源数</div>
          <div style="font-size: 24px; color: #409EFF; font-weight: 600;">{{ Object.keys(sourceStats).length }}</div>
        </div></el-card>
      </el-col>
    </el-row>

    <div class="card-section">
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
        <el-select v-model="filterStatus" placeholder="按状态筛选" clearable style="width: 140px;" @change="load">
          <el-option label="待复核" value="pending" />
          <el-option label="已确认" value="confirmed" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        <el-select v-model="filterSource" placeholder="按来源筛选" clearable style="width: 180px;" @change="load">
          <el-option v-for="(v, k) in sourceStats" :key="k" :label="`${k} (${v})`" :value="k" />
        </el-select>
        <el-input v-model="searchSample" placeholder="输入样本ID搜索" clearable style="width: 180px;" @keyup.enter="load" />
        <el-tag type="info" effect="plain" style="margin-left: auto;">
          保住字段：<b style="color:#e6a23c;">source(来源)</b>、<b style="color:#e6a23c;">status(处理状态)</b>
        </el-tag>
      </div>
      <el-table :data="filteredRows" size="small" border stripe>
        <el-table-column prop="sample_id" label="样本ID" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="track(row.sample_id)">{{ row.sample_id }}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="类别变化" width="170">
          <template #default="{ row }">
            <div style="font-size: 12px;">
              <div>前: <span style="color:#f56c6c;">{{ row.category_before || '-' }}</span></div>
              <div>后: <span style="color:#67c23a;">{{ row.category_after || '-' }}</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="来源 (source)" width="150">
          <template #default="{ row }">
            <el-tag size="small" type="primary" effect="plain">{{ row.source || 'unknown' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态 (status)" width="110">
          <template #default="{ row }">
            <span :class="`status-${row.status}`">{{ statusLabel(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="corrected_by" label="排班人" width="100" />
        <el-table-column prop="corrected_at" label="提交时间" width="160" />
        <el-table-column label="原始字段" width="90">
          <template #default="{ row }">
            <el-button link type="info" size="small" @click="showRaw(row)">查看</el-button>
          </template>
        </el-table-column>
        <el-table-column label="复核操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button size="small" type="success" :icon="Check" @click="confirm(row)">确认</el-button>
              <el-button size="small" type="danger" :icon="Close" @click="reject(row)">驳回</el-button>
            </template>
            <template v-else>
              <el-button size="small" link type="primary" @click="reset(row)">重置待复核</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 12px; text-align: right;"
        v-model:current-page="page" v-model:page-size="pageSize" :total="total"
        layout="total, sizes, prev, pager, next, jumper" @size-change="load" @current-change="load" />
    </div>

    <el-dialog v-model="showAdd" title="新增人工修正" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="样本ID"><el-input v-model="form.sample_id" placeholder="如 SAMPLE-00023" /></el-form-item>
        <el-form-item label="原始类别"><el-input v-model="form.category_before" /></el-form-item>
        <el-form-item label="修正后类别"><el-input v-model="form.category_after" /></el-form-item>
        <el-form-item label="来源 (source)">
          <el-input v-model="form.source" placeholder="保住此字段，如：排班A组-早班" />
        </el-form-item>
        <el-form-item label="处理状态 (status)">
          <el-select v-model="form.status" style="width:100%;">
            <el-option label="待复核" value="pending" />
            <el-option label="已确认" value="confirmed" />
          </el-select>
        </el-form-item>
        <el-form-item label="排班人"><el-input v-model="form.corrected_by" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showNote" title="复核意见" width="460px">
      <el-form label-width="80px">
        <el-form-item label="意见"><el-input v-model="reviewNote" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNote = false">取消</el-button>
        <el-button :type="noteAction === 'confirm' ? 'success' : 'danger'" @click="submitReview">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRawDialog" title="原始提交 payload（字段兼容）" width="560px">
      <pre style="background: #f5f7fa; padding: 12px; border-radius: 6px; max-height: 400px; overflow: auto;">{{ rawPayload }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Check, Close } from '@element-plus/icons-vue'
import api from '../api'

const props = defineProps({ versionId: Number })
const router = useRouter()
const currentVersionId = inject('currentVersionId', ref(null))

const rows = ref([])
const total = ref(0)
const statusStats = ref({})
const sourceStats = ref({})
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const filterSource = ref('')
const searchSample = ref('')
const showAdd = ref(false)
const showNote = ref(false)
const noteAction = ref('')
const noteTarget = ref(null)
const reviewNote = ref('')
const showRawDialog = ref(false)
const rawPayload = ref('')
const reload = inject('reloadVersions', () => {})

const form = ref({ sample_id: '', category_before: '', category_after: '', source: '', status: 'pending', corrected_by: '' })

const filteredRows = computed(() => {
  let r = rows.value
  if (searchSample.value) r = r.filter(x => x.sample_id.includes(searchSample.value))
  return r
})

function statusLabel(s) {
  return { pending: '待复核', confirmed: '已确认', rejected: '已驳回', approved: '已确认' }[s] || s
}

async function load() {
  const vid = currentVersionId.value || props.versionId
  if (!vid) return
  try {
    const { data } = await api.getCorrections(vid, {
      status: filterStatus.value || undefined,
      source: filterSource.value || undefined,
      page: page.value, pageSize: pageSize.value
    })
    rows.value = data.rows
    total.value = data.total
    statusStats.value = data.statusStats || {}
    sourceStats.value = data.sourceStats || {}
  } catch (e) { /* ignore */ }
}

async function submitAdd() {
  const vid = currentVersionId.value || props.versionId
  try {
    await api.createCorrection(vid, form.value)
    ElMessage.success('提交成功')
    showAdd.value = false
    form.value = { sample_id: '', category_before: '', category_after: '', source: '', status: 'pending', corrected_by: '' }
    load()
    reload()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '失败')
  }
}

function confirm(row) { noteAction.value = 'confirm'; noteTarget.value = row; reviewNote.value = '阿宁复核通过'; showNote.value = true }
function reject(row) { noteAction.value = 'reject'; noteTarget.value = row; reviewNote.value = ''; showNote.value = true }

async function submitReview() {
  try {
    await api.updateCorrection(noteTarget.value.id, {
      status: noteAction.value === 'confirm' ? 'confirmed' : 'rejected',
      review_note: reviewNote.value,
      reviewed_by: 'AI产品-阿宁',
      category_after: noteTarget.value.category_after,
      category_before: noteTarget.value.category_before
    })
    ElMessage.success('处理完成，历史已记录')
    showNote.value = false
    load()
    reload()
  } catch (e) {
    ElMessage.error('失败')
  }
}

async function reset(row) {
  try {
    await api.updateCorrection(row.id, { status: 'pending', reviewed_by: 'AI产品-阿宁' })
    ElMessage.success('已重置为待复核')
    load()
  } catch (e) {}
}

function track(sid) { router.push(`/sample-track?id=${sid}`) }
function showRaw(row) { rawPayload.value = JSON.stringify(JSON.parse(row.raw_payload || '{}'), null, 2); showRawDialog.value = true }

function handleBatchFile(file) {
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      let items = []
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(reader.result)
        items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || [])
      } else {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim())
        const headers = lines[0].split(',')
        items = lines.slice(1).map(line => {
          const cols = line.split(',')
          const obj = {}
          headers.forEach((h, i) => obj[h.trim()] = cols[i]?.trim())
          return obj
        })
      }
      if (!items.length) return ElMessage.warning('文件无数据')
      const vid = currentVersionId.value || props.versionId
      const { data } = await api.batchImportCorrections({ version_id: vid, items })
      ElMessage.success(`导入：成功${data.success}条，失败${data.failed}条`)
      load()
      reload()
    } catch (e) {
      ElMessage.error('解析失败: ' + e.message)
    }
  }
  reader.readAsText(file)
  return false
}

watch(() => currentVersionId.value, () => { page.value = 1; load() })
onMounted(load)
</script>
