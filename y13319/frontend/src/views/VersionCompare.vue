<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>版本对比 - 指标涨了？先看样本有没有变</h2>
      <div style="display: flex; gap: 8px;">
        <el-select v-model="v1" placeholder="选基准版本" style="width: 240px;">
          <el-option v-for="v in versionsList" :key="v.id" :label="`${v.version_name} (${v.actual_count||v.sample_count}条)`" :value="v.id" />
        </el-select>
        <span style="line-height: 32px; color: #909399;">VS</span>
        <el-select v-model="v2" placeholder="选对比版本" style="width: 240px;">
          <el-option v-for="v in versionsList" :key="v.id" :label="`${v.version_name} (${v.actual_count||v.sample_count}条)`" :value="v.id" />
        </el-select>
        <el-button type="primary" :icon="DataAnalysis" :disabled="!v1||!v2" @click="doCompare">开始对比</el-button>
      </div>
    </div>

    <div v-if="!result" class="card-section">
      <el-empty description="选择两个版本开始对比：样本集变化 → 指标变化" />
    </div>

    <div v-else>
      <el-row :gutter="16" style="margin-bottom: 16px;">
        <el-col :span="8">
          <div class="metric-card" style="background: linear-gradient(135deg, #4b6cb7, #182848);">
            <div class="label">准确率差异</div>
            <div class="value" :style="{ color: result.accuracy_diff >= 0 ? '#8effa1' : '#ffd083' }">
              {{ result.accuracy_diff > 0 ? '+' : '' }}{{ result.accuracy_diff }}%
            </div>
            <div class="sub">
              {{ v1name }}: {{ result.v1_metrics.accuracy }}% → {{ v2name }}: {{ result.v2_metrics.accuracy }}%
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="metric-card" style="background: linear-gradient(135deg, #ff8a00, #e52e71);">
            <div class="label">样本集变化</div>
            <div class="value">+{{ result.sample_set.added_count }} / -{{ result.sample_set.removed_count }}</div>
            <div class="sub">
              新增: {{ result.sample_set.added_count }} 条｜删除: {{ result.sample_set.removed_count }} 条｜共有: {{ result.sample_set.common_count }} 条
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="metric-card" style="background: linear-gradient(135deg, #11998e, #38ef7d);">
            <div class="label">有效样本</div>
            <div class="value">{{ result.v1_metrics.normal_samples }} → {{ result.v2_metrics.normal_samples }}</div>
            <div class="sub">
              异常排除: {{ result.v1_metrics.anomaly_samples }} → {{ result.v2_metrics.anomaly_samples }} 条
            </div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <div class="card-section">
            <h3>类别准确率对比</h3>
            <div ref="catChart" style="height: 340px;"></div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="card-section">
            <h3>共有样本的类别变化 ({{ result.category_changes.length }} 条)</h3>
            <el-table :data="result.category_changes" size="small" border stripe max-height="320">
              <el-table-column prop="sample_id" label="样本ID" width="120" />
              <el-table-column label="GT 变化" width="140">
                <template #default="{ row }">
                  <div style="font-size: 12px;">
                    <div style="color:#f56c6c;">V1: {{ row.cat1 || '-' }}</div>
                    <div style="color:#67c23a;">V2: {{ row.cat2 || '-' }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="正误变化" width="100">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.c1 === row.c2 ? 'info' : (row.c2 > row.c1 ? 'success' : 'danger')">
                    {{ row.c1 }} → {{ row.c2 }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="拉偏？" width="80">
                <template #default="{ row }">
                  <el-icon v-if="row.c1 !== row.c2" :color="row.c2 > row.c1 ? '#67c23a' : '#f56c6c'">
                    <component :is="row.c2 > row.c1 ? 'CaretTop' : 'CaretBottom'" />
                  </el-icon>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-col>
      </el-row>

      <div class="card-section">
        <h3>新增样本ID（会影响指标，请重点核查）</h3>
        <div style="max-height: 160px; overflow-y: auto; background: #f5f7fa; padding: 8px; border-radius: 4px;">
          <el-tag v-for="s in result.sample_set.added_samples.slice(0, 100)" :key="s"
            type="success" effect="plain" style="margin: 2px;">{{ s }}</el-tag>
          <span v-if="result.sample_set.added_samples.length > 100" style="color:#909399; font-size: 12px;">
            还有 {{ result.sample_set.added_samples.length - 100 }} 条...
          </span>
          <span v-if="!result.sample_set.added_samples.length" style="color:#909399;">无新增样本</span>
        </div>
      </div>

      <div class="card-section">
        <h3>删除样本ID（可能指标提升是因为删了难例）</h3>
        <div style="max-height: 160px; overflow-y: auto; background: #fef0f0; padding: 8px; border-radius: 4px;">
          <el-tag v-for="s in result.sample_set.removed_samples.slice(0, 100)" :key="s"
            type="danger" effect="plain" style="margin: 2px;">{{ s }}</el-tag>
          <span v-if="result.sample_set.removed_samples.length > 100" style="color:#909399; font-size: 12px;">
            还有 {{ result.sample_set.removed_samples.length - 100 }} 条...
          </span>
          <span v-if="!result.sample_set.removed_samples.length" style="color:#909399;">无删除样本</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { DataAnalysis, CaretTop, CaretBottom } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '../api'

const props = defineProps({ versions: Array })
const versionsList = inject('versions', ref([]))

const v1 = ref(null)
const v2 = ref(null)
const result = ref(null)
const catChart = ref(null)
let chartIns = null

const v1name = computed(() => versionsList.value.find(v => v.id === v1.value)?.version_name || 'v1')
const v2name = computed(() => versionsList.value.find(v => v.id === v2.value)?.version_name || 'v2')

async function doCompare() {
  if (!v1.value || !v2.value) return ElMessage.warning('请选择两个版本')
  try {
    const { data } = await api.compareVersions(v1.value, v2.value)
    result.value = data
    ElMessage.success(`对比完成: 准确率变化 ${data.accuracy_diff > 0 ? '+' : ''}${data.accuracy_diff}%`)
    await nextTick()
    renderChart()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '对比失败')
  }
}

function renderChart() {
  if (!catChart.value || !result.value) return
  chartIns = chartIns || echarts.init(catChart.value)
  const cats = new Set()
  Object.keys(result.value.v1_metrics.category_accuracy || {}).forEach(c => cats.add(c))
  Object.keys(result.value.v2_metrics.category_accuracy || {}).forEach(c => cats.add(c))
  const catArr = [...cats]
  chartIns.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: [v1name.value, v2name.value] },
    xAxis: { type: 'category', data: catArr, axisLabel: { rotate: 20 } },
    yAxis: { type: 'value', min: 0, max: 100, name: '准确率%' },
    series: [
      { name: v1name.value, type: 'bar', data: catArr.map(c => result.value.v1_metrics.category_accuracy?.[c] ?? 0), itemStyle: { color: '#4b6cb7' } },
      { name: v2name.value, type: 'bar', data: catArr.map(c => result.value.v2_metrics.category_accuracy?.[c] ?? 0), itemStyle: { color: '#11998e' } }
    ]
  })
}

watch(() => props.versions, (v) => {
  if (v && v.length >= 2 && !v1.value) { v1.value = v[1].id; v2.value = v[0].id }
})
</script>
