<template>
  <div class="abnormal-page">
    <el-card class="tabs-card" shadow="never">
      <el-tabs v-model="activeTab" type="border-card" class="abnormal-tabs">
        <el-tab-pane label="口径冲突" name="conflict">
          <template #label>
            <span class="tab-label">
              <el-icon color="#f56c6c"><Warning /></el-icon>
              口径冲突
              <el-badge
                v-if="conflictGroups.length > 0"
                :value="conflictGroups.length"
                class="tab-badge"
                type="danger"
              />
            </span>
          </template>
          <div class="tab-content">
            <div class="list-stats">
              <el-alert
                :title="`共发现 ${conflictGroups.length} 组口径冲突，需人工确认最终口径`"
                type="warning"
                :closable="false"
                show-icon
                class="stats-alert"
              />
            </div>
            <div v-if="conflictGroups.length === 0" class="empty-wrapper">
              <el-empty description="暂无口径冲突，数据状态良好" />
            </div>
            <div v-else class="group-list">
              <el-card
                v-for="(group, idx) in conflictGroups"
                :key="idx"
                class="group-card"
                shadow="hover"
              >
                <div class="group-header">
                  <el-tag type="danger" effect="light" size="large">
                    冲突组 #{{ idx + 1 }}（{{ group.records?.length || 2 }} 条记录）
                  </el-tag>
                  <div class="group-actions">
                    <el-button type="warning" size="small" @click="openResolve(group)">
                      <el-icon><Edit /></el-icon> 选择最终口径
                    </el-button>
                  </div>
                </div>
                <el-row :gutter="16" class="group-compare">
                  <el-col :span="12" v-for="(rec, ri) in (group.records || [group.record_a, group.record_b])" :key="rec?.id || ri">
                    <div class="compare-item" :class="{ 'compare-main': ri === 0 }">
                      <div class="compare-title">
                        <el-tag :type="ri === 0 ? 'primary' : 'warning'" size="small">
                          记录 {{ ['A', 'B'][ri] }} · ID: {{ rec?.id }}
                        </el-tag>
                      </div>
                      <el-descriptions :column="1" size="small" border>
                        <el-descriptions-item label="社区">{{ rec?.community }}</el-descriptions-item>
                        <el-descriptions-item label="街道">{{ rec?.street }}</el-descriptions-item>
                        <el-descriptions-item label="路口">{{ rec?.intersection }}</el-descriptions-item>
                        <el-descriptions-item label="地址" :show-overflow-tooltip="true">{{ rec?.address }}</el-descriptions-item>
                        <el-descriptions-item label="时段">{{ rec?.time_period }}</el-descriptions-item>
                        <el-descriptions-item label="高峰类型">{{ rec?.peak_type }}</el-descriptions-item>
                        <el-descriptions-item label="投诉次数">{{ rec?.complaint_count || 0 }}</el-descriptions-item>
                        <el-descriptions-item label="场景标注">{{ rec?.scene_note }}</el-descriptions-item>
                        <el-descriptions-item label="统一备注">{{ rec?.unified_note }}</el-descriptions-item>
                      </el-descriptions>
                    </div>
                  </el-col>
                </el-row>
                <div v-if="group.diff_fields && group.diff_fields.length > 0" class="diff-fields">
                  <el-tag type="danger" effect="plain" size="small">冲突字段</el-tag>
                  <span class="diff-field-list">
                    {{ group.diff_fields.join('、') }}
                  </span>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="坐标挂起" name="suspended">
          <template #label>
            <span class="tab-label">
              <el-icon color="#e6a23c"><Clock /></el-icon>
              坐标挂起
              <el-badge
                v-if="suspendedRecords.length > 0"
                :value="suspendedRecords.length"
                class="tab-badge"
                type="warning"
              />
            </span>
          </template>
          <div class="tab-content">
            <div class="list-stats">
              <el-alert
                :title="`共 ${suspendedRecords.length} 条坐标验证挂起，需人工确认正确性`"
                type="warning"
                :closable="false"
                show-icon
                class="stats-alert"
              />
            </div>
            <el-table
              v-loading="loading"
              :data="suspendedRecords"
              stripe
              border
              style="width: 100%"
            >
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column prop="community" label="社区" min-width="110" />
              <el-table-column prop="street" label="街道" min-width="110" />
              <el-table-column prop="intersection" label="路口" min-width="140" />
              <el-table-column prop="address" label="详细地址" min-width="200" show-overflow-tooltip />
              <el-table-column label="经度" width="120" align="center">
                <template #default="{ row }">
                  <span class="mono-text">{{ row.longitude ?? '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="纬度" width="120" align="center">
                <template #default="{ row }">
                  <span class="mono-text">{{ row.latitude ?? '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="疑似问题" min-width="160">
                <template #default="{ row }">
                  <el-tag v-if="row.coord_note" type="warning" size="small" effect="plain">
                    {{ row.coord_note }}
                  </el-tag>
                  <span v-else style="color:#909399;">-</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="220" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button
                    type="success"
                    size="small"
                    :icon="CircleCheck"
                    :loading="row._confirming"
                    @click="confirmCoord(row, true)"
                  >
                    坐标正确
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    :icon="CircleClose"
                    :loading="row._confirming"
                    @click="confirmCoord(row, false)"
                  >
                    坐标错误
                  </el-button>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="暂无坐标挂起记录" />
              </template>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="坏数据" name="bad">
          <template #label>
            <span class="tab-label">
              <el-icon color="#f56c6c"><CircleClose /></el-icon>
              坏数据
              <el-badge
                v-if="badRecords.length > 0"
                :value="badRecords.length"
                class="tab-badge"
                type="danger"
                effect="dark"
              />
            </span>
          </template>
          <div class="tab-content">
            <div class="list-stats">
              <el-alert
                :title="`共 ${badRecords.length} 条坏数据，需人工审核并标记处理`"
                type="error"
                :closable="false"
                show-icon
                class="stats-alert"
              />
            </div>
            <el-table
              v-loading="loading"
              :data="badRecords"
              stripe
              border
              style="width: 100%"
            >
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column prop="community" label="社区" min-width="110" />
              <el-table-column prop="intersection" label="路口" min-width="140" />
              <el-table-column label="坏数据标签" min-width="200">
                <template #default="{ row }">
                  <el-tag
                    v-for="tag in (row.bad_tags || [row.bad_data_tag]).filter(Boolean)"
                    :key="tag"
                    type="danger"
                    effect="plain"
                    size="small"
                    style="margin-right: 6px; margin-bottom: 4px;"
                  >
                    {{ tag }}
                  </el-tag>
                  <span v-if="(!row.bad_tags || row.bad_tags.length === 0) && !row.bad_data_tag" style="color:#909399;">-</span>
                </template>
              </el-table-column>
              <el-table-column label="源文件" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ (row.sources && row.sources[0]?.source_file) || row.source_file || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="行号" width="100" align="center">
                <template #default="{ row }">
                  <span class="mono-text">{{ (row.sources && row.sources[0]?.line_number) || row.line_number || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="!row.processed"
                    type="success"
                    size="small"
                    :icon="Check"
                    :loading="row._processing"
                    @click="markProcessed(row)"
                  >
                    标记已处理
                  </el-button>
                  <el-tag v-else type="success" effect="light" size="small">
                    <el-icon><CircleCheck /></el-icon> 已处理
                  </el-tag>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="暂无坏数据记录" />
              </template>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog
      v-model="resolveVisible"
      title="选择最终口径"
      width="1100px"
      :close-on-click-modal="false"
      class="resolve-dialog"
    >
      <div class="resolve-hint">
        <el-alert
          title="请为每个冲突字段选择要保留的最终值。系统将用选择的字段覆盖另一条记录。"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>
      <div v-if="resolveGroup">
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="resolve-col-title">
              <el-tag type="primary" size="large">记录 A · ID: {{ resolveGroup.records?.[0]?.id || resolveGroup.record_a?.id }}</el-tag>
              <el-radio
                v-model="resolveKeepAll"
                value="a"
                class="keep-all-radio"
                @change="applyKeepAll('a')"
              >全部选 A</el-radio>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="resolve-col-title" style="justify-content: flex-end;">
              <el-radio
                v-model="resolveKeepAll"
                value="b"
                class="keep-all-radio"
                @change="applyKeepAll('b')"
              >全部选 B</el-radio>
              <el-tag type="warning" size="large">记录 B · ID: {{ resolveGroup.records?.[1]?.id || resolveGroup.record_b?.id }}</el-tag>
            </div>
          </el-col>
        </el-row>
        <el-divider />
        <div class="field-list">
          <div
            v-for="field in fieldDefs"
            :key="field.key"
            class="field-row"
            :class="{ 'is-conflict': isConflict(field.key) }"
          >
            <div class="field-label">
              <span>{{ field.label }}</span>
              <el-tag v-if="isConflict(field.key)" type="danger" effect="plain" size="small">冲突</el-tag>
            </div>
            <div class="field-values">
              <div
                class="field-value choice-a"
                :class="{ selected: resolveFields[field.key] === 'a' }"
                @click="resolveFields[field.key] = 'a'"
              >
                <el-radio v-model="resolveFields[field.key]" value="a">
                  <span class="field-content">{{ getFieldVal(0, field.key) || '<空>' }}</span>
                </el-radio>
              </div>
              <div class="field-arrow">
                <el-icon color="#e6a23c"><Switch /></el-icon>
              </div>
              <div
                class="field-value choice-b"
                :class="{ selected: resolveFields[field.key] === 'b' }"
                @click="resolveFields[field.key] = 'b'"
              >
                <el-radio v-model="resolveFields[field.key]" value="b">
                  <span class="field-content">{{ getFieldVal(1, field.key) || '<空>' }}</span>
                </el-radio>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" :loading="resolveLoading" @click="submitResolve">
          确认选择并解决冲突
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  Warning, Clock, CircleCheck, CircleClose, Check,
  Edit, Switch
} from '@element-plus/icons-vue'
import { useRecordsStore } from '@/store/records'
import {
  consistencyResolve,
  coordConfirm,
  updateRecord,
  getRecords,
  consistencyScan
} from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useRecordsStore()

const activeTab = ref('conflict')
const loading = ref(false)

const conflictGroups = ref([])
const suspendedRecords = ref([])
const badRecords = ref([])

const resolveVisible = ref(false)
const resolveLoading = ref(false)
const resolveGroup = ref(null)
const resolveKeepAll = ref('')
const resolveFields = reactive({})

const fieldDefs = [
  { key: 'community', label: '社区' },
  { key: 'street', label: '街道' },
  { key: 'intersection', label: '路口' },
  { key: 'address', label: '详细地址' },
  { key: 'time_period', label: '时段' },
  { key: 'peak_type', label: '高峰类型' },
  { key: 'scene_note', label: '场景标注' },
  { key: 'complaint_count', label: '投诉次数' },
  { key: 'unified_note', label: '统一备注' }
]

const loadData = async () => {
  loading.value = true
  try {
    const res = await getRecords({ page: 1, page_size: 5000 })
    const all = res.items || res.data || res || []
    conflictGroups.value = []
    suspendedRecords.value = []
    badRecords.value = []
    const seenConflictPairs = new Set()
    for (const r of all) {
      if (r.status === 'conflict') {
        const pairId = [r.id, r.conflict_with_id].filter(Boolean).sort((a, b) => a - b).join('-')
        if (pairId && !seenConflictPairs.has(pairId)) {
          seenConflictPairs.add(pairId)
          let other = null
          if (r.conflict_with_id) {
            other = all.find(x => x.id === r.conflict_with_id) || r.conflict_with || null
          } else if (r.conflict_with) {
            other = typeof r.conflict_with === 'object' ? r.conflict_with : all.find(x => x.id === r.conflict_with)
          }
          if (other) {
            conflictGroups.value.push({
              records: [r, other],
              diff_fields: r.diff_fields || r.conflict_fields || [],
              record_a: r,
              record_b: other
            })
          }
        }
      }
      if (r.coord_status === 'suspended') {
        suspendedRecords.value.push(r)
      }
      if (r.status === 'bad_data') {
        badRecords.value.push({ ...r, processed: !!r.bad_processed })
      }
    }
  } catch (e) {
    try {
      await consistencyScan()
    } catch (_) {}
  } finally {
    loading.value = false
  }
}

const openResolve = (group) => {
  resolveGroup.value = group
  resolveKeepAll.value = ''
  Object.keys(resolveFields).forEach(k => delete resolveFields[k])
  for (const f of fieldDefs) {
    resolveFields[f.key] = getFieldVal(0, f.key) === getFieldVal(1, f.key) ? 'a' : 'a'
  }
  resolveVisible.value = true
}

const getFieldVal = (idx, key) => {
  const records = resolveGroup.value?.records || [resolveGroup.value?.record_a, resolveGroup.value?.record_b]
  return records?.[idx]?.[key] ?? ''
}

const isConflict = (key) => {
  const diff = resolveGroup.value?.diff_fields
  if (diff && diff.length > 0) return diff.includes(key)
  return getFieldVal(0, key) !== getFieldVal(1, key)
}

const applyKeepAll = (val) => {
  for (const f of fieldDefs) {
    resolveFields[f.key] = val
  }
}

const submitResolve = async () => {
  const records = resolveGroup.value?.records || [resolveGroup.value?.record_a, resolveGroup.value?.record_b]
  if (!records || records.length < 2) return
  const fields = {}
  for (const [k, v] of Object.entries(resolveFields)) {
    fields[k] = getFieldVal(v === 'a' ? 0 : 1, k)
  }
  resolveLoading.value = true
  try {
    const aId = records[0].id
    const bId = records[1].id
    await consistencyResolve(aId, bId, fields)
    ElMessage.success('口径冲突已解决')
    resolveVisible.value = false
    await loadData()
    store.fetchStatistics()
  } finally {
    resolveLoading.value = false
  }
}

const confirmCoord = async (row, correct) => {
  try {
    await ElMessageBox.confirm(
      `确认坐标${correct ? '正确' : '错误'}？此操作将更新记录的坐标状态。`,
      '坐标人工确认',
      {
        type: 'warning',
        confirmButtonText: `标记${correct ? '正确' : '错误'}`,
        cancelButtonText: '取消'
      }
    )
  } catch (_) {
    return
  }
  row._confirming = true
  try {
    await coordConfirm(row.id, {
      correct,
      longitude: row.longitude,
      latitude: row.latitude
    })
    ElMessage.success(`坐标已标记为${correct ? '正确' : '错误'}`)
    await loadData()
    store.fetchStatistics()
  } finally {
    row._confirming = false
  }
}

const markProcessed = async (row) => {
  row._processing = true
  try {
    await updateRecord(row.id, {
      status: 'normal',
      bad_processed: true
    })
    row.processed = true
    ElMessage.success('已标记为已处理')
    setTimeout(() => {
      const idx = badRecords.value.findIndex(r => r.id === row.id)
      if (idx !== -1) badRecords.value.splice(idx, 1)
    }, 800)
    store.fetchStatistics()
  } finally {
    row._processing = false
  }
}

onMounted(() => {
  loadData()
  store.fetchStatistics()
})
</script>

<style scoped>
.abnormal-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tabs-card {
  border-radius: 12px;
  border: none;
}

.abnormal-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 8px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}

.tab-badge {
  margin-left: 4px;
}

.tab-content {
  padding-top: 16px;
}

.stats-alert {
  margin-bottom: 20px;
  border-radius: 8px;
}

.empty-wrapper {
  padding: 60px 0;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.group-card {
  border-radius: 10px;
  border: 1px solid #f56c6c55;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.group-compare {
  margin: 0;
}

.compare-item {
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.compare-title {
  margin-bottom: 10px;
}

.diff-fields {
  margin-top: 16px;
  padding: 12px;
  background: #fef0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.diff-field-list {
  color: #f56c6c;
  font-weight: 500;
}

.mono-text {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 13px;
}

.resolve-hint {
  margin-bottom: 20px;
}

.resolve-col-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.keep-all-radio {
  font-weight: 600;
  color: #409EFF;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 8px;
}

.field-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  transition: all 0.2s;
}

.field-row.is-conflict {
  background: #fff7f7;
  border-color: #f56c6c55;
}

.field-label {
  width: 110px;
  flex-shrink: 0;
  font-weight: 600;
  color: #303133;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  padding-top: 4px;
}

.field-values {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.field-value {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
  min-width: 0;
}

.field-value:hover {
  background: #f0f7ff;
}

.field-value.selected {
  border-color: #409EFF;
  background: #ecf5ff;
}

.field-content {
  word-break: break-all;
  color: #303133;
  font-size: 13px;
}

.field-arrow {
  flex-shrink: 0;
  padding: 8px;
  background: #fdf6ec;
  border-radius: 50%;
}
</style>
