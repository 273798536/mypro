<template>
  <div class="upload-page">
    <el-row :gutter="24">
      <el-col :span="24" :lg="12">
        <el-card class="upload-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon color="#409EFF" :size="20"><UploadFilled /></el-icon>
              <span class="header-title">材料入口 · 文件上传</span>
            </div>
          </template>
          <div class="upload-section">
            <el-upload
              drag
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleFileChange"
              accept=".xlsx,.xls,.csv"
              :disabled="uploading"
            >
              <div class="upload-area">
                <el-icon class="upload-icon" :size="80" color="#409EFF"><UploadFilled /></el-icon>
                <div class="upload-text-main">
                  将文件拖到此处，或 <em>点击上传</em>
                </div>
                <div class="upload-text-sub">
                  支持 Excel（.xlsx / .xls）或 CSV 文件格式
                </div>
              </div>
            </el-upload>
          </div>

          <div class="file-info" v-if="selectedFile">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="文件名">
                <el-icon><Document /></el-icon>
                {{ selectedFile.name }}
              </el-descriptions-item>
              <el-descriptions-item label="文件大小">
                {{ formatFileSize(selectedFile.size) }}
              </el-descriptions-item>
            </el-descriptions>
            <div class="upload-actions">
              <el-button size="large" @click="clearFile" :disabled="uploading">清除</el-button>
              <el-button
                type="primary"
                size="large"
                :loading="uploading"
                @click="doUpload"
              >
                <el-icon><Upload /></el-icon>
                {{ uploading ? '上传中...' : '确认上传' }}
              </el-button>
            </div>
          </div>

          <el-progress
            v-if="uploading"
            :percentage="uploadProgress"
            :stroke-width="10"
            status="success"
            class="upload-progress"
          />
        </el-card>
      </el-col>

      <el-col :span="24" :lg="12">
        <el-card class="info-card" shadow="never" v-if="batchResult">
          <template #header>
            <div class="card-header">
              <el-icon color="#67c23a" :size="20"><CircleCheck /></el-icon>
              <span class="header-title">批次导入结果</span>
              <el-tag type="success" size="small" effect="light" style="margin-left: auto;">成功</el-tag>
            </div>
          </template>
          <el-row :gutter="16" class="result-stats">
            <el-col :span="12">
              <div class="stat-box stat-blue">
                <div class="stat-num">{{ batchResult.total_rows || 0 }}</div>
                <div class="stat-name">总行数</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-box stat-green">
                <div class="stat-num">{{ batchResult.inserted || 0 }}</div>
                <div class="stat-name">新增记录</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-box stat-orange">
                <div class="stat-num">{{ batchResult.updated || 0 }}</div>
                <div class="stat-name">更新记录</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-box stat-red">
                <div class="stat-num">{{ batchResult.errors || 0 }}</div>
                <div class="stat-name">错误行数</div>
              </div>
            </el-col>
          </el-row>
          <el-descriptions :column="1" border class="result-detail">
            <el-descriptions-item label="源文件名">
              {{ batchResult.filename || selectedFile?.name }}
            </el-descriptions-item>
            <el-descriptions-item label="上传时间">
              {{ currentTime }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="preview-card" shadow="never" v-if="previewRecords.length > 0">
          <template #header>
            <div class="card-header">
              <el-icon color="#e6a23c" :size="20"><View /></el-icon>
              <span class="header-title">导入记录预览（前 10 条）</span>
            </div>
          </template>
          <el-table
            :data="previewRecords"
            size="small"
            stripe
            border
            style="width: 100%"
            max-height="420"
          >
            <el-table-column prop="community" label="社区" min-width="100" />
            <el-table-column prop="street" label="街道" min-width="100" />
            <el-table-column prop="intersection" label="路口" min-width="120" />
            <el-table-column prop="address" label="地址" min-width="140" show-overflow-tooltip />
            <el-table-column prop="time_period" label="时段" width="100" />
            <el-table-column prop="peak_type" label="高峰类型" width="100" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'normal'" type="success" size="small">正常</el-tag>
                <el-tag v-else-if="row.status === 'conflict'" type="danger" size="small">冲突</el-tag>
                <el-tag v-else-if="row.status === 'suspended'" type="warning" size="small">挂起</el-tag>
                <el-tag v-else-if="row.status === 'bad_data'" type="danger" effect="plain" size="small">坏</el-tag>
                <el-tag v-else type="info" size="small">-</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card class="tips-card" shadow="never" v-if="!batchResult">
          <template #header>
            <div class="card-header">
              <el-icon color="#909399" :size="20"><InfoFilled /></el-icon>
              <span class="header-title">上传说明</span>
            </div>
          </template>
          <div class="tips-content">
            <p><el-icon color="#409EFF"><SuccessFilled /></el-icon> 请确保表格包含必要的列：社区、街道、路口、地址、时段、高峰类型等</p>
            <p><el-icon color="#67c23a"><SuccessFilled /></el-icon> 系统将自动识别重复记录并执行更新操作</p>
            <p><el-icon color="#e6a23c"><Warning /></el-icon> 上传后会自动进行坐标校验和口径一致性扫描</p>
            <p><el-icon color="#f56c6c"><CircleClose /></el-icon> 坏数据行将被标记，需在「异常处理」中人工审核</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRecordsStore } from '@/store/records'
