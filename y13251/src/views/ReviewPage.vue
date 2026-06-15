<template>
  <div class="review-page page-container">
    <header class="page-header flex-between">
      <div class="flex-center">
        <el-icon :size="28" color="#409eff"><OfficeBuilding /></el-icon>
        <h1 style="margin-left: 12px; font-size: 20px; color: #303133">夜市外摆容量复核系统</h1>
        <el-tag type="warning" style="margin-left: 16px">当前角色：社区运营 · 阿宁</el-tag>
      </div>
      <div>
        <el-button :type="route.name === 'Review' ? 'primary' : 'default'" @click="$router.push('/review')">
          <el-icon><DataAnalysis /></el-icon>&nbsp;复核工作台
        </el-button>
        <el-button :type="route.name === 'Queue' ? 'primary' : 'default'" @click="$router.push('/queue')" style="margin-left: 8px">
          <el-icon><Warning /></el-icon>&nbsp;异常队列
          <el-badge v-if="pendingQueueCount > 0" :value="pendingQueueCount" class="queue-badge" />
        </el-button>
        <el-button :type="route.name === 'History' ? 'primary' : 'default'" @click="$router.push('/history')" style="margin-left: 8px">
          <el-icon><Clock /></el-icon>&nbsp;历史复盘
        </el-button>
      </div>
    </header>

    <FilterBar />

    <div class="main-content">
      <div class="left-panel">
        <GisMap />
        <PointList />
      </div>
      <div class="right-panel">
        <ReviewDetail />
        <MiniAbnormalQueue />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useReviewStore } from '@/store/review'
import FilterBar from '@/components/FilterBar.vue'
import GisMap from '@/components/GisMap.vue'
import PointList from '@/components/PointList.vue'
import ReviewDetail from '@/components/ReviewDetail.vue'
import MiniAbnormalQueue from '@/components/MiniAbnormalQueue.vue'

const route = useRoute()
const store = useReviewStore()

const pendingQueueCount = computed(
  () => store.abnormalQueues.filter(q => q.status === 'pending').length
)
</script>

<style lang="scss" scoped>
.review-page {
  min-width: 1400px;
}
.main-content {
  flex: 1;
  display: flex;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
}
.left-panel {
  width: 55%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}
.queue-badge {
  margin-left: 6px;
}
</style>
