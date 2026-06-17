<template>
  <div class="app-container">
    <div class="header-bar">
      <h2>总览看板 - {{ currentVersionName }}</h2>
      <div style="display: flex; gap: 8px;">
        <el-button size="small" :icon="Promotion" @click="goCompare">版本对比</el-button>
        <el-button size="small" type="warning" :icon="ZoomIn" @click="goReview">评审溯源</el-button>
      </div>
    </div>

    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="4"><div class="metric-card" style="background: linear-gradient(135deg, #667eea, #764ba2);">
        <div class="label">样本总量</div>
        <div class="value">{{ metrics.total_samples }}</div>
        <div class="sub">其中异常 {{ metrics.anomaly_samples }} 条已排除</div>
      </div></el-col>
      <el-col :span="4"><div class="metric-card" style="background: linear-gradient(135deg, #43cea2, #185a9d);">
        <div class="label">有效样本</div>
        <div class="value">{{ metrics.normal_samples }}</div>
        <div class="sub">参与指标计算</div>
      </div></el-col>
      <el-col :span="4"><div class="metric-card" style="background: linear-gradient(135deg, #f093fb, #f5576c);">
        <div class="label">模型准确率</div>
        <div class="value">{{ metrics.accuracy }}%</div>
        <div class="sub">正确 {{ metrics.correct_count }} / {{ metrics.normal_samples }}</div>
      </div></el-col>
      <el-col :span="4"><div class="metric-card" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
        <div class="label">人工修正</div>
        <div class="value">{{ metrics.correction_count }}</div>
        <div class="sub">已确认条数</div>
      </div></el-col>
      <el-col :span="4"><div class="metric-card" style="background: linear-gradient(135deg, #fa709a, #fee140);">
        <div class="label">异常队列</div>
        <div class="value">{{ metrics.anomaly_samples }}</div>
        <div class="sub">样本泄漏等{{ Object.keys(metrics.anomaly_stats || {}).length }}类</div>
      </div></el-col>
      <el-col :span="4"><div class="metric-card" style="background: linear-gradient(135deg, #30cfd0, #330867);">
        <div class="label">类别数量</div>
        <div class="value">{{ metrics.category_detail ? metrics.category_detail.length : 0 }}</div>
        <div class="sub">按类别细分见下图</div>
      </div></el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-section">
          <h3>各类别准确率 vs 数量（正常样本 vs 异常样本分离）</h3>
          <div ref="catChart" style="height: 340px;"></div>
        </div>
        <div class="card-section">
          <h3>异常类型分布（异常样本不入正常指标）</h3>
          <div ref="anomalyChart" style="height: 260px;"></div>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="card-section">
          <h3>指标涨了？先看样本集有没有变</h3>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="当前版本">{{ currentVersionName }}</el-descriptions-item>
            <el-descriptions-item label="总样本">{{ metrics.total_samples }}</el-descriptions-item>
            <el-descriptions-item label="异常排除">{{ metrics.anomaly_samples }}
              <el-tag v-if="metrics.anomaly_samples > 0" type="danger" style="margin-left: 8px;" size="small">影响公平性</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="参与统计">{{ metrics.normal_samples }}</el-descriptions-item>
            <el-descriptions-item label="准确率">{{ metrics.accuracy }}%</el-descriptions-item>
          </el-descriptions>
          <el-alert style="margin-top: 10px;" type="warning" :closable="false" show-icon
            title="指标变化排查顺序">
            <p style="margin: 4px 0;">① 版本对比 - 样本集是否增减/替换</p>
            <p style="margin: 4px 0;">② 异常队列 - 泄漏/脏数据是否处理</p>
            <p style="margin: 4px 0;">③ 人工修正 - 排班同事修正是否确认</p>
            <p style="margin: 4px 0;">④ 评审溯源 - 哪些样本拉偏了结论</p>
          </el-alert>
        </div>

        <div class="card-section">
          <h3>最拉低结论的TOP10样本（高置信错判）</h3>
          <el-table :data="topWrong" size="small" max-height="280" stripe>
            <el-table-column prop="sample_id" label="样本ID" width="120" />
            <el-table-column label="GT / Pred">
              <template #default="{ row }">
                <div style="font-size: 12px;">
                  <div style="color: #67c23a;">GT: {{ row.category_gt }}</div>
                  <div style="color: #f56c6c;">PD: {{ row.category_pred }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="confidence" label="置信度" width="80" />
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="track(row.sample_id)">追踪</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Promotion, ZoomIn } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '../api'

const props = defineProps({ versionId: Number, versions: Array })
const router = useRouter()
const currentVersionId = inject('currentVersionId', ref(null))

const metrics = ref({})
const topWrong = ref([])
const catChart = ref(null)
const anomalyChart = ref(null)
let catChartIns = null, anomalyChartIns = null

const currentVersionName = computed(() => {
  const vid = currentVersionId.value || props.versionId
  const v = (props.versions || []).find(x => x.id === vid)
  return v ? v.version_name : '未选择版本'
})

async function load() {
  const vid = currentVersionId.value || props.versionId
  if (!vid) return
  try {
    const { data } = await api.getMetrics(vid)
    metrics.value = data
    topWrong.value = data.impact_samples || []
    renderCharts()
  } catch (e) {
    ElMessage.error('加载指标失败')
  }
}

function renderCharts() {
  if (catChart.value) {
    catChartIns = catChartIns || echarts.init(catChart.value)
    const detail = metrics.value.category_detail || []
    catChartIns.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['准确率%', '样本数量'] },
      xAxis: { type: 'category', data: detail.map(d => d.category), axisLabel: { interval: 0, rotate: 20 } },
      yAxis: [
        { type: 'value', name: '准确率%', min: 0, max: 100 },
        { type: 'value', name: '数量' }
      ],
      series: [
        { name: '准确率%', type: 'bar', data: detail.map(d => d.accuracy),
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1,
            [{ offset: 0, color: '#43cea2' }, { offset: 1, color: '#185a9d' }]) } },
        { name: '样本数量', type: 'line', yAxisIndex: 1, data: detail.map(d => d.total),
          itemStyle: { color: '#f56c6c' } }
      ]
    })
  }
  if (anomalyChart.value) {
    anomalyChartIns = anomalyChartIns || echarts.init(anomalyChart.value)
    const stats = metrics.value.anomaly_stats || {}
    const keys = Object.keys(stats)
    if (keys.length === 0) {
      anomalyChartIns.setOption({ title: { text: '暂无异常', left: 'center', top: 'center', textStyle: { color: '#909399', fontSize: 14 } }, series: [] })
      return
    }
    anomalyChartIns.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        label: { formatter: '{b}\n{c}条' },
        data: keys.map(k => ({ name: k, value: stats[k] }))
      }]
    })
  }
}

function track(sid) { router.push(`/sample-track?id=${sid}`) }
function goCompare() { router.push('/version-compare') }
function goReview() { router.push('/review') }

watch(() => currentVersionId.value, load)
onMounted(load)
</script>
