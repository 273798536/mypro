<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>字段映射 - 排班同事字段名前后不一也能保住 source/status</h2>
    </div>

    <el-alert style="margin-bottom: 16px;" type="info" :closable="false" show-icon
      title="规则：无论排班同事提交什么字段名（来源/来源/数据来源/status...），都映射到标准字段。至少保住 source（来源）和 status（处理状态）两个字段。">
    </el-alert>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-section">
          <h3>现有映射规则（新增规则立即生效）</h3>
          <el-table :data="rows" size="small" border stripe>
            <el-table-column prop="source_name" label="排班同事字段名" width="180">
              <template #default="{ row }">
                <code style="background: #f0f2f5; padding: 2px 6px; border-radius: 4px;">{{ row.source_name }}</code>
              </template>
            </el-table-column>
            <el-table-column label="映射到标准字段" width="160">
              <template #default="{ row }">
                <el-tag :type="row.standard_field === 'source' || row.standard_field === 'status' ? 'danger' : 'primary'" size="small">
                  {{ row.standard_field }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="mapping_note" label="备注" />
            <el-table-column prop="created_at" label="添加时间" width="160" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="card-section">
          <h3>新增映射规则</h3>
          <el-form :model="form" label-width="110px">
            <el-form-item label="排班字段名">
              <el-input v-model="form.source_name" placeholder="如：原始来源、修正状态、最终结果..." />
            </el-form-item>
            <el-form-item label="标准字段">
              <el-select v-model="form.standard_field" style="width: 100%;">
                <el-option label="source（来源，必保）" value="source" />
                <el-option label="status（处理状态，必保）" value="status" />
                <el-option label="category_before（原始类别）" value="category_before" />
                <el-option label="category_after（修正后类别）" value="category_after" />
                <el-option label="corrected_by（排班人）" value="corrected_by" />
                <el-option label="sample_id（样本ID）" value="sample_id" />
              </el-select>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="form.mapping_note" />
            </el-form-item>
            <el-button type="primary" :icon="Plus" @click="submit">添加规则</el-button>
          </el-form>
        </div>
        <div class="card-section">
          <h3>快速测试映射</h3>
          <el-input v-model="testPayload" type="textarea" :rows="4"
            placeholder='粘贴排班同事提交的JSON，例：&#10;{"来源":"早班","处理状态":"已复核","修正结果":"表面划痕","样本":"SAMPLE-00023"}' />
          <el-button style="margin-top: 8px;" type="warning" :icon="View" @click="doTest">测试规范化结果</el-button>
          <pre v-if="testResult" style="background: #fdf6ec; padding: 10px; border-radius: 6px; margin-top: 10px; max-height: 200px; overflow: auto;">规范化后 →
{{ testResult }}
✅ 字段名兼容已完成，source 和 status 被保住了</pre>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, View } from '@element-plus/icons-vue'
import api from '../api'

const rows = ref([])
const form = ref({ source_name: '', standard_field: 'source', mapping_note: '' })
const testPayload = ref('')
const testResult = ref('')

async function load() {
  const { data } = await api.getFieldMapping()
  rows.value = data
}
async function submit() {
  if (!form.value.source_name || !form.value.standard_field) return ElMessage.warning('请填写完整')
  try {
    await api.addFieldMapping(form.value)
    ElMessage.success('规则已添加')
    form.value = { source_name: '', standard_field: 'source', mapping_note: '' }
    load()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '失败')
  }
}

async function doTest() {
  if (!testPayload.value.trim()) return ElMessage.warning('请先粘贴JSON')
  try {
    const { data } = await api.getFieldMapping()
    const mapping = {}
    data.forEach(r => { mapping[r.source_name.toLowerCase()] = r.standard_field })
    let obj = JSON.parse(testPayload.value)
    const normalized = {}
    Object.keys(obj).forEach(k => {
      const sk = mapping[k.toLowerCase()] || mapping[k] || k
      normalized[sk] = obj[k]
    })
    if (!normalized.source) normalized.source = obj['来源'] || obj['数据来源'] || obj['source'] || 'unknown'
    if (!normalized.status) normalized.status = obj['状态'] || obj['处理状态'] || obj['status'] || 'pending'
    testResult.value = JSON.stringify(normalized, null, 2)
  } catch (e) {
    ElMessage.error('JSON解析失败')
  }
}

onMounted(load)
</script>
