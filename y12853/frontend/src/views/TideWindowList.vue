<template>
  <div class="page-wrapper">
    <el-card style="margin-bottom: 16px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>🌊 港口拖轮潮窗 · 结果列表</strong>
        <el-button type="primary" @click="calcVisible = true">
          <el-icon><Plus /></el-icon> 新增计算
        </el-button>
      </div>
    </el-card>

    <el-card style="margin-bottom: 16px;">
      <el-form :inline="true" :model="f" label-width="80px">
        <el-form-item label="港口">
          <el-input v-model="f.port_code" placeholder="CNQIN" clearable />
        </el-form-item>
        <el-form-item label="船名">
          <el-input v-model="f.vessel_name" clearable />
        </el-form-item>
        <el-form-item label="作业日期">
          <el-date-picker v-model="f.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="f.data_status" placeholder="全部" clearable>
            <el-option label="✅ 可用" value="available" />
            <el-option label="⏳ 暂缓(待复核)" value="pending" />
            <el-option label="🔄 需重采" value="recollect" />
            <el-option label="✅ 已确认通过" value="confirmed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-space>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-space>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <template #header>
        <div style="display:flex; justify-content: space-between; align-items:center;">
          <div>
            <el-space wrap>
              <el-tag effect="plain">共 {{ total }} 条</el-tag>
              <el-tag type="success" effect="plain">✅ 可用 {{ statusCount.available }} 条</el-tag>
              <el-tag type="warning" effect="plain">⏳ 暂缓 {{ statusCount.pending }} 条</el-tag>
              <el-tag type="danger" effect="plain">🔄 需重采 {{ statusCount.recollect }} 条</el-tag>
              <el-tag type="primary" effect="plain">✓ 已确认 {{ statusCount.confirmed }} 条</el-tag>
            </el-space>
          </div>
        </div>
      </template>
      <el-table :data="list" style="width:100%;" @row-click="goDetail">
        <el-table-column type="index" width="60" label="#" />
        <el-table-column prop="vessel_name" label="船名" width="110" />
        <el-table-column prop="port_code" label="港口" width="90" />
        <el-table-column prop="work_date" label="作业日期" width="110" />
        <el-table-column label="潮窗时段" width="250">
          <template #default="{row}">
            <div v-if="row.window_start && row.window_end" style="color:#303133; font-weight:500;">
              {{ fmt(row.window_start) }} ~ {{ fmt(row.window_end) }}
            </div>
            <div v-else style="color:#f56c6c;">无可用潮窗</div>
          </template>
        </el-table-column>
        <el-table-column prop="window_duration_min" label="时长(分)" width="80" align="center">
          <template #default="{row}">
            <span>{{ row.window_duration_min?.toFixed?.(0) || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="水深统计(m)" width="170">
          <template #default="{row}">
            <span v-if="row.min_depth != null">
              <span style="color:#67c23a;">{{ row.min_depth?.toFixed(2) }}</span>
              /
              <span>{{ row.avg_depth?.toFixed?.(2) }}</span>
              /
              <span style="color:#e6a23c;">{{ row.max_depth?.toFixed?.(2) }}</span>
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="negative_depth_count" label="负深度" width="80" align="center">
          <template #default="{row}">
            <el-tag v-if="row.negative_depth_count > 0" type="danger" size="small">{{ row.negative_depth_count }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column label="匹配度" width="80" align="center">
          <template #default="{row}">
            <el-tag v-if="row.tide_water_match_score != null && row.tide_water_match_score < 60" type="warning" size="small">
              {{ row.tide_water_match_score?.toFixed?.(0) }}%
            </el-tag>
            <span v-else>{{ row.tide_water_match_score?.toFixed?.(0) }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="data_status" label="状态" width="130" align="center">
          <template #default="{row}">
            <el-tag v-if="row.data_status === 'available'" type="success" effect="dark">✅ 可用</el-tag>
            <el-tag v-else-if="row.data_status === 'pending'" type="warning" effect="dark">⏳ 暂缓</el-tag>
            <el-tag v-else-if="row.data_status === 'recollect'" type="danger" effect="dark">🔄 需重采</el-tag>
            <el-tag v-else-if="row.data_status === 'confirmed'" type="primary" effect="dark">✓ 已确认</el-tag>
            <el-tag v-else type="info">{{ row.data_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="draft" label="吃水(m)" width="80" align="center">
          <template #default="{row}">
            {{ row.draft?.toFixed?.(1) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{row}">
            <el-button type="primary" size="small" link @click.stop="goDetail(row)">详情/复核</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > 0"
        style="margin-top: 16px; justify-content: flex-end; display:flex;"
        background layout="total, sizes, prev, pager, next, jumper"
        :current-page="page" :page-sizes="[10, 20, 50, 100]"
        :page-size="pageSize" :total="total"
        @current-change="p => { page = p; load() }"
        @size-change="s => { pageSize = s; page = 1; load() }"
      />
    </el-card>

    <!-- 新增计算对话框 -->
    <el-dialog v-model="calcVisible" title="📐 新增潮窗计算" width="560px">
      <el-form :model="calcForm" label-width="110px" label-position="right">
        <el-form-item label="港口代码"><el-input v-model="calcForm.port_code" placeholder="CNQIN" /></el-form-item>
        <el-form-item label="港口名称"><el-input v-model="calcForm.port_name" placeholder="青岛港" /></el-form-item>
        <el-form-item label="船名"><el-input v-model="calcForm.vessel_name" placeholder="远洋一号" /></el-form-item>
        <el-form-item label="MMSI"><el-input v-model="calcForm.mmsi" placeholder="413123456" /></el-form-item>
        <el-form-item label="作业日期"><el-date-picker v-model="calcForm.work_date" type="date" value-format="YYYY-MM-DD" style="width:100%;" /></el-form-item>
        <el-form-item label="船舶吃水(m)"><el-input-number v-model="calcForm.draft" :min="0" :precision="2" :step="0.1" /></el-form-item>
        <el-form-item label="要求水深(m)"><el-input-number v-model="calcForm.required_depth" :min="0" :precision="2" :step="0.1" /></el-form-item>
        <el-form-item label="富余余量(m)"><el-input-number v-model="calcForm.under_keel_margin" :min="0" :precision="2" :step="0.1" /></el-form-item>
        <el-form-item label="复核人"><el-input v-model="calcForm.operator" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="calcVisible = false">取消</el-button>
        <el-button type="primary" :loading="calcLoading" @click="doCalc">开始计算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { tideApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const f = reactive({ port_code: '', vessel_name: '', dateRange: [], data_status: '' })
const statusCount = reactive({ available: 0, pending: 0, recollect: 0, confirmed: 0 })
const calcVisible = ref(false)
const calcLoading = ref(false)
const calcForm = reactive({
  port_code: 'CNQIN', port_name: '青岛港', vessel_name: '', mmsi: '',
  work_date: dayjs().format('YYYY-MM-DD'),
  draft: 7.5, required_depth: 8.6, under_keel_margin: 0.6, operator: '海事安全员'
})
const fmt = (t) => dayjs(t).format('YYYY-MM-DD HH:mm')

const ss = computed(() => {
  const c = { available: 0, pending: 0, recollect: 0, confirmed: 0 }
  list.value.forEach(r => { if (c[r.data_status] != null) c[r.data_status]++ })
  return c
})

const load = async () => {
  const params = { page: page.value, page_size: pageSize.value, order_by: '-work_date' }
  if (f.port_code) params.port_code = f.port_code
  if (f.vessel_name) params.vessel_name = f.vessel_name
  if (f.data_status) params.data_status = f.data_status
  if (f.dateRange && f.dateRange.length === 2) {
    params.date_from = f.dateRange[0]
    params.date_to = f.dateRange[1]
  }
  const { data } = await tideApi.list(params)
  list.value = data.items || []
  total.value = data.total || 0
  Object.assign(statusCount, ss.value)
}

const reset = () => {
  f.port_code = ''; f.vessel_name = ''; f.dateRange = []; f.data_status = ''
  page.value = 1
  load()
}

const goDetail = (row) => router.push(`/tide-window/${row.id}`)

const doCalc = async () => {
  calcLoading.value = true
  try {
    const payload = { ...calcForm, time_window_hours: 24 }
    const { data } = await tideApi.calc(payload, false)
    ElMessage.success(data.diagnostics?.is_new_or_updated ? '计算完成' : '已存在结果（幂等）')
    calcVisible.value = false
    load()
    if (data.data?.id) router.push(`/tide-window/${data.data.id}`)
  } finally {
    calcLoading.value = false
  }
}

onMounted(load)
</script>
