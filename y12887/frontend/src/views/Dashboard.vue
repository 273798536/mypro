<template>
  <div>
    <h2 class="page-title">数据概览</h2>

    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">总处理记录</div>
          <div class="stat-value">{{ statistics.total || 0 }}</div>
          <div class="stat-trend up">实时更新</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">高风险</div>
          <div class="stat-value" style="color: #f56c6c">{{ statistics.risk_level?.high || 0 }}</div>
          <div class="stat-trend up">需立即处理</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">中风险</div>
          <div class="stat-value" style="color: #e6a23c">{{ statistics.risk_level?.medium || 0 }}</div>
          <div class="stat-trend up">需关注</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">数据缺口</div>
          <div class="stat-value" style="color: #909399">{{ gapCount }}</div>
          <div class="stat-trend down">待补全</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 24px">
      <el-col :span="12">
        <div class="page-container">
          <h3 style="margin-bottom: 16px">计算状态分布</h3>
          <div ref="calcChart" style="height: 300px"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-container">
          <h3 style="margin-bottom: 16px">异常类型分布</h3>
          <div ref="anomalyChart" style="height: 300px"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 24px">
      <el-col :span="24">
        <div class="page-container">
          <h3 style="margin-bottom: 16px">最近异常记录</h3>
          <el-table :data="recentAnomalies" style="width: 100%">
            <el-table-column prop="anomaly_no" label="异常编号" width="160" />
            <el-table-column prop="anomaly_type" label="异常类型" width="140">
              <template #default="{ row }">
                <el-tag v-if="row.anomaly_type === 'trajectory_drift'" type="warning">轨迹漂移</el-tag>
                <el-tag v-else-if="row.anomaly_type === 'water_quality'" type="danger">水质异常</el-tag>
                <el-tag v-else type="info">禁航区越界</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="anomaly_level" label="等级" width="100">
              <template #default="{ row }">
                <el-tag :type="row.anomaly_level === '严重' ? 'danger' : row.anomaly_level === '一般' ? 'warning' : 'info'">
                  {{ row.anomaly_level }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="异常描述" show-overflow-tooltip />
            <el-table-column prop="occurrence_time" label="发生时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.occurrence_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link @click="goToDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { getProcessingStatistics, getProcessingRecords, getDataGaps } from '@/api'

const router = useRouter()
const statistics = ref({})
const gapCount = ref(0)
const recentAnomalies = ref([])
const calcChart = ref(null)
const anomalyChart = ref(null)

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const loadData = async () => {
  try {
    statistics.value = await getProcessingStatistics()

    const gaps = await getDataGaps({ is_filled: false })
    gapCount.value = gaps.length || 0

    const records = await getProcessingRecords({ has_abnormal: true, limit: 10 })
    const anomalies = []
    records.forEach(r => {
      if (r.anomalies) {
        anomalies.push(...r.anomalies)
      }
    })
    recentAnomalies.value = anomalies.slice(0, 10)

    renderCharts()
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const renderCharts = () => {
  if (calcChart.value) {
    const calc = echarts.init(calcChart.value)
    calc.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: '0' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: statistics.value.calculation_status?.success || 0, name: '成功', itemStyle: { color: '#67c23a' } },
          { value: statistics.value.calculation_status?.partial || 0, name: '部分成功', itemStyle: { color: '#e6a23c' } },
          { value: statistics.value.calculation_status?.failed || 0, name: '失败', itemStyle: { color: '#f56c6c' } }
        ]
      }]
    })
  }

  if (anomalyChart.value) {
    const anomaly = echarts.init(anomalyChart.value)
    anomaly.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: ['轨迹漂移', '水质异常']
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: [
          { value: statistics.value.abnormal_types?.trajectory_drift || 0, itemStyle: { color: '#e6a23c' } },
          { value: statistics.value.abnormal_types?.water_quality || 0, itemStyle: { color: '#f56c6c' } }
        ]
      }]
    })
  }
}

const goToDetail = (row) => {
  router.push(`/anomalies/${row.id}`)
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.stat-row {
  margin-bottom: 8px;
}
</style>
