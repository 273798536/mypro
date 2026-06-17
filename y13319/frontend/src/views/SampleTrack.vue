<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>样本追踪 - 串起版本/修正/异常/历史</h2>
      <div style="display: flex; gap: 8px;">
        <el-input v-model="searchId" placeholder="输入样本ID，如 SAMPLE-00023" style="width: 280px;"
          clearable @keyup.enter="doSearch">
          <template #append><el-button @click="doSearch" :icon="Search">追踪</el-button></template>
        </el-input>
      </div>
    </div>

    <div v-if="!trackData" class="card-section">
      <el-empty description="输入样本ID开始追踪：从人工修正翻起，串联版本、异常、历史" />
    </div>

    <div v-else>
      <div class="card-section">
        <h3>样本 {{ trackData.sample_id }} - 全貌</h3>
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="出现版本数">{{ trackData.versions.length }}</el-descriptions-item>
          <el-descriptions-item label="人工修正数">{{ trackData.corrections.length }}</el-descriptions-item>
          <el-descriptions-item label="异常记录数">{{ trackData.anomalies.length }}</el-descriptions-item>
          <el-descriptions-item label="变更历史条数">{{ trackData.history.length }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <el-row :gutter="16">
        <el-col :span="14">
          <div class="card-section">
            <h3>跨版本变化（指标涨了先看这）</h3>
            <el-table :data="trackData.versions" size="small" border stripe>
              <el-table-column prop="version_name" label="版本" width="160" />
              <el-table-column label="类别变化">
                <template #default="{ row }">
                  <div style="font-size: 12px;">
                    <div>GT: <b>{{ row.category_gt || '-' }}</b></div>
                    <div>PD: {{ row.category_pred || '-' }} ({{ (row.confidence*100).toFixed(1) }}%)</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="是否正确" width="90">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.is_correct === 1 ? 'success' : 'danger'">
                    {{ row.is_correct === 1 ? '正确' : '错误' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="异常标记" width="120">
                <template #default="{ row }">
                  <span v-if="row.anomaly_type" class="tag-leak">{{ row.anomaly_type }}</span>
                  <span v-else style="color:#909399;">无</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="card-section">
            <h3>人工确认前后变化（评审会给排班同事解释）</h3>
            <el-timeline>
              <el-timeline-item
                v-for="(h, i) in trackData.corrections"
                :key="'c'+i"
                :timestamp="h.corrected_at"
                :type="h.status === 'confirmed' ? 'success' : (h.status === 'rejected' ? 'danger' : 'warning')"
                placement="top"
              >
                <b>[{{ statusLabel(h.status) }}]</b>
                来源 <el-tag size="small" type="primary" effect="plain">{{ h.source }}</el-tag>
                : <span style="color:#f56c6c;">{{ h.category_before || '?' }}</span>
                → <span style="color:#67c23a;">{{ h.category_after || '?' }}</span>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  排班人: {{ h.corrected_by }}｜复核意见: {{ h.review_note || '-' }}
                </div>
              </el-timeline-item>
              <el-timeline-item
                v-for="(a, i) in trackData.anomalies"
                :key="'a'+i"
                :timestamp="a.detected_at"
                type="danger"
                placement="top"
              >
                <b class="tag-leak">异常: {{ a.anomaly_type }}</b>
                ({{ a.severity }}) - {{ a.description }}
                <span style="font-size: 12px; color: #909399;">{{ a.status === 'resolved' ? `｜已解决: ${a.resolution_note}` : '｜未解决' }}</span>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-col>
        <el-col :span="10">
          <div class="card-section">
            <h3>变更历史（审计）</h3>
            <el-table :data="trackData.history" size="small" border max-height="500">
              <el-table-column prop="created_at" label="时间" width="150" />
              <el-table-column prop="change_type" label="类型" width="80">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.change_type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="field_name" label="字段" width="110" />
              <el-table-column label="值变化">
                <template #default="{ row }">
                  <div v-if="row.old_value || row.new_value" style="font-size: 12px;">
                    <div style="color:#f56c6c;">旧: {{ row.old_value || '-' }}</div>
                    <div style="color:#67c23a;">新: {{ row.new_value || '-' }}</div>
                  </div>
                  <span v-else style="color:#909399; font-size: 12px;">{{ row.change_note || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="operator" label="操作人" width="100" />
            </el-table>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import api from '../api'

const route = useRoute()
const searchId = ref('')
const trackData = ref(null)
const currentVersionId = inject('currentVersionId', ref(null))

function statusLabel(s) {
  return { pending: '待复核', confirmed: '已确认', rejected: '已驳回' }[s] || s
}

async function doSearch() {
  const id = searchId.value.trim()
  if (!id) return
  try {
    const { data } = await api.trackSample(id)
    trackData.value = data
    if (!data.versions.length && !data.corrections.length && !data.anomalies.length) {
      ElMessage.warning('未找到该样本记录，请确认ID是否正确')
    }
  } catch (e) {
    ElMessage.error('查询失败')
  }
}

watch(() => route.query.id, (v) => {
  if (v) { searchId.value = v; doSearch() }
})
onMounted(() => {
  if (route.query.id) { searchId.value = route.query.id; doSearch() }
})
</script>
