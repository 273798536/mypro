<template>
  <div class="page-wrapper">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card class="dashboard-card">
          <div class="label">今日计算</div>
          <div class="num" style="color: #409eff;">{{ stats.today_calc_count || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="dashboard-card">
          <div class="label">⏳ 待复核</div>
          <div class="num" style="color: #e6a23c;">{{ ss.pending || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="dashboard-card">
          <div class="label">✅ 已确认</div>
          <div class="num" style="color: #67c23a;">{{ (ss.confirmed || 0) + (ss.available || 0) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="dashboard-card">
          <div class="label">⚠️ 负深度警报</div>
          <div class="num" style="color: #f56c6c;">{{ stats.negative_depth_alerts || 0 }}</div>
          <div style="font-size: 12px; color: #909399;">深度≤0m样点数，已自动剔除</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 20px;">
      <el-col :span="14">
        <el-card>
          <template #header><strong>最近7天潮窗状态</strong></template>
          <div ref="trendRef" style="height: 280px;"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>状态分布</strong>
              <el-button type="primary" size="small" link @click="$router.push('/tide-window')">
                查看全部 →
              </el-button>
            </div>
          </template>
          <div ref="pieRef" style="height: 280px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>🚨 待海事安全员复核（⏳ 暂缓）</strong>
              <el-tag type="warning">{{ ss.pending || 0 }}条</el-tag>
            </div>
          </template>
          <el-table :data="pendingList" size="small" @row-click="goDetail" style="cursor:pointer;">
            <el-table-column prop="vessel_name" label="船名" width="120" />
            <el-table-column prop="port_code" label="港口" width="100" />
            <el-table-column prop="work_date" label="作业日期" width="120" />
            <el-table-column label="潮窗" width="260">
              <template #default="{r}">
                {{ r.window_start ? fmt(r.window_start) : '-' }} ~ {{ r.window_end ? fmt(r.window_end) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="negative_depth_count" label="负深度" width="80" align="center">
              <template #default="{r}">
                <el-tag v-if="r.negative_depth_count > 0" type="danger" size="small">{{ r.negative_depth_count }}</el-tag>
                <span v-else>0</span>
              </template>
            </el-table-column>
            <el-table-column prop="tide_water_match_score" label="匹配度%" width="90" align="center">
              <template #default="{r}">
                <el-tag v-if="r.tide_water_match_score < 60" type="warning" size="small">{{ r.tide_water_match_score?.toFixed?.(0) || 0 }}</el-tag>
                <span v-else>{{ r.tide_water_match_score?.toFixed?.(0) || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="pending_reason" label="暂缓原因" show-overflow-tooltip />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{row}">
                <el-button type="primary" size="small" @click.stop="goDetail(row)">去复核</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!pendingList.length" description="暂无待复核记录" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { tideApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const trendRef = ref()
const pieRef = ref()
const stats = reactive({})
const ss = reactive({ available: 0, pending: 0, recollect: 0, confirmed: 0, total: 0 })
const pendingList = ref([])
const fmt = (t) => dayjs(t).format('MM-DD HH:mm')

const load = async () => {
  const { data } = await tideApi.dashboard()
  Object.assign(stats, data)
  Object.assign(ss, data.status_stats || {})
  renderTrend(data.last_7_days_trend || [])
  renderPie()
  const { data: lr } = await tideApi.list({ data_status: 'pending', page_size: 10, page: 1 })
  pendingList.value = lr.items || []
}

const renderTrend = (list) => {
  nextTick(() => {
    const dates = list.map(d => d.date)
    const avail = list.map(d => (d.available || 0) + (d.confirmed || 0))
    const pend = list.map(d => d.pending || 0)
    const rec = list.map(d => d.recollect || 0)
    const chart = echarts.init(trendRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['可用/已确认', '暂缓', '需重采'] },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value' },
      series: [
        { name: '可用/已确认', type: 'bar', stack: 't', data: avail, itemStyle: { color: '#67c23a' } },
        { name: '暂缓', type: 'bar', stack: 't', data: pend, itemStyle: { color: '#e6a23c' } },
        { name: '需重采', type: 'bar', stack: 't', data: rec, itemStyle: { color: '#f56c6c' } },
      ]
    })
  })
}

const renderPie = () => {
  nextTick(() => {
    const chart = echarts.init(pieRef.value)
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
        label: { formatter: '{b}\n{c}条' },
        data: [
          { name: '可用', value: ss.available || 0, itemStyle: { color: '#67c23a' } },
          { name: '暂缓', value: ss.pending || 0, itemStyle: { color: '#e6a23c' } },
          { name: '需重采', value: ss.recollect || 0, itemStyle: { color: '#f56c6c' } },
          { name: '已确认', value: ss.confirmed || 0, itemStyle: { color: '#409eff' } },
        ]
      }]
    })
  })
}

const goDetail = (row) => router.push(`/tide-window/${row.id}`)

onMounted(load)
</script>