import { uploadFile } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const store = useRecordsStore()

const selectedFile = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const batchResult = ref(null)
const previewRecords = ref([])

const currentTime = computed(() => dayjs().format('YYYY-MM-DD HH:mm:ss'))

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const handleFileChange = (file) => {
  const raw = file.raw
  const ext = raw.name.split('.').pop().toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    ElMessage.error('仅支持 .xlsx / .xls / .csv 格式文件')
    return
  }
  selectedFile.value = raw
  batchResult.value = null
  previewRecords.value = []
}

const clearFile = () => {
  selectedFile.value = null
  batchResult.value = null
  previewRecords.value = []
  uploadProgress.value = 0
}

const doUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  uploading.value = true
  uploadProgress.value = 10

  const timer = setInterval(() => {
    if (uploadProgress.value < 85) {
      uploadProgress.value += 5
    }
  }, 200)

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const res = await uploadFile(formData)
    uploadProgress.value = 100

    batchResult.value = res.batch || res.data?.batch || {
      total_rows: res.total || 0,
      inserted: res.inserted || res.created || 0,
      updated: res.updated || 0,
      errors: res.errors || 0,
      filename: res.filename || selectedFile.value.name
    }

    previewRecords.value = res.records || res.data?.records || res.preview || []

    await ElMessageBox.alert(
      `导入完成！\n总行数：${batchResult.value.total_rows}\n新增：${batchResult.value.inserted}\n更新：${batchResult.value.updated}\n错误：${batchResult.value.errors}`,
      '上传成功',
      {
        confirmButtonText: '查看记录清单',
        type: 'success'
      }
    )
    store.fetchStatistics()
    router.push('/records')
  } catch (e) {
    console.error(e)
  } finally {
    clearInterval(timer)
    uploading.value = false
    setTimeout(() => { uploadProgress.value = 0 }, 1500)
  }
}
</script>

<style scoped>
.upload-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-card,
.info-card,
.preview-card,
.tips-card {
  border-radius: 12px;
  border: none;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.upload-section {
  margin-bottom: 20px;
}

.upload-area {
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
}

.upload-icon {
  margin-bottom: 20px;
}

.upload-text-main {
  font-size: 16px;
  color: #606266;
  margin-bottom: 10px;
}

.upload-text-main em {
  color: #409EFF;
  font-style: normal;
  font-weight: 500;
}

.upload-text-sub {
  font-size: 13px;
  color: #909399;
}

.file-info {
  margin-top: 20px;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.upload-progress {
  margin-top: 16px;
}

.result-stats {
  margin-bottom: 20px;
}

.stat-box {
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  margin-bottom: 16px;
}

.stat-blue { background: linear-gradient(135deg, #ecf5ff, #e1f3ff); }
.stat-green { background: linear-gradient(135deg, #f0f9eb, #e4f8de); }
.stat-orange { background: linear-gradient(135deg, #fdf6ec, #faebd7); }
.stat-red { background: linear-gradient(135deg, #fef0f0, #fde5e5); }

.stat-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 6px;
}

.stat-blue .stat-num { color: #409EFF; }
.stat-green .stat-num { color: #67c23a; }
.stat-orange .stat-num { color: #e6a23c; }
.stat-red .stat-num { color: #f56c6c; }

.stat-name {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.result-detail {
  margin-top: 8px;
}

.tips-content {
  line-height: 2.2;
  color: #606266;
  font-size: 14px;
}

.tips-content p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
