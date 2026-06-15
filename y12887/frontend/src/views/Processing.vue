<template>
  <div>
    <h2 class="page-title">处理记录</h2>

    <div class="page-container">
      <el-alert
        title="数据一致性说明"
        type="info"
        :closable="false"
        style="margin-bottom: 24px"
      >
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>水质预警和地图展示共用同一批处理记录</li>
          <li>界面展示和报告导出使用同一数据源，确保数据一致</li>
          <li>所有修改操作留痕，可追溯</li>
        </ul>
      </el-alert>

      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="批次号">
          <el-input v-model="queryForm.batch_no" placeholder="请输入批次号" clearable />
        </el-form-item>
        <el-form-item label="风险等级">
          <el-select v-model="queryForm.risk_level" placeholder="全部" clearable>
            <el-option label="高风险" value="高风险" />
            <el-option label="中风险" value="中风险" />
            <el-option label="低风险" value="低风险" />
            <el-option label="正常" value="正常" />
          </el-select>
        </el-form-item>
        <el-form-item label="计算状态">
          <el-select v-model="queryForm.calculation_status" placeholder="全部" clearable>
            <el-option label="成功" value="success" />
            <el-option label="部分成功" value="partial" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否异常">
          <el-select v-model="queryForm.has_abnormal" placeholder="全部" clearable>
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadRecords">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button type="success" @click="exportRecords">导出</el-button>
          <el-button type="warning" @click="exportReport">导出风险报告</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="records" style="width: 100%" v-loading="loading">
        <el-table-column prop="batch_no" label="批次号" width="160" />
        <el-table-column label="浴场" width="150">
          <template #default="{ row }">
            {{ row.beach?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="risk_level" label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.risk_level)">
              {{ row.risk_level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="risk_score" label="风险评分" width="100" />
        <el-table-column prop="trajectory_drift" label="漂移量(米)" width="120">
          <template #default="{ row }">
            {{ row.trajectory_drift || '-' }}
            <el-tag v-if="row.is_drift_abnormal" type="danger" size="small">异常</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="water_quality_level" label="水质等级" width="100" />
        <el-table-column prop="calculation_status" label="计算状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.calculation_status === 'success'" type="success">成功</el-tag>
            <el-tag v-else-if="row.calculation_status === 'partial'" type="warning">部分成功</el-tag>
            <el-tag v-else type="danger">失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_reviewed" label="复核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_reviewed ? 'success' : 'warning'">
              {{ row.is_reviewed ? '已复核' : '待复核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="process_time" label="处理时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.process_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="failure_reason" label="失败原因" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goToDetail(row)">详情</el-button>
            <el-button type="success" link @click="goToReview(row)">复核</el-button>
            <el-button type="info" link @click="goToMap(row)">地图</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end;"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadRecords"
        @current-change="loadRecords"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { getProcessingRecords, exportProcessingRecords, exportRiskReport } from '@/api'

const router = useRouter()
const loading = ref(false)
const records = ref([])

const queryForm = reactive({
  batch_no: '',
  risk_level: '',
  calculation_status: '',
  has_abnormal: null
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const getRiskTagType = (level) => {
  const types = {
    '高风险': 'danger',
    '中风险': 'warning',
    '低风险': 'primary',
    '正常': 'success'
  }
  return types[level] || 'info'
}

const loadRecords = async () => {
  loading.value = true
  try {
    const params = {
      skip: (pagination.page - 1) * pagination.pageSize,
      limit: pagination.pageSize
    }
    if (queryForm.batch_no) params.batch_no = queryForm.batch_no
    if (queryForm.risk_level) params.risk_level = queryForm.risk_level
    if (queryForm.calculation_status) params.calculation_status = queryForm.calculation_status
    if (queryForm.has_abnormal !== null) params.has_abnormal = queryForm.has_abnormal

    records.value = await getProcessingRecords(params)
    pagination.total = records.value.length
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  queryForm.batch_no = ''
  queryForm.risk_level = ''
  queryForm.calculation_status = ''
  queryForm.has_abnormal = null
  pagination.page = 1
  loadRecords()
}

const goToDetail = (row) => {
  router.push(`/anomalies/${row.id}`)
}

const goToReview = (row) => {
  router.push('/review')
}

const goToMap = (row) => {
  router.push('/map')
}

const exportRecords = async () => {
  try {
    const blob = await exportProcessingRecords({ batch_no: queryForm.batch_no })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `processing_records_${dayjs().format('YYYYMMDDHHmmss')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const exportReport = async () => {
  if (!queryForm.batch_no && records.value.length > 0) {
    queryForm.batch_no = records.value[0].batch_no
  }
  if (!queryForm.batch_no) {
    ElMessage.warning('请先选择批次号')
    return
  }
  try {
    const blob = await exportRiskReport({ batch_no: queryForm.batch_no })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `risk_report_${queryForm.batch_no}_${dayjs().format('YYYYMMDDHHmmss')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('报告导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  loadRecords()
})
</script>
