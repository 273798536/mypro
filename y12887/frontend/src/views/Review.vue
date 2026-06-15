<template>
  <div>
    <h2 class="page-title">复核管理</h2>

    <div class="page-container">
      <el-alert
        title="复核入口说明"
        type="info"
        :closable="false"
        style="margin-bottom: 24px"
      >
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>无需重新导入，可直接修改处理意见和复核意见</li>
          <li>支持勾选"重新计算"，使用最新数据重新计算</li>
          <li>所有操作留痕，可追溯</li>
        </ul>
      </el-alert>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="待复核记录" name="pending">
          <el-table :data="pendingRecords" style="width: 100%" v-loading="loading">
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
            <el-table-column prop="processing_opinion" label="处理意见" show-overflow-tooltip />
            <el-table-column prop="processed_by" label="处理人" width="100" />
            <el-table-column prop="process_time" label="处理时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.process_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openReviewDialog(row)">
                  复核
                </el-button>
                <el-button type="success" link @click="goToDetail(row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="已复核记录" name="reviewed">
          <el-table :data="reviewedRecords" style="width: 100%" v-loading="loading">
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
            <el-table-column prop="review_opinion" label="复核意见" show-overflow-tooltip />
            <el-table-column prop="reviewed_by" label="复核人" width="100" />
            <el-table-column prop="reviewed_at" label="复核时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.reviewed_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link @click="goToDetail(row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="reviewDialogVisible" title="复核处理" width="600px">
      <div v-if="currentRecord" class="review-info">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px;">
          <el-descriptions-item label="批次号">
            {{ currentRecord.batch_no }}
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="getRiskTagType(currentRecord.risk_level)">
              {{ currentRecord.risk_level }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="轨迹漂移">
            {{ currentRecord.trajectory_drift || '-' }} 米
            <el-tag v-if="currentRecord.is_drift_abnormal" type="danger" size="small">异常</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="水质等级">
            {{ currentRecord.water_quality_level || '-' }}
            <el-tag v-if="currentRecord.is_water_abnormal" type="danger" size="small">异常</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="原处理意见" :span="2">
            {{ currentRecord.processing_opinion || '暂无' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-form :model="reviewForm" label-width="100px">
          <el-form-item label="处理意见">
            <el-input
              v-model="reviewForm.processing_opinion"
              type="textarea"
              :rows="2"
              placeholder="请输入处理意见，可直接修改"
            />
          </el-form-item>
          <el-form-item label="处理人">
            <el-input v-model="reviewForm.processed_by" placeholder="请输入处理人" />
          </el-form-item>
          <el-form-item label="复核意见" required>
            <el-input
              v-model="reviewForm.review_opinion"
              type="textarea"
              :rows="3"
              placeholder="请输入复核意见"
            />
          </el-form-item>
          <el-form-item label="复核人" required>
            <el-input v-model="reviewForm.reviewed_by" placeholder="请输入复核人姓名" />
          </el-form-item>
          <el-form-item label="重新计算">
            <el-switch v-model="reviewForm.need_recalculate" />
            <span style="margin-left: 8px; color: #909399;">
              勾选后将使用最新数据重新计算漂移和水质
            </span>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReview" :loading="submitting">
          提交复核
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { getPendingReviews, getProcessingRecords, submitReview as submitReviewApi, updateProcessingOpinion } from '@/api'

const router = useRouter()
const activeTab = ref('pending')
const loading = ref(false)
const pendingRecords = ref([])
const reviewedRecords = ref([])
const reviewDialogVisible = ref(false)
const currentRecord = ref(null)
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

const getRiskTagType = (level) => {
  const types = {
    '高风险': 'danger',
    '中风险': 'warning',
    '低风险': 'primary',
    '正常': 'success'
  }
  return types[level] || 'info'
}

const loadData = async () => {
  loading.value = true
  try {
    pendingRecords.value = await getPendingReviews()

    const allRecords = await getProcessingRecords({})
    reviewedRecords.value = allRecords.filter(r => r.is_reviewed)
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const openReviewDialog = (row) => {
  currentRecord.value = row
  reviewForm.processing_opinion = row.processing_opinion || ''
  reviewForm.processed_by = row.processed_by || ''
  reviewForm.review_opinion = ''
  reviewForm.reviewed_by = ''
  reviewForm.need_recalculate = false
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!reviewForm.review_opinion || !reviewForm.reviewed_by) {
    ElMessage.warning('请填写复核意见和复核人')
    return
  }

  submitting.value = true
  try {
    if (reviewForm.processing_opinion && reviewForm.processed_by) {
      await updateProcessingOpinion(currentRecord.value.id, {
        processing_opinion: reviewForm.processing_opinion,
        processed_by: reviewForm.processed_by
      })
    }

    await submitReviewApi({
      processing_record_id: currentRecord.value.id,
      review_opinion: reviewForm.review_opinion,
      reviewed_by: reviewForm.reviewed_by,
      need_recalculate: reviewForm.need_recalculate
    })

    ElMessage.success('复核提交成功')
    reviewDialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
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
.review-info {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
