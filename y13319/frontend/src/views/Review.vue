<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>评审溯源 - 哪几条样本把结论拉偏了？</h2>
      <el-button size="small" type="primary" :icon="Refresh" @click="load">重新计算</el-button>
    </div>

    <el-alert style="margin-bottom: 16px;" type="success" :closable="false" show-icon
      title="评审会开始前用本页给排班同事复盘：总指标 → 类别最差项 → 高置信错判样本 → 人工确认变更">
    </el-alert>

    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="6">
        <div class="metric-card" style="background: linear-gradient(135deg, #f5576c, #f093fb);">
          <div class="label">准确率</div>
          <div class="value">{{ data.metrics?.accuracy ?? '-' }}%</div>
          <div class="sub">正确 {{ data.metrics?.correct_count ?? 0 }} / {{ data.metrics?.normal_samples ?? 0 }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card" style="background: linear-gradient(135deg, #667eea, #764ba2);">
          <div class="label">最高错判率类别</div>
          <div class="value" style="font-size: 20px;">{{ worstCat?.category || '-' }}</div>
          <div class="sub">错判 {{ worstCat?.wrong_count || 0 }} / {{ worstCat?.total || 0 }} = {{ worstCat?.wrong_rate || 0 }}%</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card" style="background: linear-gradient(135deg, #00c6ff, #0072ff);">
          <div class="label">高置信错判</div>
          <div class="value">{{ data.high_conf_wrong?.length || 0 }}</div>
          <div class="sub">置信度>0.7但判错，TOP50</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card" style="background: linear-gradient(135deg, #f7971e, #ffd200);">
          <div class="label">已确认修正</div>
          <div class="value">{{ data.confirmed_corrections?.length || 0 }}</div>
          <div class="sub">已记录变更历史</div>
        </div>
      </el-col>
    </el-row>

    <div class="card-section">
      <h3>STEP 1：按类别错判率排序（找拉偏结论的重灾区）</h3>
      <div ref="worstChart" style="height: 300px;"></div>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-section">
          <h3>STEP 2：高置信错判TOP50（模型最自信却最错的样本，必追）</h3>
          <el-table :data="data.high_conf_wrong" size="small" border stripe max-height="500"
            :row-class-name="({ row }) => row.anomaly_type ? 'leak-row' : 'highlight-row'">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="sample_id" label="样本ID" width="120">
              <template #default="{ row }">
                <el-button link type="primary" @click="track(row.sample_id)">{{ row.sample_id }}</el-button>
              </template>
            </el-table-column>
            <el-table-column label="GT / 预测">
              <template #default="{ row }">
                <div style="font-size: 12px;">
                  <div>真实: <b style="color:#67c23a;">{{ row.category_gt }}</b></div>
                  <div>预测: <b style="color:#f56c6c;">{{ row.category_pred }}</b></div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="置信度" width="90">
              <template #default="{ row }">
                <el-progress :percentage="Math.round(row.confidence*100)" :color="getConfColor(row.confidence)" :stroke-width="12" />
              </template>
            </el-table-column>
            <el-table-column label="异常" width="110">
              <template #default="{ row }">
                <span v-if="row.anomaly_type" class="tag-leak">{{ row.anomaly_type }}</span>
                <span v-else style="color:#909399;">无</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="card-section">
          <h3>STEP 3：人工确认前后变化（评审会要解释给排班同事）</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(c, i) in data.confirmed_corrections"
              :key="i"
              :timestamp="c.reviewed_at || c.corrected_at"
              type="success"
              placement="top"
            >
              <b>{{ c.sample_id }}</b>
              <el-tag size="small" type="primary" effect="plain" style="margin-left: 4px;">{{ c.source }}</el-tag>
              <div style="font-size: 13px; margin-top: 4px;">
                类别变更: <span style="color:#f56c6c;">{{ c.category_before }}</span>
                → <span style="color:#67c23a;">{{ c.category_after }}</span>
              </div>
              <div style="font-size: 12px; color: #909399; margin-top: 2px;">
                算法原判定: {{ c.category_pred || '-' }} ({{ (c.confidence||0)*100 }}%)
                ｜{{ c.review_note || '无备注' }}
              </div>
              <div style="margin-top: 4px;">
                <el-button link size="small" type="primary" @click="track(c.sample_id)">查看完整历史</el-button>
              </div>
            </el-timeline-item>
            <el-timeline-item v-if="!data.confirmed_corrections?.length" type="info">
              暂无已确认修正记录
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '../api'

const props = defineProps({ versionId: Number })
const router = useRouter()
const currentVersionId = inject('currentVersionId', ref(null))

const data = ref({ metrics: {}, high_conf_wrong: [], per_category_worst: [], confirmed_corrections: [] })
const worstChart = ref(null)
let chartIns = null

const worstCat = computed(() => data.value.per_category_worst?.[0] || null)

async function load() {
  const vid = currentVersionId.value || props.versionId
  if (!vid) return
  try {
    const { data: res } = await api.getReviewImpact(vid)
    data.value = res
    await nextTick()
    renderChart()
  } catch (e) {}
}

function renderChart() {
  if (!worstChart.value) return
  chartIns = chartIns || echarts.init(worstChart.value)
  const wc = data.value.per_category_worst || []
  chartIns.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['错判数', '总数'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: wc.map(x => x.category).reverse() },
    series: [
      { name: '总数', type: 'bar', stack: 'total', data: wc.map(x => x.total - x.wrong_count).reverse(), itemStyle: { color: '#67c23a' }, label: { show: false } },
      { name: '错判数', type: 'bar', stack: 'total', data: wc.map(x => x.wrong_count).reverse(), itemStyle: { color: '#f56c6c' },
        label: { show: true, formatter: (p) => `${p.value}个 (${wc[wc.length - 1 - p.dataIndex]?.wrong_rate}%)`, color: '#fff', fontWeight: 600 } }
    ]
  })
}

function getConfColor(c) {
  if (c > 0.9) return '#f56c6c'
  if (c > 0.8) return '#e6a23c'
  return '#409EFF'
}

function track(sid) { router.push(`/sample-track?id=${sid}`) }

watch(() => currentVersionId.value, load)
onMounted(load)
</script>
