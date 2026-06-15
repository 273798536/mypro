<template>
  <div>
    <h2 class="page-title">异常管理</h2>

    <div class="page-container">
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="异常类型">
          <el-select v-model="queryForm.anomaly_type" placeholder="全部" clearable>
            <el-option label="轨迹漂移" value="trajectory_drift" />
            <el-option label="水质异常" value="water_quality" />
            <el-option label="禁航区越界" value="no_navigation_violation" />
          </el-select>
        </el-form-item>
        <el-form-item label="异常等级">
          <el-select v-model="queryForm.anomaly_level" placeholder="全部" clearable>
            <el-option label="轻微" value="轻微" />
            <el-option label="一般" value="一般" />
            <el-option label="严重" value="严重" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否解决">
          <el-select v-model="queryForm.is_resolved" placeholder="全部" clearable>
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAnomalies">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="anomalies" style="width: 100%" v-loading="loading">
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
        <el-table-column prop="anomaly_value" label="异常值" width="100">
          <template #default="{ row }">
            {{ row.anomaly_value }}{{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="threshold" label="阈值" width="100">
          <template #default="{ row }">
            {{ row.threshold }}{{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="异常描述" show-overflow-tooltip />
        <el-table-column prop="occurrence_time" label="发生时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.occurrence_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="is_resolved" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_resolved ? 'success' : 'danger'">
              {{ row.is_resolved ? '已解决' : '未解决' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goToDetail(row)">详情</el-button>
            <el-button type="success" link @click="goToTrace(row)">追溯</el-button>
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
        @size-change="loadAnomalies"
        @current-change="loadAnomalies"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { getProcessingRecords } from '@/api'

const router = useRouter()
const loading = ref(false)
const anomalies = ref([])

const queryForm = reactive({
  anomaly_type: '',
  anomaly_level: '',
  is_resolved: null
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const loadAnomalies = async () => {
  loading.value = true
  try {
    const records = await getProcessingRecords({
      has_abnormal: true,
      skip: (pagination.page - 1) * pagination.pageSize,
      limit: pagination.pageSize
    })

    const allAnomalies = []
    records.forEach(r => {
      if (r.anomalies) {
        r.anomalies.forEach(a => {
          if (queryForm.anomaly_type && a.anomaly_type !== queryForm.anomaly_type) return
          if (queryForm.anomaly_level && a.anomaly_level !== queryForm.anomaly_level) return
          if (queryForm.is_resolved !== null && a.is_resolved !== queryForm.is_resolved) return
          allAnomalies.push(a)
        })
      }
    })

    anomalies.value = allAnomalies
    pagination.total = allAnomalies.length
  } catch (error) {
    console.error('加载异常记录失败:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  queryForm.anomaly_type = ''
  queryForm.anomaly_level = ''
  queryForm.is_resolved = null
  loadAnomalies()
}

const goToDetail = (row) => {
  router.push(`/anomalies/${row.id}`)
}

const goToTrace = (row) => {
  router.push({ path: '/trace', query: { anomaly_no: row.anomaly_no } })
}

onMounted(() => {
  loadAnomalies()
})
</script>
