<template>
  <div v-if="loaded">
    <div class="page-header">
      <div>
        <el-button link @click="$router.back()" style="padding:0;margin-right:10px">
          <el-icon :size="18"><ArrowLeft /></el-icon>
        </el-button>
        <h2 style="display:inline-block;vertical-align:middle">
          <el-tag type="info" size="large" effect="plain" style="margin-right:10px">
            {{ detail.feedback_no }}
          </el-tag>
          <el-tag :class="`status-${detail.status}`" effect="light" size="large">
            {{ store.statusLabels[detail.status] || detail.status }}
          </el-tag>
          <span style="margin-left:10px;font-size:16px;color:#303133;font-weight:500">
            {{ detail.bridge_name || '（未标注桥名）' }}
          </span>
        </h2>
      </div>
      <div>
        <el-dropdown @command="handleStatusChange" trigger="click">
          <el-button type="primary">
            流转状态<el-icon style="margin-left:6px"><CaretBottom /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="(label, key) in store.statusLabels"
                :key="key"
                :command="key"
                :disabled="detail.status === key"
              >
                转至「{{ label }}」
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="success" @click="saveForm" style="margin-left:8px" :loading="saving">
          <el-icon><Check /></el-icon>保存修改
        </el-button>
      </div>
    </div>

    <div v-if="store.statusHints[detail.status]" class="action-hint">
      <el-icon style="margin-right:6px;vertical-align:middle;color:#3a8ee6"><InfoFilled /></el-icon>
      <b>当前状态：</b>{{ store.statusHints[detail.status] }}
    </div>

    <el-row :gutter="16">
      <el-col :span="17">
        <el-card shadow="never" style="margin-bottom:16px">
          <div class="section-title">
            <el-icon style="margin-right:4px"><EditPen /></el-icon>
            基本信息（左原始、右规范 — 原始永久保留不覆盖）
          </div>

          <el-form :model="form" label-width="100px" size="default">
            <div class="field-compare" style="margin-bottom:14px">
              <div class="original">
                <div class="field-label">
                  <el-tag type="warning" size="small" effect="light" style="margin-right:4px">原始</el-tag>
                  来源
                </div>
                <div style="font-size:14px">{{ form.original_source || '—' }}</div>
              </div>
              <div class="normalized">
                <div class="field-label">
                  <el-tag type="primary" size="small" effect="light" style="margin-right:4px">规范</el-tag>
                  桥梁名称
                </div>
                <el-input v-model="form.bridge_name" placeholder="规范后的桥梁名称" clearable />
              </div>
            </div>

            <div class="field-compare" style="margin-bottom:14px">
              <div class="original">
                <div class="field-label"><el-tag type="warning" size="small" effect="light" style="margin-right:4px">原始</el-tag>地点描述（居民原文）</div>
                <div style="font-size:13px;line-height:1.6;white-space:pre-wrap">{{ form.original_location || '—' }}</div>
                <div style="margin-top:6px;font-size:12px;color:#c0392b;font-style:italic">
                  ⚠ 此为居民原始写法，用于核对规范地点时比对，不要修改
                </div>
              </div>
              <div class="normalized">
                <div class="field-label"><el-tag type="primary" size="small" effect="light" style="margin-right:4px">规范</el-tag>规范地点（行政规范名）</div>
                <el-input v-model="form.normalized_location" type="textarea" :rows="2" placeholder="填写规范行政地址，如：XX区XX路XX号慢行桥南坡道" />
                <el-row :gutter="10" style="margin-top:8px">
                  <el-col :span="12">
                    <el-input v-model="form.lng" placeholder="经度" clearable />
                  </el-col>
                  <el-col :span="12">
                    <el-input v-model="form.lat" placeholder="纬度" clearable />
                  </el-col>
                </el-row>
              </div>
            </div>

            <div class="field-compare" style="margin-bottom:14px">
              <div class="original">
                <div class="field-label"><el-tag type="warning" size="small" effect="light" style="margin-right:4px">原始</el-tag>反馈内容（居民原文）</div>
                <div style="font-size:13px;line-height:1.7;white-space:pre-wrap">{{ form.original_content || '—' }}</div>
              </div>
              <div class="normalized">
                <div class="field-label"><el-tag type="primary" size="small" effect="light" style="margin-right:4px">规范</el-tag>影响范围</div>
                <el-input v-model="form.impact_scope" type="textarea" :rows="3" placeholder="涉及坡道长度、方向、日通行量、受影响人群比例等" />
              </div>
            </div>

            <el-divider style="margin:18px 0" />

            <div class="section-title" style="border-left-color:#67c23a">
              <el-icon style="margin-right:4px"><CollectionTag /></el-icon>
              复核处理信息（修改此处即同步后端和导出）
            </div>

            <el-form-item label="复核备注">
              <el-input v-model="form.review_remark" type="textarea" :rows="3"
                placeholder="现场核查情况、规范比对结果、设计参数等。修改后会留痕在操作日志。" />
            </el-form-item>

            <el-form-item label="容量结论">
              <el-input v-model="form.capacity_conclusion" type="textarea" :rows="3"
                placeholder="最终复核结论：是否满足容量要求、是否需要改造、改造建议。写入导出报告。" />
            </el-form-item>

            <el-form-item label="处理人">
              <el-input v-model="form.handler" :placeholder="store.operator" />
            </el-form-item>

            <el-form-item label="领导问询">
              <el-input v-model="form.leader_inquiry" type="textarea" :rows="2"
                placeholder="领导询问的问题和日期，留痕备查。例：张局6月10日询问：是否可与河道整治项目合并？" />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" style="margin-bottom:16px">
          <div class="section-title">
            <el-icon style="margin-right:4px"><Link /></el-icon>
            归并关系（同一地点不同写法合并后保留证据）
          </div>
          <div v-if="mergeRelations.length === 0" style="color:#909399;font-size:13px;padding:8px 4px">
            暂无归并记录。如发现该地点与其他记录重复，请到「重复归并中心」处理。
          </div>
          <div v-else>
            <div v-for="rel in mergeRelations" :key="rel.id"
              style="padding:10px;border:1px solid #ebeef5;border-radius:6px;margin-bottom:8px;background:#fafafa">
              <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px">
                <el-tag v-if="rel.merged_from_id === detail.id" type="info" effect="dark">本记录已被归并</el-tag>
                <el-tag v-else type="success" effect="dark">本记录吸收归并</el-tag>
                <span v-if="rel.merged_from_id === detail.id">
                  → <b>{{ rel.to_feedback_no }}</b>
                </span>
                <span v-else>
                  ← <b>{{ rel.from_feedback_no }}</b>
                </span>
                <el-button link type="primary" size="small"
                  @click="$router.push(`/feedbacks/${rel.merged_from_id === detail.id ? rel.merged_to_id : rel.merged_from_id}`)">
                  跳转查看
                </el-button>
              </div>
              <div v-if="rel.merge_reason" style="font-size:12px;color:#606266">
                <b>归并理由：</b>{{ rel.merge_reason }}
              </div>
              <div v-if="rel.merge_evidence" style="font-size:12px;color:#8b4513;margin-top:3px">
                <b>证据：</b>{{ rel.merge_evidence }}
              </div>
              <div style="font-size:12px;color:#909399;margin-top:3px">
                操作人：{{ rel.merged_by || '—' }} · {{ formatTime(rel.created_at) }}
              </div>
            </div>
          </div>
        </el-card>

        <el-card shadow="never">
          <div class="section-title">
            <el-icon style="margin-right:4px"><Paperclip /></el-icon>
            证据材料清单（补充后可转「可放行」）
          </div>
          <el-form :inline="true" :model="evidenceForm" @submit.prevent style="margin-bottom:10px">
            <el-form-item>
              <el-select v-model="evidenceForm.evidence_type" placeholder="类型" style="width:140px">
                <el-option label="设计图纸" value="设计图纸" />
                <el-option label="现场照片" value="现场照片" />
                <el-option label="测量数据" value="测量数据" />
                <el-option label="居民签字" value="居民签字" />
                <el-option label="会议纪要" value="会议纪要" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
            <el-form-item style="flex:1">
              <el-input v-model="evidenceForm.evidence_desc" placeholder="证据描述，如：坡道坡度实测照片（8.2%超规范）" style="width:100%" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="evidenceForm.file_name" placeholder="文件名（可选）" style="width:180px" />
            </el-form-item>
            <el-form-item>
              <el-button type="success" @click="addEvidence">
                <el-icon><Plus /></el-icon>补充证据
              </el-button>
            </el-form-item>
          </el-form>
          <el-table :data="evidences" size="default" v-if="evidences.length > 0">
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="success" effect="light">{{ row.evidence_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="evidence_desc" label="证据描述" />
            <el-table-column prop="file_name" label="文件" width="160" show-overflow-tooltip />
            <el-table-column prop="uploaded_by" label="录入人" width="90" />
            <el-table-column label="时间" width="150">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
          <div v-else style="color:#f56c6c;padding:10px;font-size:13px;background:#fff8f8;border-radius:6px">
            ⚠ 暂无补充证据材料。请补充设计图、照片、测量数据等，材料齐全后可转「可放行」。
          </div>
        </el-card>
      </el-col>

      <el-col :span="7">
        <el-card shadow="never" style="margin-bottom:16px">
          <div class="section-title">
            <el-icon style="margin-right:4px"><User /></el-icon>
            居民原始信息
          </div>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="反映人">{{ form.original_reporter || '—' }}</el-descriptions-item>
            <el-descriptions-item label="联系方式">{{ form.original_contact || '—' }}</el-descriptions-item>
            <el-descriptions-item label="反馈日期">{{ form.original_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="来源">{{ form.original_source || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(detail.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ formatTime(detail.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="never" style="margin-bottom:16px">
          <div class="section-title">
            <el-icon style="margin-right:4px"><Notebook /></el-icon>
            操作日志（全量溯源，不可删除）
          </div>
          <el-timeline v-if="logs.length > 0" class="log-timeline">
            <el-timeline-item
              v-for="log in logs"
              :key="log.id"
              :type="timelineColor(log.action)"
              :timestamp="formatTime(log.created_at)"
              placement="top"
            >
              <div style="font-size:13px;line-height:1.6">
                <div>
                  <el-tag size="small" effect="plain" :type="timelineColor(log.action)">
                    {{ actionLabel(log.action) }}
                  </el-tag>
                  <span style="margin-left:6px;color:#909399;font-size:12px">{{ log.operator || 'system' }}</span>
                </div>
                <div v-if="log.field_changed" style="margin-top:4px;color:#303133">
                  <b>字段：</b>{{ log.field_changed }}
                </div>
                <div v-if="log.old_value !== undefined && log.old_value !== ''" style="margin-top:2px;font-size:12px">
                  <span style="color:#f56c6c">— {{ log.old_value.length > 120 ? log.old_value.slice(0,120)+'...' : log.old_value }}</span>
                </div>
                <div v-if="log.new_value !== undefined && log.new_value !== ''" style="margin-top:2px;font-size:12px">
                  <span style="color:#67c23a">+ {{ log.new_value.length > 120 ? log.new_value.slice(0,120)+'...' : log.new_value }}</span>
                </div>
                <div v-if="log.remark" style="margin-top:4px;color:#2c5282;font-style:italic">
                  {{ log.remark }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-else style="color:#909399;font-size:13px">暂无操作记录</div>
        </el-card>

        <el-card shadow="never">
          <div class="section-title" style="border-left-color:#e6a23c">
            <el-icon style="margin-right:4px"><Lock /></el-icon>
            原始数据留痕（脏数据永久保留）
          </div>
          <div v-if="detail.original_raw_row" class="raw-trace">
            {{ prettyRaw(detail.original_raw_row) }}
          </div>
          <div v-else style="color:#909399;font-size:12px">无原始行数据</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import { api } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const store = useAppStore()

const id = computed(() => Number(route.params.id))
const loaded = ref(false)
const saving = ref(false)
const detail = ref({})
const form = reactive({})
const logs = ref([])
const mergeRelations = ref([])
const evidences = ref([])
const evidenceForm = reactive({ evidence_type: '', evidence_desc: '', file_name: '' })

const loadAll = async () => {
  loaded.value = false
  await Promise.all([
    !store.statusLabels?.length && store.loadStatusInfo()
  ])
  const [d, l, m, e] = await Promise.all([
    api.get(id.value),
    api.logs(id.value),
    api.merges(id.value),
    api.evidences(id.value)
  ])
  detail.value = d
  Object.assign(form, d)
  logs.value = l
  mergeRelations.value = m
  evidences.value = e
  loaded.value = true
}

const saveForm = async () => {
  saving.value = true
  try {
    const payload = { ...form, operator: store.operator }
    await api.update(id.value, payload)
    ElMessage.success('已保存，修改已写入操作日志')
    await loadAll()
  } finally {
    saving.value = false
  }
}

const handleStatusChange = async target => {
  try {
    const { value: remark } = await ElMessageBox.prompt(
      `确认将状态从「${store.statusLabels[detail.value.status]}」变更为「${store.statusLabels[target]}」？请填写变更说明（留痕）：`,
      '状态变更确认',
      { confirmButtonText: '确认变更', cancelButtonText: '取消', inputPlaceholder: '变更理由（操作日志可见）' }
    )
    await api.changeStatus(id.value, { target_status: target, operator: store.operator, remark })
    ElMessage.success('状态已变更，已写入操作日志')
    await loadAll()
  } catch (e) { /* 取消 */ }
}

const addEvidence = async () => {
  if (!evidenceForm.evidence_type || !evidenceForm.evidence_desc) {
    ElMessage.warning('请至少填写证据类型和描述')
    return
  }
  await api.addEvidence(id.value, { ...evidenceForm, uploaded_by: store.operator })
  ElMessage.success('证据已补充，操作日志已留痕')
  evidenceForm.evidence_type = ''
  evidenceForm.evidence_desc = ''
  evidenceForm.file_name = ''
  await loadAll()
}

const formatTime = t => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '—'

const timelineColor = action => {
  if (action === 'create') return 'info'
  if (action === 'update' || action === 'add_evidence') return 'primary'
  if (action === 'status_change') return 'warning'
  if (action.startsWith('merge')) return 'success'
  return ''
}

const actionLabel = action => ({
  create: '创建记录',
  update: '修改字段',
  status_change: '状态变更',
  add_evidence: '补充证据',
  merge_from: '归并到其他记录',
  merge_to: '吸收归并记录'
}[action] || action)

const prettyRaw = row => {
  try {
    const obj = typeof row === 'string' ? JSON.parse(row) : row
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('\n')
  } catch {
    return String(row)
  }
}

onMounted(loadAll)
</script>
