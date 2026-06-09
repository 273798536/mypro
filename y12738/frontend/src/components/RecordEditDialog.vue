<template>
  <el-dialog v-model="visible" title="人工修正记录" width="760px" top="6vh">
    <div v-if="record" style="margin-bottom: 12px;">
      <el-tag size="small" :class="`tag-status-${record.status}`" style="margin-right: 8px;">
        {{ statusText(record.status) }}
      </el-tag>
      <el-tag size="small" :class="`tag-error-${record.error_level}`">
        误差：{{ record.error_level }}
      </el-tag>
      <span style="margin-left: 12px; color: #909399; font-size: 12px;">
        题目编号：{{ record.question_no || record.question_id || `#${record.id}` }}
      </span>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="修改字段" name="edit">
        <el-form :model="form" label-width="110px" size="default">
          <el-form-item label="题目标题">
            <el-input v-model="form.question_title" placeholder="可留空不修改" />
          </el-form-item>
          <el-form-item label="精确特征值">
            <el-input v-model="form.eigenvalue_exact" placeholder="如 1,2,3" />
          </el-form-item>
          <el-form-item label="近似特征值">
            <el-input v-model="form.eigenvalue_approx" placeholder="如 0.99,2.01,3.0" />
          </el-form-item>
          <el-form-item label="误差值">
            <el-input-number v-model="form.error_value" :step="0.001" :precision="6" />
          </el-form-item>
          <el-form-item label="误差级别">
            <el-select v-model="form.error_level" placeholder="请选择" style="width: 100%;">
              <el-option label="正常" value="normal" />
              <el-option label="警告" value="warning" />
              <el-option label="严重" value="critical" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" placeholder="请选择" style="width: 100%;">
              <el-option label="待确认" value="pending" />
              <el-option label="通过" value="passed" />
              <el-option label="驳回" value="rejected" />
              <el-option label="需复核" value="need_review" />
            </el-select>
          </el-form-item>
          <el-form-item label="约束通过">
            <el-switch v-model="form.constraint_pass" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="操作人">
            <el-input v-model="form.operator" />
          </el-form-item>
          <el-form-item label="变更说明">
            <el-input v-model="form.comment" type="textarea" :rows="2" placeholder="请简要说明修改原因" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="审计日志" name="audit">
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
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submit" :loading="submitting">保存修改并留痕</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api.js'

const props = defineProps({
  modelValue: Boolean,
  record: Object,
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const activeTab = ref('edit')
const submitting = ref(false)
const auditLogs = ref([])

const form = reactive({
  question_title: '',
  eigenvalue_exact: '',
  eigenvalue_approx: '',
  error_value: 0,
  error_level: '',
  status: '',
  constraint_pass: false,
  remark: '',
  operator: '排课老师',
  comment: '',
})

function resetForm(rec) {
  Object.assign(form, {
    question_title: rec?.question_title || '',
    eigenvalue_exact: rec?.eigenvalue_exact || '',
    eigenvalue_approx: rec?.eigenvalue_approx || '',
    error_value: rec?.error_value ?? 0,
    error_level: rec?.error_level || 'normal',
    status: rec?.status || 'pending',
    constraint_pass: !!rec?.constraint_pass,
    remark: rec?.remark || '',
    operator: '排课老师',
    comment: '',
  })
}

function statusText(s) {
  return { pending: '待确认', passed: '通过', rejected: '驳回', need_review: '需复核' }[s] || s
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

async function loadAudit() {
  if (!props.record?.id) return
  try {
    auditLogs.value = await api.getAuditLogs(props.record.id)
  } catch (e) {
    auditLogs.value = []
  }
}

watch(
  () => props.record,
  (r) => {
    if (r) {
      resetForm(r)
      loadAudit()
    }
  },
  { immediate: true }
)

watch(visible, (v) => {
  if (v && props.record) {
    activeTab.value = 'edit'
    resetForm(props.record)
    loadAudit()
  }
})

async function submit() {
  if (!props.record?.id) return
  submitting.value = true
  try {
    await api.updateRecord(props.record.id, { ...form })
    ElMessage.success('已保存，变更已记录到审计日志')
    emit('saved')
    visible.value = false
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>
