<template>
  <div>
    <h2 class="page-title">追溯查询</h2>

    <div class="page-container">
      <el-alert
        title="追溯说明"
        type="info"
        :closable="false"
        style="margin-bottom: 24px"
      >
        <p style="margin: 4px 0;">
          验收标准：顺着一条异常往回查，能查到巡检照片和处理意见才算顺。
        </p>
        <p style="margin: 4px 0;">
          完整追溯链路：异常记录 → 处理记录 → 巡检记录（含照片） + 浮标数据 → 浴场信息 → 处理意见 → 复核意见
        </p>
      </el-alert>

      <el-form :inline="true" :model="queryForm" style="margin-bottom: 24px;">
        <el-form-item label="异常编号">
          <el-input v-model="queryForm.anomaly_no" placeholder="请输入异常编号，如ANOM20240101ABC123" style="width: 300px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doTrace" :loading="tracing">
            追溯查询
          </el-button>
          <el-button @click="checkChain" :loading="checking" type="success">
            检查链路完整性
          </el-button>
        </el-form-item>
      </el-form>

      <div v-if="chainCheckResult" class="chain-check" :class="{ valid: chainCheckResult.valid, invalid: !chainCheckResult.valid }">
        <el-icon v-if="chainCheckResult.valid" :size="24" color="#67c23a"><CircleCheckFilled /></el-icon>
        <el-icon v-else :size="24" color="#f56c6c"><CircleCloseFilled /></el-icon>
        <span>{{ chainCheckResult.message }}</span>
        <div v-if="!chainCheckResult.valid" style="margin-top: 8px; font-size: 13px;">
          <span v-if="!chainCheckResult.has_photo" style="color: #f56c6c;">缺少巡检照片 | </span>
          <span v-if="!chainCheckResult.has_processing_opinion" style="color: #f56c6c;">缺少处理意见</span>
        </div>
      </div>

      <div v-if="traceData" class="trace-result">
        <h3 style="margin-bottom: 16px;">追溯链路</h3>

        <div class="trace-step" v-for="step in traceData.trace_path" :key="step.step">
          <div class="step-number">{{ step.step }}</div>
          <div class="step-content">
            <div class="step-title">
              <el-icon v-if="step.type === 'anomaly'" color="#f56c6c"><Warning /></el-icon>
              <el-icon v-else-if="step.type === 'processing'" color="#409eff"><Document /></el-icon>
              <el-icon v-else-if="step.type === 'inspection'" color="#67c23a"><CameraFilled /></el-icon>
              <el-icon v-else-if="step.type === 'buoy'" color="#e6a23c"><Position /></el-icon>
              <el-icon v-else-if="step.type === 'beach'" color="#909399"><Location /></el-icon>
              <el-icon v-else-if="step.type === 'opinion'" color="#67c23a"><Edit /></el-icon>
              <el-icon v-else-if="step.type === 'review'" color="#909399"><Check /></el-icon>
              {{ step.name }}
            </div>
            <div class="step-detail">{{ step.detail }}</div>
            <div v-if="step.has_photo" class="step-photo">
              <el-tag type="success">含照片</el-tag>
              <el-button type="primary" link size="small" @click="viewPhoto(step.id)">
                查看照片
              </el-button>
            </div>
          </div>
        </div>

        <el-row :gutter="16" style="margin-top: 24px;">
          <el-col :span="12">
            <div class="page-container" style="padding: 16px;">
              <h4 style="margin-bottom: 12px;">关联信息</h4>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="异常编号">
                  {{ traceData.anomaly.anomaly_no }}
                </el-descriptions-item>
                <el-descriptions-item label="异常类型">
                  <el-tag v-if="traceData.anomaly.anomaly_type === 'trajectory_drift'" type="warning">轨迹漂移</el-tag>
                  <el-tag v-else-if="traceData.anomaly.anomaly_type === 'water_quality'" type="danger">水质异常</el-tag>
                  <el-tag v-else type="info">禁航区越界</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="异常等级">
                  <el-tag :type="traceData.anomaly.anomaly_level === '严重' ? 'danger' : 'warning'">
                    {{ traceData.anomaly.anomaly_level }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="风险等级">
                  <el-tag :type="getRiskTagType(traceData.processing_record.risk_level)">
                    {{ traceData.processing_record.risk_level }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="处理意见">
                  {{ traceData.processing_record.processing_opinion || '暂无' }}
                </el-descriptions-item>
                <el-descriptions-item label="复核意见">
                  {{ traceData.processing_record.review_opinion || '暂无' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-col>

          <el-col :span="12">
            <div v-if="photoUrl" class="page-container" style="padding: 16px;">
              <h4 style="margin-bottom: 12px;">巡检照片</h4>
              <el-image
                :src="photoUrl"
                :preview-src-list="[photoUrl]"
                style="width: 100%; height: 250px;"
                fit="cover"
              />
              <div style="margin-top: 8px; font-size: 13px; color: #909399;">
                照片名称: {{ traceData.inspection?.photo_name || '-' }}
              </div>
            </div>
            <div v-else class="page-container" style="padding: 16px; text-align: center;">
              <el-empty description="无巡检照片" />
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { traceAnomaly, checkTraceChain, getPhotoPreview } from '@/api'

const route = useRoute()

const queryForm = reactive({
  anomaly_no: ''
})

const tracing = ref(false)
const checking = ref(false)
const traceData = ref(null)
const chainCheckResult = ref(null)
const photoUrl = ref(null)

const getRiskTagType = (level) => {
  const types = {
    '高风险': 'danger',
    '中风险': 'warning',
    '低风险': 'primary',
    '正常': 'success'
  }
  return types[level] || 'info'
}

const doTrace = async () => {
  if (!queryForm.anomaly_no) {
    ElMessage.warning('请输入异常编号')
    return
  }

  tracing.value = true
  photoUrl.value = null
  try {
    traceData.value = await traceAnomaly(queryForm.anomaly_no)

    if (traceData.value.inspection?.photo_path) {
      const preview = await getPhotoPreview(traceData.value.inspection.id)
      if (preview.file_exists) {
        photoUrl.value = preview.api_url
      }
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '追溯失败')
    traceData.value = null
  } finally {
    tracing.value = false
  }
}

const checkChain = async () => {
  if (!queryForm.anomaly_no) {
    ElMessage.warning('请输入异常编号')
    return
  }

  checking.value = true
  try {
    chainCheckResult.value = await checkTraceChain(queryForm.anomaly_no)
  } catch (error) {
    ElMessage.error('检查失败')
  } finally {
    checking.value = false
  }
}

const viewPhoto = async (inspectionId) => {
  try {
    const preview = await getPhotoPreview(inspectionId)
    if (preview.file_exists) {
      photoUrl.value = preview.api_url
    } else {
      ElMessage.warning('照片文件不存在')
    }
  } catch (error) {
    ElMessage.error('加载照片失败')
  }
}

onMounted(() => {
  if (route.query.anomaly_no) {
    queryForm.anomaly_no = route.query.anomaly_no
    doTrace()
    checkChain()
  }
})
</script>

<style lang="scss" scoped>
.chain-check {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;

  &.valid {
    background: #f0f9eb;
    border: 1px solid #e1f3d8;
    color: #67c23a;
  }

  &.invalid {
    background: #fef0f0;
    border: 1px solid #fde2e2;
    color: #f56c6c;
  }
}

.trace-result {
  margin-top: 24px;
}
</style>
