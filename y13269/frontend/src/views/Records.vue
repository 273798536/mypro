<template>
  <div class="records-page">
    <el-card class="toolbar-card" shadow="never">
      <el-form :inline="true" :model="filters" class="toolbar-form">
        <el-form-item label="关键字">
          <el-input
            v-model="filters.keyword"
            placeholder="按社区、路口、地址搜索"
            clearable
            style="width: 260px"
            :prefix-icon="Search"
            @keyup.enter="doSearch"
          />
        </el-form-item>
        <el-form-item label="口径状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="正常" value="normal" />
            <el-option label="冲突" value="conflict" />
            <el-option label="挂起" value="suspended" />
            <el-option label="坏数据" value="bad_data" />
          </el-select>
        </el-form-item>
        <el-form-item label="坐标状态">
          <el-select v-model="filters.coord_status" placeholder="全部" clearable style="width: 140px">
            <el-option label="已验证" value="verified" />
            <el-option label="挂起" value="suspended" />
            <el-option label="未验证" value="unverified" />
          </el-select>
        </el-form-item>
        <el-form-item label="归并状态">
          <el-select v-model="filters.merge_status" placeholder="全部" clearable style="width: 140px">
            <el-option label="候选" value="candidate" />
            <el-option label="已归并" value="merged" />
            <el-option label="独立" value="independent" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="doSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
        <el-form-item class="action-btns">
          <el-button
            type="success"
            :icon="Location"
            :loading="batchLoading"
            :disabled="selectedRows.length === 0"
            @click="doCoordVerify"
          >
            坐标校验
          </el-button>
          <el-button
            type="warning"
            :icon="Warning"
            :loading="scanLoading"
            @click="doConsistencyScan"
          >
            扫描冲突
          </el-button>
          <el-button
            type="info"
            :icon="Share"
            :loading="mergeScanLoading"
            @click="doMergeScan"
          >
            扫描归并
          </el-button>
          <el-button
            type="primary"
            plain
            :icon="Download"
            :disabled="selectedRows.length > 0 ? false : false"
            @click="doExport"
          >
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="store.loading"
        :data="displayRecords"
        stripe
        border
        style="width: 100%"
        :row-class-name="rowClassName"
        @selection-change="handleSelectionChange"
        @row-dblclick="openDetail"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="70" align="center" fixed="left" />
        <el-table-column prop="community" label="社区" min-width="110" fixed="left">
          <template #default="{ row }">
            <span class="text-strong">{{ row.community }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="street" label="街道" min-width="110" />
        <el-table-column prop="intersection" label="路口" min-width="130" />
        <el-table-column prop="address" label="详细地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="time_period" label="时段" width="100" align="center" />
        <el-table-column prop="peak_type" label="高峰类型" width="100" align="center" />
        <el-table-column prop="scene_note" label="场景标注" min-width="120" show-overflow-tooltip />
        <el-table-column prop="complaint_count" label="投诉次数" width="100" align="center">
          <template #default="{ row }">
            <el-badge
              v-if="(row.complaint_count || 0) > 0"
              :value="row.complaint_count"
              :max="99"
              type="danger"
            >
              <span style="color: #f56c6c;">{{ row.complaint_count }}</span>
            </el-badge>
            <span v-else style="color: #909399;">0</span>
          </template>
        </el-table-column>
        <el-table-column label="坐标状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.coord_status === 'verified'" type="success" size="small" effect="light">已验证</el-tag>
            <el-tag v-else-if="row.coord_status === 'suspended'" type="warning" size="small">挂起</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">未验证</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="口径状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'normal'" type="success" size="small" effect="light">正常</el-tag>
            <el-tag v-else-if="row.status === 'conflict'" type="danger" size="small">冲突</el-tag>
            <el-tag v-else-if="row.status === 'suspended'" type="warning" size="small">挂起</el-tag>
            <el-tag v-else-if="row.status === 'bad_data'" type="danger" size="small" effect="plain">坏数据</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">-</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="归并状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.merge_status === 'candidate'" type="warning" size="small">候选</el-tag>
            <el-tag v-else-if="row.merge_status === 'merged'" type="info" size="small" effect="light">已归并</el-tag>
            <el-tag v-else type="success" size="small" effect="plain">独立</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              type="info"
              link
              size="small"
              :disabled="row.merge_status !== 'candidate'"
              @click="openMerge(row)"
            >
              归并
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无记录，请先上传数据" />
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="store.page"
          v-model:page-size="store.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="store.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="detailVisible"
      title="记录详情"
      width="960px"
      :close-on-click-modal="false"
      class="detail-dialog"
    >
      <div v-loading="store.detailLoading" class="detail-content">
        <template v-if="currentDetail">
          <el-descriptions :column="3" border class="info-section">
            <el-descriptions-item label="ID" :span="1">{{ currentDetail.id }}</el-descriptions-item>
            <el-descriptions-item label="社区" :span="1">{{ currentDetail.community }}</el-descriptions-item>
            <el-descriptions-item label="街道" :span="1">{{ currentDetail.street }}</el-descriptions-item>
            <el-descriptions-item label="路口" :span="1">{{ currentDetail.intersection }}</el-descriptions-item>
            <el-descriptions-item label="详细地址" :span="2">{{ currentDetail.address }}</el-descriptions-item>
            <el-descriptions-item label="时段" :span="1">{{ currentDetail.time_period }}</el-descriptions-item>
            <el-descriptions-item label="高峰类型" :span="1">{{ currentDetail.peak_type }}</el-descriptions-item>
            <el-descriptions-item label="投诉次数" :span="1">{{ currentDetail.complaint_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="场景标注" :span="2">{{ currentDetail.scene_note }}</el-descriptions-item>
            <el-descriptions-item label="统一备注" :span="1">{{ currentDetail.unified_note }}</el-descriptions-item>
            <el-descriptions-item label="口径状态" :span="1">
              <el-tag v-if="currentDetail.status === 'normal'" type="success" size="small">正常</el-tag>
              <el-tag v-else-if="currentDetail.status === 'conflict'" type="danger" size="small">冲突</el-tag>
              <el-tag v-else-if="currentDetail.status === 'suspended'" type="warning" size="small">挂起</el-tag>
              <el-tag v-else type="danger" effect="plain" size="small">坏数据</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="坐标状态" :span="1">
              <el-tag v-if="currentDetail.coord_status === 'verified'" type="success" size="small">已验证</el-tag>
              <el-tag v-else-if="currentDetail.coord_status === 'suspended'" type="warning" size="small">挂起</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">未验证</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="归并状态" :span="1">
              <el-tag v-if="currentDetail.merge_status === 'candidate'" type="warning" size="small">候选</el-tag>
              <el-tag v-else-if="currentDetail.merge_status === 'merged'" type="info" size="small">已归并</el-tag>
              <el-tag v-else type="success" size="small" effect="plain">独立</el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="currentDetail.sources && currentDetail.sources.length > 0" class="subsection">
            <div class="subsection-title">
              <el-icon><Link /></el-icon> 溯源引用
            </div>
            <el-table :data="currentDetail.sources" size="small" border stripe>
              <el-table-column prop="source_file" label="源文件" min-width="200" show-overflow-tooltip />
              <el-table-column prop="line_number" label="行号" width="80" align="center" />
              <el-table-column prop="raw_content" label="原始内容" min-width="300" show-overflow-tooltip />
            </el-table>
          </div>

          <div v-if="conflictWith" class="subsection">
            <div class="subsection-title">
              <el-icon color="#f56c6c"><Warning /></el-icon> 冲突对方信息
            </div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="记录ID">{{ conflictWith.id }}</el-descriptions-item>
              <el-descriptions-item label="社区">{{ conflictWith.community }}</el-descriptions-item>
              <el-descriptions-item label="路口" :span="1">{{ conflictWith.intersection }}</el-descriptions-item>
              <el-descriptions-item label="地址" :span="1" :show-overflow-tooltip="true">{{ conflictWith.address }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div v-if="mergeCandidates && mergeCandidates.length > 0" class="subsection">
            <div class="subsection-title">
              <el-icon color="#e6a23c"><Share /></el-icon> 归并候选
            </div>
            <el-table :data="mergeCandidates" size="small" border stripe>
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column prop="community" label="社区" width="110" />
              <el-table-column prop="intersection" label="路口" min-width="130" />
              <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row }">
                  <el-button type="warning" link size="small" @click="openMergeByPair(currentDetail, row)">执行归并</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="warning" @click="openEdit(currentDetail)">编辑记录</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editVisible"
      title="编辑记录"
      width="720px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
        class="edit-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="社区" prop="community">
              <el-input v-model="editForm.community" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="街道" prop="street">
              <el-input v-model="editForm.street" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="路口" prop="intersection">
              <el-input v-model="editForm.intersection" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="详细地址" prop="address">
              <el-input v-model="editForm.address" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="时段">
              <el-input v-model="editForm.time_period" placeholder="例：7:00-9:00" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="高峰类型">
              <el-select v-model="editForm.peak_type" style="width: 100%" placeholder="请选择">
                <el-option label="早高峰" value="早高峰" />
                <el-option label="晚高峰" value="晚高峰" />
                <el-option label="全天" value="全天" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="投诉次数">
              <el-input-number v-model="editForm.complaint_count" :min="0" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="场景标注">
              <el-input v-model="editForm.scene_note" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="统一备注">
              <el-input v-model="editForm.unified_note" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">保存修改</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="mergeVisible"
      title="记录归并确认"
      width="1100px"
      :close-on-click-modal="false"
      class="merge-dialog"
    >
      <div class="merge-hint">
        <el-alert
          title="请选择要保留的记录，另一条记录的数据将被合并并删除"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>
      <el-row :gutter="20" class="merge-compare">
        <el-col :span="12">
          <el-card
            class="merge-card"
            :class="{ 'merge-selected': keepChoice === 'a' }"
            shadow="hover"
            @click="keepChoice = 'a'"
          >
            <template #header>
              <div class="merge-card-header">
                <el-radio v-model="keepChoice" label="a" class="merge-radio">保留此项（A）</el-radio>
                <el-tag type="primary" size="small">ID: {{ mergeRecordA?.id }}</el-tag>
              </div>
            </template>
            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="社区">{{ mergeRecordA?.community }}</el-descriptions-item>
              <el-descriptions-item label="街道">{{ mergeRecordA?.street }}</el-descriptions-item>
              <el-descriptions-item label="路口">{{ mergeRecordA?.intersection }}</el-descriptions-item>
              <el-descriptions-item label="地址">{{ mergeRecordA?.address }}</el-descriptions-item>
              <el-descriptions-item label="时段">{{ mergeRecordA?.time_period }}</el-descriptions-item>
              <el-descriptions-item label="高峰类型">{{ mergeRecordA?.peak_type }}</el-descriptions-item>
              <el-descriptions-item label="投诉次数">{{ mergeRecordA?.complaint_count || 0 }}</el-descriptions-item>
              <el-descriptions-item label="场景标注">{{ mergeRecordA?.scene_note }}</el-descriptions-item>
              <el-descriptions-item label="统一备注">{{ mergeRecordA?.unified_note }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card
            class="merge-card"
            :class="{ 'merge-selected': keepChoice === 'b' }"
            shadow="hover"
            @click="keepChoice = 'b'"
          >
            <template #header>
              <div class="merge-card-header">
                <el-radio v-model="keepChoice" label="b" class="merge-radio">保留此项（B）</el-radio>
                <el-tag type="warning" size="small">ID: {{ mergeRecordB?.id }}</el-tag>
              </div>
            </template>
            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="社区">{{ mergeRecordB?.community }}</el-descriptions-item>
              <el-descriptions-item label="街道">{{ mergeRecordB?.street }}</el-descriptions-item>
              <el-descriptions-item label="路口">{{ mergeRecordB?.intersection }}</el-descriptions-item>
              <el-descriptions-item label="地址">{{ mergeRecordB?.address }}</el-descriptions-item>
              <el-descriptions-item label="时段">{{ mergeRecordB?.time_period }}</el-descriptions-item>
              <el-descriptions-item label="高峰类型">{{ mergeRecordB?.peak_type }}</el-descriptions-item>
              <el-descriptions-item label="投诉次数">{{ mergeRecordB?.complaint_count || 0 }}</el-descriptions-item>
              <el-descriptions-item label="场景标注">{{ mergeRecordB?.scene_note }}</el-descriptions-item>
              <el-descriptions-item label="统一备注">{{ mergeRecordB?.unified_note }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
      <template #footer>
        <el-button @click="mergeVisible = false">取消</el-button>
        <el-button type="warning" :loading="proposeLoading" @click="doMergePropose">预览归并结果</el-button>
        <el-button type="primary" :loading="mergeLoading" @click="doShareExecute">确认执行归并</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh, Location, Warning, Share, Download } from '@element-plus/icons-vue'
import { useRecordsStore } from '@/store/records'
import {
  coordVerify,
  consistencyScan,
  mergeScan,
  mergePropose,
  mergeExecute,
  exportExcel,
  getRecord
} from '@/api'
import { ElMessage, ElMessageBox, ElForm } from 'element-plus'

const route = useRoute()
const router = useRouter()
const store = useRecordsStore()

const filters = reactive({
  keyword: '',
  status: '',
  coord_status: '',
  merge_status: ''
})

const selectedRows = ref([])
const batchLoading = ref(false)
const scanLoading = ref(false)
const mergeScanLoading = ref(false)
const editLoading = ref(false)
const proposeLoading = ref(false)
const mergeLoading = ref(false)

const detailVisible = ref(false)
const editVisible = ref(false)
const mergeVisible = ref(false)

const currentDetail = ref(null)
const conflictWith = ref(null)
const mergeCandidates = ref([])

const editForm = reactive({
  id: null,
  community: '',
  street: '',
  intersection: '',
  address: '',
  time_period: '',
  peak_type: '',
  complaint_count: 0,
  scene_note: '',
  unified_note: ''
})

const editFormRef = ref()
const editRules = {
  community: [{ required: true, message: '请输入社区', trigger: 'blur' }],
  street: [{ required: true, message: '请输入街道', trigger: 'blur' }],
  intersection: [{ required: true, message: '请输入路口', trigger: 'blur' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

const mergeRecordA = ref(null)
const mergeRecordB = ref(null)
const keepChoice = ref('a')

const displayRecords = computed(() => store.list)

const rowClassName = ({ row }) => {
  if (row.status === 'conflict') return 'row-conflict'
  if (row.status === 'suspended') return 'row-suspended'
  if (row.status === 'bad_data') return 'row-bad'
  if (row.merge_status === 'candidate') return 'row-merge'
  return ''
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
  store.setSelectedIds(rows.map(r => r.id))
}

const handlePageChange = (p) => {
  store.setPage(p)
  loadRecords()
}

const handleSizeChange = (size) => {
  store.setPageSize(size)
  store.setPage(1)
  loadRecords()
}

const loadRecords = async () => {
  const params = {}
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.status) params.status = filters.status
  if (filters.coord_status) params.coord_status = filters.coord_status
  if (filters.merge_status) params.merge_status = filters.merge_status
  try {
    await store.fetchRecords(params)
  } catch (e) {
    // error handled by interceptor
  }
}

const doSearch = () => {
  store.setPage(1)
  loadRecords()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.status = ''
  filters.coord_status = ''
  filters.merge_status = ''
  store.setPage(1)
  loadRecords()
}

const doCoordVerify = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要校验的记录')
    return
  }
  batchLoading.value = true
  try {
    const ids = selectedRows.value.map(r => r.id)
    const res = await coordVerify(ids)
    ElMessage.success(`坐标校验完成：${res.verified || 0} 通过，${res.suspended || 0} 挂起`)
    loadRecords()
    store.fetchStatistics()
  } finally {
    batchLoading.value = false
  }
}

const doConsistencyScan = async () => {
  scanLoading.value = true
  try {
    const res = await consistencyScan()
    ElMessage.success(`口径冲突扫描完成，发现 ${res.conflicts_found || res.count || 0} 组冲突`)
    loadRecords()
    store.fetchStatistics()
  } finally {
    scanLoading.value = false
  }
}

const doShareScan = async () => {
  mergeScanLoading.value = true
  try {
    const res = await mergeScan()
    ElMessage.success(`归并扫描完成，发现 ${res.candidates_found || res.count || 0} 组归并候选`)
    loadRecords()
    store.fetchStatistics()
  } finally {
    mergeScanLoading.value = false
  }
}

const doExport = async () => {
  try {
    const ids = selectedRows.value.length > 0 ? selectedRows.value.map(r => r.id) : null
    const blob = await exportExcel(ids)
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `社区充电清单_${Date.now()}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    // handled
  }
}

const openDetail = async (row) => {
  if (!row) return
  detailVisible.value = true
  currentDetail.value = row
  conflictWith.value = null
  mergeCandidates.value = []
  try {
    const detail = await getRecord(row.id)
    const data = detail.data || detail
    currentDetail.value = data
    if (data.conflict_with) {
      if (typeof data.conflict_with === 'object' && !Array.isArray(data.conflict_with)) {
        conflictWith.value = data.conflict_with
      } else if (Array.isArray(data.conflict_with) && data.conflict_with.length > 0) {
        conflictWith.value = data.conflict_with[0]
      }
    }
    if (data.merge_candidates) {
      mergeCandidates.value = Array.isArray(data.merge_candidates) ? data.merge_candidates : []
    } else if (data.merge_candidate_with) {
      mergeCandidates.value = Array.isArray(data.merge_candidate_with) ? data.merge_candidate_with : (data.merge_candidate_with ? [data.merge_candidate_with] : [])
    }
  } catch (e) {
    // handled
  }
}

const openEdit = (row) => {
  if (!row) return
  detailVisible.value = false
  editVisible.value = true
  Object.assign(editForm, {
    id: row.id,
    community: row.community || '',
    street: row.street || '',
    intersection: row.intersection || '',
    address: row.address || '',
    time_period: row.time_period || '',
    peak_type: row.peak_type || '',
    complaint_count: row.complaint_count || 0,
    scene_note: row.scene_note || '',
    unified_note: row.unified_note || ''
  })
}

const submitEdit = async () => {
  if (!editFormRef.value) return
  try {
    await editFormRef.value.validate()
  } catch (_) {
    return
  }
  editLoading.value = true
  try {
    const { id, ...data } = editForm
    await store.updateRecord(id, data)
    ElMessage.success('记录已更新')
    editVisible.value = false
    store.fetchStatistics()
  } finally {
    editLoading.value = false
  }
}

const openShare = async (row) => {
  if (!row) return
  let other = null
  try {
    const detail = await getRecord(row.id)
    const data = detail.data || detail
    if (data.merge_candidates && data.merge_candidates.length > 0) {
      other = data.merge_candidates[0]
    } else if (data.merge_candidate_with) {
      other = Array.isArray(data.merge_candidate_with) ? data.merge_candidate_with[0] : data.merge_candidate_with
    }
  } catch (_) {}
  if (!other) {
    ElMessage.warning('未找到归并配对记录')
    return
  }
  openMergeByPair(row, other)
}

const openShareByPair = (a, b) => {
  detailVisible.value = false
  mergeRecordA.value = a
  mergeRecordB.value = b
  keepChoice.value = 'a'
  mergeVisible.value = true
}

const doMergePropose = async () => {
  if (!mergeRecordA.value || !mergeRecordB.value) return
  const keep = keepChoice.value === 'a' ? mergeRecordA.value.id : mergeRecordB.value.id
  const remove = keepChoice.value === 'a' ? mergeRecordB.value.id : mergeRecordA.value.id
  proposeLoading.value = true
  try {
    const res = await mergePropose(keep, remove)
    ElMessage.success('归并预览已生成，请检查后点击确认执行')
  } finally {
    proposeLoading.value = false
  }
}

const doShareExecute = async () => {
  if (!mergeRecordA.value || !mergeRecordB.value) return
  try {
    await ElMessageBox.confirm('归并操作不可撤销，确认执行吗？', '归并确认', {
      type: 'warning',
      confirmButtonText: '确认归并',
      cancelButtonText: '取消'
    })
  } catch (_) {
    return
  }
  const keep = keepChoice.value === 'a' ? mergeRecordA.value.id : mergeRecordB.value.id
  const remove = keepChoice.value === 'a' ? mergeRecordB.value.id : mergeRecordA.value.id
  mergeLoading.value = true
  try {
    await mergeExecute(keep, remove)
    ElMessage.success('归并完成')
    mergeVisible.value = false
    loadRecords()
    store.fetchStatistics()
  } finally {
    mergeLoading.value = false
  }
}

onMounted(() => {
  loadRecords()
  store.fetchStatistics()
  if (route.query.id) {
    const id = route.query.id
    const found = store.list.find(r => String(r.id) === String(id))
    if (found) {
      setTimeout(() => openDetail(found), 300)
    } else {
      getRecord(id).then(res => {
        openDetail(res.data || res)
      }).catch(() => {})
    }
  }
})

watch(() => route.query.id, (newId) => {
  if (newId && !detailVisible.value) {
    getRecord(newId).then(res => openDetail(res.data || res)).catch(() => {})
  }
})
</script>

<style scoped>
.records-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar-card,
.table-card {
  border-radius: 12px;
  border: none;
}

.toolbar-form {
  margin: 0;
}

.action-btns {
  margin-left: auto;
}

.text-strong {
  font-weight: 600;
  color: #303133;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
}

.subsection {
  margin-top: 24px;
}

.subsection-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-section {
  margin-bottom: 0;
}

.detail-content {
  padding: 4px;
}

.merge-hint {
  margin-bottom: 20px;
}

.merge-compare {
  margin: 0;
}

.merge-card {
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 10px;
}

.merge-card.merge-selected {
  border: 2px solid #409EFF;
  background-color: #ecf5ff;
}

.merge-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.merge-radio {
  font-weight: 600;
}

:deep(.el-table .row-conflict) {
  background-color: #fef0f0 !important;
}

:deep(.el-table .row-conflict:hover > td) {
  background-color: #fde2e2 !important;
}

:deep(.el-table .row-suspended) {
  background-color: #fdf6ec !important;
}

:deep(.el-table .row-suspended:hover > td) {
  background-color: #faecd8 !important;
}

:deep(.el-table .row-bad) {
  background-color: #fff7e6 !important;
}

:deep(.el-table .row-bad:hover > td) {
  background-color: #ffedd5 !important;
}

:deep(.el-table .row-merge) {
  background-color: #f3e8ff !important;
}

:deep(.el-table .row-merge:hover > td) {
  background-color: #e9d5ff !important;
}
</style>
