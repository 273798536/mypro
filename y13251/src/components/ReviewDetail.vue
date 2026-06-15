<template>
  <div class="review-detail card" style="flex: 1; display: flex; flex-direction: column; overflow: hidden">
    <div class="detail-header flex-between p-16" style="border-bottom: 1px solid #ebeef5">
      <div>
        <div class="section-title" style="margin-bottom: 8px">
          <el-icon :size="18" color="#409eff"><Document /></el-icon>
          <span style="margin-left: 6px">复核详情</span>
        </div>
        <template v-if="store.selectedPoint">
          <h2 style="font-size: 18px; color: #303133; margin-bottom: 4px">
            {{ store.selectedPoint.name }}
            <el-tag v-if="store.selectedPoint.duplicateComplaint" type="danger" effect="light" style="margin-left: 8px">
              <el-icon><WarningFilled /></el-icon>重复投诉
            </el-tag>
          </h2>
          <div style="font-size: 13px; color: #909399">
            编号：{{ store.selectedPoint.id }} · {{ store.selectedPoint.address }}
          </div>
        </template>
        <el-empty v-else description="请从左侧地图或列表选择点位开始复核" :image-size="80" />
      </div>
      <template v-if="store.selectedPoint && store.selectedPointLatestReview">
        <div style="text-align: right">
          <el-tag size="large" :type="reviewStatusTagType" effect="light">
            {{ reviewStatusLabel }}
          </el-tag>
          <div style="margin-top: 6px; font-size: 12px; color: #909399">
            复核人：{{ store.selectedPointLatestReview.reviewer }}
          </div>
          <div style="font-size: 12px; color: #909399">
            版本：V{{ store.selectedPointLatestReview.version }}
          </div>
        </div>
      </template>
    </div>

    <el-tabs v-if="store.selectedPoint" class="detail-tabs" v-model="activeTab">
      <el-tab-pane label="基本信息" name="basic">
        <BasicInfo />
      </el-tab-pane>
      <el-tab-pane label="复核意见" name="opinion">
        <ReviewOpinion />
      </el-tab-pane>
      <el-tab-pane label="材料附件" name="material">
        <MaterialPanel />
      </el-tab-pane>
      <el-tab-pane label="现场照片" name="photo">
        <PhotoPanel />
      </el-tab-pane>
      <el-tab-pane label="历史变化" name="history">
        <HistoryPanel />
      </el-tab-pane>
    </el-tabs>

    <div v-if="store.selectedPoint" class="detail-footer p-16 flex-between" style="border-top: 1px solid #ebeef5">
      <div style="font-size: 13px; color: #909399">
        📌 人工备注、筛选条件、异常队列互相独立保存，刷新页面不会丢失
      </div>
      <div>
        <el-button @click="onSave">
          <el-icon><EditPen /></el-icon>&nbsp;保存草稿
        </el-button>
        <el-button type="primary" @click="onSubmit" style="margin-left: 8px">
          <el-icon><CircleCheckFilled /></el-icon>&nbsp;提交复核
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useReviewStore } from '@/store/review'
import BasicInfo from '@/components/detail/BasicInfo.vue'
import ReviewOpinion from '@/components/detail/ReviewOpinion.vue'
import MaterialPanel from '@/components/detail/MaterialPanel.vue'
import PhotoPanel from '@/components/detail/PhotoPanel.vue'
import HistoryPanel from '@/components/detail/HistoryPanel.vue'

const store = useReviewStore()
const activeTab = ref('basic')

const reviewStatusLabel = computed(() => {
  const map: any = {
    draft: '草稿',
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    need_confirm: '待确认'
  }
  return map[store.selectedPointLatestReview?.status || ''] || '-'
})
const reviewStatusTagType = computed(() => {
  const map: any = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    need_confirm: 'danger'
  }
  return map[store.selectedPointLatestReview?.status || ''] || 'info'
})

function onSave() {
  ElMessage.success('草稿已保存（人工备注已写入历史记录）')
}
function onSubmit() {
  if (!store.selectedPoint) return
  store.submitReview(store.selectedPoint.id)
  ElMessage.success('复核结果已提交，状态更新为"已确认"')
}
</script>

<style lang="scss" scoped>
.review-detail {
  min-height: 0;
}
.detail-header {
  flex-shrink: 0;
}
.detail-tabs {
  flex: 1;
  overflow: hidden;
  :deep(.el-tabs__content) {
    height: calc(100% - 55px);
    overflow-y: auto;
    padding: 16px 24px;
  }
  :deep(.el-tab-pane) {
    height: 100%;
  }
}
.detail-footer {
  flex-shrink: 0;
  background: #fafafa;
}
</style>
