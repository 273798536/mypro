<template>
  <div>
    <h2 class="page-title">数据缺口</h2>

    <div class="page-container">
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="批次号">
          <el-input v-model="queryForm.batch_no" placeholder="请输入批次号" clearable />
        </el-form-item>
        <el-form-item label="缺口类型">
          <el-select v-model="queryForm.gap_type" placeholder="全部" clearable>
            <el-option label="浮标数据缺失" value="buoy_missing" />
            <el-option label="巡检数据缺失" value="inspection_missing" />
            <el-option label="计算失败" value="calc_failure" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否补全">
          <el-select v-model="queryForm.is_filled" placeholder="全部" clearable>
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadGaps">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button type="success" @click="exportGaps">导出清单</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="gaps" style="width: 100%" v-loading="loading">
        <el-table-column prop="batch_no" label="批次号" width="180" />
        <el-table-column prop="gap_type" label="缺口类型" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.gap_type === 'buoy_missing'" type="warning">浮标数据缺失</el-tag>
            <el-tag v-else-if="row.gap_type === 'inspection_missing'" type="info">巡检数据缺失</el-tag>
            <el-tag v-else type="danger">计算失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="缺口描述" show-overflow-tooltip />
        <el-table-column prop="missing_data_time" label="缺失数据时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.missing_data_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="missing_fields" label="缺失字段" show-overflow-tooltip />
        <el-table-column prop="is_filled" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_filled ? 'success' : 'warning'">
              {{ row.is_filled ? '已补全' : '待补全' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="filled_by" label="补全人" width="100" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.is_filled"
              type="primary"
              link
              @click="openFillDialog(row)"
            >
              补全
            </el-button>
            <el-button type="success" link @click="viewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="fillDialogVisible" title="补全数据缺口" width="500px">
      <el-form :model="fillForm" label-width="100px">
        <el-form-item label="缺口描述">
          <el-input :value="currentGap?.description" disabled />
        </el-form-item>
        <el-form-item label="缺失字段">
          <el-input :value="currentGap?.missing_fields" disabled />
        </el-form-item>
        <el-form-item label="补全人" required>
          <el-input v-model="fillForm.filled_by" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="补全说明" required>
          <el-input
            v-model="fillForm.fill_note"
            type="textarea"
            :rows="3"
            placeholder="请说明数据补全情况"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fillDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFill" :loading="submitting">
          确认补全
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { getDataGaps, fillDataGap, exportGaps as exportGapsApi } from '@/api'

const loading = ref(false)
const gaps = ref([])
const fillDialogVisible = ref(false)
const currentGap = ref(null)
const submitting = ref(false)

const queryForm = reactive({
  batch_no: '',
  gap_type: '',
  is_filled: null
})

const fillForm = reactive({
  filled_by: '',
  fill_note: ''
})

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const loadGaps = async () => {
  loading.value = true
  try {
    const params = {}
    if (queryForm.batch_no) params.batch_no = queryForm.batch_no
    if (queryForm.gap_type) params.gap_type = queryForm.gap_type
    if (queryForm.is_filled !== null) params.is_filled = queryForm.is_filled

    gaps.value = await getDataGaps(params)
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  queryForm.batch_no = ''
  queryForm.gap_type = ''
  queryForm.is_filled = null
  loadGaps()
}

const openFillDialog = (row) => {
  currentGap.value = row
  fillForm.filled_by = ''
  fillForm.fill_note = ''
  fillDialogVisible.value = true
}

const submitFill = async () => {
  if (!fillForm.filled_by || !fillForm.fill_note) {
    ElMessage.warning('请填写补全人和补全说明')
    return
  }

  submitting.value = true
  try {
    await fillDataGap(currentGap.value.id, fillForm)
    ElMessage.success('补全成功')
    fillDialogVisible.value = false
    loadGaps()
  } catch (error) {
    ElMessage.error('补全失败')
  } finally {
    submitting.value = false
  }
}

const viewDetail = (row) => {
  console.log('查看详情:', row)
}

const exportGaps = async () => {
  try {
    const blob = await exportGapsApi({ is_filled: queryForm.is_filled })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data_gaps_${dayjs().format('YYYYMMDDHHmmss')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  loadGaps()
})
</script>
