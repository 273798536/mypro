<template>
  <div>
    <h2 class="page-title">
      <el-button type="primary" link @click="goBack">
        <el-icon><arrow-left /></el-icon>
      </el-button>
      异常详情 - {{ anomaly?.anomaly_no }}
    </h2>

    <div class="page-container" v-if="anomaly">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="异常编号">{{ anomaly.anomaly_no }}</el-descriptions-item>
        <el-descriptions-item label="异常类型">
          <el-tag v-if="anomaly.anomaly_type === 'trajectory_drift'" type="warning">轨迹漂移</el-tag>
          <el-tag v-else-if="anomaly.anomaly_type === 'water_quality'" type="danger">水质异常</el-tag>
          <el-tag v-else type="info">禁航区越界</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="异常等级">
          <el-tag :type="anomaly.anomaly_level === '严重' ? 'danger' : anomaly.anomaly_level === '一般' ? 'warning' : 'info'">
            {{ anomaly.anomaly_level }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="anomaly.is_resolved ? 'success' : 'danger'">
            {{ anomaly.is_resolved ? '已解决' : '未解决' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="异常值">{{ anomaly.anomaly_value }}{{ anomaly.unit }}</el-descriptions-item>
        <el-descriptions-item label="阈值">{{ anomaly.threshold }}{{ anomaly.unit }}</el-descriptions-item>
        <el-descriptions-item label="计算公式">{{ anomaly.formula }}</el-descriptions-item>
        <el-descriptions-item label="发生时间">{{ formatDate(anomaly.occurrence_time) }}</el-descriptions-item>
        <el-descriptions-item label="异常描述" :span="2">{{ anomaly.description }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="page-container" style="margin-top: 24px" v-if="processing">
      <h3 style="margin-bottom: 16px">关联处理记录</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="风险等级">
          <el-tag :class="getRiskClass(processing.risk_level)">{{ processing.risk_level }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="风险评分">{{ processing.risk_score }}</el-descriptions-item>
        <el-descriptions-item label="轨迹漂移量">{{ processing.trajectory_drift || '-' }} 米</el-descriptions-item>
        <el-descriptions-item label="漂移异常">{{ processing.is_drift_abnormal ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="水质等级">{{ processing.water_quality_level || '-' }}</el-descriptions-item>
        <el-descriptions-item label="水质评分">{{ processing.water_quality_score || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理意见" :span="2">{{ processing.processing_opinion || '暂无' }}</el-descriptions-item>
        <el-descriptions-item label="复核意见" :span="2">{{ processing.review_opinion || '暂无' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="page-container" style="margin-top: 24px" v-if="inspection">
      <h3 style="margin-bottom: 16px">
        关联巡检记录
        <el-tag type="success" v-if="inspection.photo_path">含照片</el-tag>
      </h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="记录编号">{{ inspection.record_no }}</el-descriptions-item>
        <el-descriptions-item label="巡检时间">{{ formatDate(inspection.inspection_time) }}</el-descriptions-item>
        <el-descriptions-item label="巡检人员">{{ inspection.inspector || '-' }}</el-descriptions-item>
        <el-descriptions-item label="天气">{{ inspection.weather || '-' }}</el-descriptions-item>
        <el-descriptions-item label="气温">{{ inspection.temperature || '-' }} ℃</el-descriptions-item>
        <el-descriptions-item label="浪高">{{ inspection.wave_height || '-' }} 米</el-descriptions-item>
        <el-descriptions-item label="潮位">{{ inspection.tide_level || '-' }}</el-descriptions-item>
        <el-descriptions-item label="照片名称">{{ inspection.photo_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ inspection.remark || '暂无' }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="photoUrl" style="margin-top: 16px">
        <h4 style="margin-bottom: 12px">巡检照片</h4>
        <el-image
          :src="photoUrl"
          :preview-src-list="[photoUrl]"
          style="width: 400px; height: 300px"
          fit="cover"
        />
      </div>
    </div>

    <div class="page-container" style="margin-top: 24px" v-if="buoyData">
      <h3 style="margin-bottom: 16px">关联浮标数据</h3>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="浮标编号">{{ buoyData.buoy_id }}</el-descriptions-item>
        <el-descriptions-item label="记录时间">{{ formatDate(buoyData.record_time) }}</el-descriptions-item>
        <el-descriptions-item label="数据完整性">
          <el-tag :type="buoyData.is_missing ? 'warning' : 'success'">
            {{ buoyData.is_missing ? '部分缺失' : '完整' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="纬度">{{ buoyData.latitude || '-' }}</el-descriptions-item>
        <el-descriptions-item label="经度">{{ buoyData.longitude || '-' }}</el-descriptions-item>
        <el-descriptions-item label="水温">{{ buoyData.water_temperature || '-' }} ℃</el-descriptions-item>
        <el-descriptions-item label="pH值">{{ buoyData.ph_value || '-' }}</el-descriptions-item>
        <el-descriptions-item label="溶解氧">{{ buoyData.dissolved_oxygen || '-' }} mg/L</el-descriptions-item>
        <el-descriptions-item label="浊度">{{ buoyData.turbidity || '-' }} NTU</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="page-container" style="margin-top: 24px">
      <h3 style="margin-bottom: 16px">复核入口</h3>
      <el-form :model="reviewForm" label-width="100px">
        <el-form-item label="处理意见">
          <el-input
            v-model="reviewForm.processing_opinion"
            type="textarea"
            :rows="3"
            placeholder="请输入处理意见，无需重新导入即可修正"
          />
        </el-form-item>
        <el-form-item label="处理人">
          <el-input v-model="reviewForm.processed_by" placeholder="请输入处理人姓名" />
        </el-form-item>
        <el-form-item label="复核意见">
          <el-input
            v-model="reviewForm.review_opinion"
            type="textarea"
            :rows="3"
            placeholder="请输入复核意见"
          />
        </el-form-item>
        <el-form-item label="复核人">
          <el-input v-model="reviewForm.reviewed_by" placeholder="请输入复核人姓名" />
        </el-form-item>
        <el-form-item label="重新计算">
          <el-switch v-model="reviewForm.need_recalculate" />
          <span style="margin-left: 8px; color: #909399">勾选后将使用最新数据重新计算</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="updateOpinion" :loading="submitting">
            保存处理意见
          </el-button>
          <el-button type="success" @click="submitReview" :loading="submitting">
            提交复核
          </el-button>
          <el-button @click="goToTrace">追溯查询</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import {
  getProcessingRecord,
  getPhotoPreview,
  updateProcessingOpinion,
  submitReview as submitReviewApi
} from '@/api'

const route = useRoute()
const router = useRouter()
const anomalyId = route.params.id

const anomaly = ref(null)
const processing = ref(null)
const inspection = ref(null)
const buoyData = ref(null)
const photoUrl = ref(null)
const submitting = ref(false)

const reviewForm = reactive({
  processing_opinion: '',
  processed_by: '',
  review_opinion: '',
  reviewed_by: '',
  need_recalculate: false
})

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const getRiskClass = (level) => {
  if (level === '高风险') return 'risk-tag high'
  if (level === '中风险') return 'risk-tag medium'
  if (level === '低风险') return 'risk-tag low'
  return 'risk-tag normal'
}

const loadData = async () => {
  try {
    const processingRecord = await getProcessingRecord(anomalyId)
    processing.value = processingRecord

    if (processingRecord.anomalies && processingRecord.anomalies.length > 0) {
      anomaly.value = processingRecord.anomalies[0]
    }

    if (processingRecord.inspection) {
      inspection.value = processingRecord.inspection
      if (inspection.value.photo_path) {
        const preview = await getPhotoPreview(inspection.value.id)
        if (preview.file_exists) {
          photoUrl.value = preview.api_url
        }
      }
    }

    if (processingRecord.buoy_data) {
      buoyData.value = processingRecord.buoy_data
    }

    reviewForm.processing_opinion = processingRecord.processing_opinion || ''
    reviewForm.processed_by = processingRecord.processed_by || ''
    reviewForm.review_opinion = processingRecord.review_opinion || ''
    reviewForm.reviewed_by = processingRecord.reviewed_by || ''
  } catch (error) {
    ElMessage.error('加载数据失败')
  }
}

const updateOpinion = async () => {
  if (!reviewForm.processing_opinion || !reviewForm.processed_by) {
    ElMessage.warning('请填写处理意见和处理人')
    return
  }

  submitting.value = true
  try {
    await updateProcessingOpinion(anomalyId, {
      processing_opinion: reviewForm.processing_opinion,
      processed_by: reviewForm.processed_by
    })
    ElMessage.success('处理意见已保存')
    loadData()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

const submitReview = async () => {
  if (!reviewForm.review_opinion || !reviewForm.reviewed_by) {
    ElMessage.warning('请填写复核意见和复核人')
    return
  }

  submitting.value = true
  try {
    await submitReviewApi({
      processing_record_id: anomalyId,
      review_opinion: reviewForm.review_opinion,
      reviewed_by: reviewForm.reviewed_by,
      need_recalculate: reviewForm.need_recalculate
    })
    ElMessage.success('复核意见已提交')
    loadData()
  } catch (error) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const goToTrace = () => {
  router.push({ path: '/trace', query: { anomaly_no: anomaly.value.anomaly_no } })
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadData()
})
</script>
