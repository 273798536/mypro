<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>历史变更 - 所有操作留痕</h2>
    </div>

    <div class="card-section">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <el-select v-model="filterEntity" placeholder="按实体类型" clearable style="width: 160px;" @change="load">
          <el-option label="样本" value="sample" />
          <el-option label="人工修正" value="correction" />
          <el-option label="异常" value="anomaly" />
          <el-option label="版本" value="version" />
        </el-select>
        <el-input v-model="filterEid" placeholder="实体ID(样本ID等)" clearable style="width: 220px;" @keyup.enter="load" />
        <el-button :icon="Search" @click="load">查询</el-button>
        <div style="flex: 1; text-align: right; color: #909399; font-size: 12px; line-height: 32px;">
          人工确认前后变化必须进历史，评审会前复盘这里能解释给排班同事
        </div>
      </div>
      <el-table :data="rows" size="small" border stripe>
        <el-table-column prop="created_at" label="时间" width="160" />
        <el-table-column label="实体" width="200">
          <template #default="{ row }">
            <el-tag size="small" :type="entityTag(row.entity_type)" effect="plain">{{ entityLabel(row.entity_type) }}</el-tag>
            <span style="margin-left: 6px;">{{ row.entity_id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="version_id" label="版本ID" width="80" />
        <el-table-column prop="change_type" label="操作类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="chgTag(row.change_type)">{{ row.change_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="field_name" label="字段" width="120" />
        <el-table-column label="旧值 → 新值" min-width="220">
          <template #default="{ row }">
            <div v-if="row.old_value || row.new_value" style="font-size: 12px;">
              <span v-if="row.old_value !== null" style="color:#f56c6c;">{{ row.old_value }}</span>
              <span v-if="row.old_value !== null && row.new_value !== null"> → </span>
              <span v-if="row.new_value !== null" style="color:#67c23a;">{{ row.new_value }}</span>
            </div>
            <span v-else style="color:#909399; font-size: 12px;">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="110" />
        <el-table-column prop="change_note" label="说明" show-overflow-tooltip />
      </el-table>
      <el-pagination style="margin-top: 12px; text-align: right;"
        v-model:current-page="page" v-model:page-size="pageSize" :total="total"
        layout="total, prev, pager, next, jumper" @current-change="load" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject } from 'vue'
import { Search } from '@element-plus/icons-vue'
import api from '../api'

const props = defineProps({ versionId: Number })
const currentVersionId = inject('currentVersionId', ref(null))

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const filterEntity = ref('')
const filterEid = ref('')

function entityLabel(t) {
  return { sample: '样本', correction: '人工修正', anomaly: '异常', version: '版本' }[t] || t
}
function entityTag(t) {
  return { sample: 'success', correction: 'primary', anomaly: 'danger', version: 'warning' }[t] || ''
}
function chgTag(t) {
  return { create: 'success', update: 'warning', batch_import: 'info', import_samples: '' }[t] || ''
}

async function load() {
  const vid = currentVersionId.value || props.versionId
  try {
    const params = {
      entity_type: filterEntity.value || undefined,
      entity_id: filterEid.value || undefined,
      version_id: vid,
      page: page.value, pageSize: pageSize.value
    }
    if (!filterEntity.value && !filterEid.value) delete params.version_id
    const { data } = await api.getHistory(params)
    rows.value = data
    total.value = page.value === 1 ? data.length * 2 : total.value
  } catch (e) {}
}

watch(() => currentVersionId.value, () => { page.value = 1; load() })
onMounted(load)
</script>
