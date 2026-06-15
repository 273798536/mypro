<template>
  <div v-if="store.selectedPoint && store.selectedPointLatestReview">
    <el-descriptions :column="3" border size="default" class="mb-16">
      <el-descriptions-item label="行政区">{{ store.selectedPoint.district }}</el-descriptions-item>
      <el-descriptions-item label="所属街道">{{ store.selectedPoint.street }}</el-descriptions-item>
      <el-descriptions-item label="点位类型">
        {{ { street: '沿街外摆', plaza: '广场外摆', pedestrian: '步行街' }[store.selectedPoint.type] }}
      </el-descriptions-item>
      <el-descriptions-item label="GIS坐标">
        {{ store.selectedPoint.lng.toFixed(5) }}, {{ store.selectedPoint.lat.toFixed(5) }}
      </el-descriptions-item>
      <el-descriptions-item label="核定容量">
        <el-tag type="primary" effect="plain">{{ store.selectedPoint.capacity }} 个摆位</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="当前实际摆位">
        <el-tag :type="store.selectedPoint.currentCapacity > store.selectedPoint.capacity ? 'danger' : 'success'" effect="plain">
          {{ store.selectedPoint.currentCapacity }} 个
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="建议容量" span="3">
        <el-input-number
          v-model="capacityDraft"
          :min="0"
          :max="store.selectedPoint.capacity * 1.2"
          @change="onCapacityChange"
        />
        <span style="margin-left: 12px; color: #909399; font-size: 13px">
          （核定额 {{ store.selectedPoint.capacity }} ×
          {{ ((capacityDraft / store.selectedPoint.capacity) * 100).toFixed(0) }}%）
        </span>
      </el-descriptions-item>
    </el-descriptions>

    <div v-if="store.selectedPoint.duplicateComplaint" class="duplicate-warning mb-16">
      <el-alert
        title="检测到重复投诉，请勿急着算完，请先填写待确认原因与影响范围"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <div style="margin-top: 8px">
            <p>📍 该点位近 7 天共收到 <b style="color: #f56c6c">{{ store.selectedPoint.complaintCount }}</b> 条投诉，最后一次：{{ store.selectedPoint.lastComplaintDate }}</p>
          </div>
        </template>
      </el-alert>

      <el-card class="mt-16" shadow="never">
        <template #header>
          <div class="card-header">
            <span><el-icon :size="16" color="#e6a23c"><Warning /></el-icon>&nbsp;重复投诉待确认信息</span>
            <el-tag type="warning" effect="light" size="small">不填完不得提交复核</el-tag>
          </div>
        </template>
        <el-form label-width="110px">
          <el-form-item label="待确认原因" required>
            <el-input
              v-model="confirmReasonDraft"
              type="textarea"
              :rows="3"
              placeholder="例：经初查，投诉人信息高度重合，疑似同一商户多次提交不同投诉单号；需与城管中队交叉核实投诉来源。"
              @blur="onConfirmInfoChange"
            />
          </el-form-item>
          <el-form-item label="影响范围" required>
            <el-input
              v-model="impactScopeDraft"
              type="textarea"
              :rows="2"
              placeholder="例：影响范围覆盖XX街道XX小区、XX小区共3个居民小区，约200户居民；涉及XX路沿街商户15家。"
              @blur="onConfirmInfoChange"
            />
          </el-form-item>
          <el-form-item label="排查进度">
            <el-radio-group v-model="progress" @change="onConfirmInfoChange">
              <el-radio value="待联系城管">待联系城管中队</el-radio>
              <el-radio value="处理中">已联系，处理中</el-radio>
              <el-radio value="已核实">已核实，重复属实</el-radio>
              <el-radio value="排除">已排除，非重复投诉</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <div v-else>
      <el-alert
        title="该点位暂无重复投诉告警，可按正常流程完成复核"
        type="success"
        :closable="false"
        show-icon
        class="mb-16"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useReviewStore } from '@/store/review'

const store = useReviewStore()

const capacityDraft = ref(store.selectedPointLatestReview?.capacitySuggestion || 0)
const confirmReasonDraft = ref(store.selectedPointLatestReview?.confirmReason || '')
const impactScopeDraft = ref(store.selectedPointLatestReview?.impactScope || '')
const progress = ref('处理中')

watch(
  () => store.selectedPointLatestReview,
  (r) => {
    if (r) {
      capacityDraft.value = r.capacitySuggestion
      confirmReasonDraft.value = r.confirmReason
      impactScopeDraft.value = r.impactScope
    }
  },
  { immediate: true }
)

function onCapacityChange(val: number) {
  if (!store.selectedPoint) return
  store.updateCapacitySuggestion(store.selectedPoint.id, val)
  ElMessage.success(`建议容量已调整为 ${val}，变化已记录到历史`)
}

function onConfirmInfoChange() {
  if (!store.selectedPoint) return
  store.updateConfirmInfo(store.selectedPoint.id, confirmReasonDraft.value, impactScopeDraft.value)
  ElMessage.success('待确认信息已保存，异常队列同步更新')
}
</script>

<style lang="scss" scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
</style>
