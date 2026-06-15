<template>
  <div>
    <h2 class="page-title">数据导入</h2>

    <div class="page-container">
      <el-alert
        title="导入说明"
        type="info"
        :closable="false"
        style="margin-bottom: 24px"
      >
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>支持CSV和Excel格式文件导入</li>
          <li>浮标数据缺失时不会整批失败，能算的先算，缺口会列出来</li>
          <li>水质预警和地图展示共用同一批处理记录</li>
          <li>导入后可在"数据缺口"页面查看待补全的数据</li>
        </ul>
      </el-alert>

      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :file-list="fileList"
        accept=".csv,.xlsx,.xls"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            仅支持 CSV、XLS、XLSX 格式文件
          </div>
        </template>
      </el-upload>

      <div style="margin-top: 24px; text-align: center;">
        <el-button type="primary" :loading="uploading" @click="startImport" :disabled="!selectedFile">
          开始导入
        </el-button>
      </div>
    </div>

    <div v-if="importResult" class="page-container" style="margin-top: 24px">
      <h3 style="margin-bottom: 16px">导入结果</h3>

      <el-result
        :icon="importResult.failed_count > 0 ? 'warning' : 'success'"
        :title="importResult.message"
        :sub-title="`批次号: ${importResult.batch_no}`"
      >
        <template #extra>
          <el-row :gutter="16">
            <el-col :span="6">
              <div class="result-stat">
                <div class="result-stat-value">{{ importResult.total_records }}</div>
                <div class="result-stat-label">总记录</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="result-stat success">
                <div class="result-stat-value">{{ importResult.success_count }}</div>
                <div class="result-stat-label">成功</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="result-stat warning">
                <div class="result-stat-value">{{ importResult.partial_count }}</div>
                <div class="result-stat-label">部分成功</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="result-stat danger">
                <div class="result-stat-value">{{ importResult.failed_count }}</div>
                <div class="result-stat-label">失败</div>
              </div>
            </el-col>
          </el-row>
        </template>
      </el-result>

      <div v-if="importResult.gaps && importResult.gaps.length > 0" style="margin-top: 24px">
        <h4 style="margin-bottom: 16px; color: #e6a23c">
          <el-icon><warning /></el-icon>
          数据缺口清单（共 {{ importResult.gaps.length }} 个）
        </h4>
        <el-table :data="importResult.gaps" style="width: 100%">
          <el-table-column prop="gap_type" label="缺口类型" width="140">
            <template #default="{ row }">
              <el-tag v-if="row.gap_type === 'buoy_missing'" type="warning">浮标数据缺失</el-tag>
              <el-tag v-else-if="row.gap_type === 'inspection_missing'" type="info">巡检数据缺失</el-tag>
              <el-tag v-else type="danger">计算失败</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="缺口描述" show-overflow-tooltip />
          <el-table-column prop="missing_fields" label="缺失字段" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 16px; text-align: right;">
          <el-button type="primary" @click="goToGaps">前往数据缺口页面补全</el-button>
        </div>
      </div>
    </div>

    <div class="page-container" style="margin-top: 24px">
      <h3 style="margin-bottom: 16px">导入模板字段说明</h3>
      <el-table :data="templateFields" style="width: 100%">
        <el-table-column prop="field" label="字段名" width="180" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="required" label="必填" width="80">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'" size="small">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="example" label="示例" width="200" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { uploadData } from '@/api'

const router = useRouter()
const fileList = ref([])
const selectedFile = ref(null)
const uploading = ref(false)
const importResult = ref(null)

const templateFields = [
  { field: 'beach_code', type: '字符串', required: true, description: '浴场编码', example: 'BEACH001' },
  { field: 'beach_name', type: '字符串', required: false, description: '浴场名称', example: '第一海水浴场' },
  { field: 'beach_latitude', type: '数字', required: false, description: '浴场纬度', example: '36.0671' },
  { field: 'beach_longitude', type: '数字', required: false, description: '浴场经度', example: '120.3826' },
  { field: 'record_no', type: '字符串', required: true, description: '巡检记录编号', example: 'INSP20240101001' },
  { field: 'inspection_time', type: '日期时间', required: true, description: '巡检时间', example: '2024-01-01 10:00:00' },
  { field: 'inspector', type: '字符串', required: false, description: '巡检人员', example: '张三' },
  { field: 'photo_path', type: '字符串', required: false, description: '巡检照片路径', example: '/photos/beach001_001.jpg' },
  { field: 'photo_name', type: '字符串', required: false, description: '照片名称', example: 'beach001_001.jpg' },
  { field: 'buoy_id', type: '字符串', required: true, description: '浮标编号', example: 'BUOY001' },
  { field: 'record_time', type: '日期时间', required: true, description: '浮标记录时间', example: '2024-01-01 10:00:00' },
  { field: 'latitude', type: '数字', required: false, description: '浮标纬度', example: '36.0700' },
  { field: 'longitude', type: '数字', required: false, description: '浮标经度', example: '120.3850' },
  { field: 'water_temperature', type: '数字', required: false, description: '水温(℃)', example: '22.5' },
  { field: 'ph_value', type: '数字', required: false, description: 'pH值', example: '8.1' },
  { field: 'dissolved_oxygen', type: '数字', required: false, description: '溶解氧(mg/L)', example: '7.2' },
  { field: 'turbidity', type: '数字', required: false, description: '浊度(NTU)', example: '5.0' },
  { field: 'salinity', type: '数字', required: false, description: '盐度(psu)', example: '30.5' }
]

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const handleFileChange = (file) => {
  selectedFile.value = file.raw
  fileList.value = [file]
}

const startImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  uploading.value = true
  try {
    importResult.value = await uploadData(selectedFile.value)
    ElMessage.success('导入完成')
  } catch (error) {
    ElMessage.error('导入失败: ' + (error.response?.data?.detail || error.message))
  } finally {
    uploading.value = false
  }
}

const goToGaps = () => {
  router.push('/gaps')
}
</script>

<style lang="scss" scoped>
.result-stat {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;

  &.success .result-stat-value {
    color: #67c23a;
  }

  &.warning .result-stat-value {
    color: #e6a23c;
  }

  &.danger .result-stat-value {
    color: #f56c6c;
  }

  .result-stat-value {
    font-size: 32px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .result-stat-label {
    font-size: 14px;
    color: #909399;
  }
}
</style>
