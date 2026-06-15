<template>
  <div class="mini-queue card" style="height: 260px; display: flex; flex-direction: column">
    <div class="flex-between p-16" style="border-bottom: 1px solid #ebeef5">
      <div class="section-title" style="margin-bottom: 0">
        <el-icon :size="18" color="#e6a23c"><Warning /></el-icon>
        <span style="margin-left: 6px">关联异常队列</span>
        <el-tag size="small" type="danger" effect="light" style="margin-left: 8px" v-if="store.pointAbnormalQueues.length">
          {{ store.pointAbnormalQueues.length }} 项
        </el-tag>
        <el-tag size="small" type="success" effect="light" style="margin-left: 8px" v-else>
          无异常
        </el-tag>
      </div>
      <el-button type="primary" link size="small" @click="$router.push('/queue')">
        查看完整队列 →
      </el-button>
    </div>
    <div style="flex: 1; overflow-y: auto; padding: 12px 16px">
      <div v-if="!store.selectedPoint" style="text-align: center; color: #909399; padding: 20px">
        请先选择点位查看关联异常
      </div>
      <div v-else-if="store.pointAbnormalQueues.length === 0" style="text-align: center; color: #67c23a; padding: 20px">
        ✅ 该点位暂无异常队列项目
      </div>
      <div v-else style="display: flex; flex-direction: column; gap: 10px">
        <div
          v-for="q in store.pointAbnormalQueues"
          :key="q.id"
          class="queue-item"
          :class="q.status"
          @click="$router.push('/queue')"
        >
          <div class="flex-between">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-tag :type="levelTagType(q.level)" effect="light" size="small">
                {{ levelLabel(q.level) }}
              </el-tag>
              <b style="font-size: 13px">{{ typeLabel(q.type) }}</b>
            </div>
            <el-tag :type="statusTagType(q.status)" size="small" effect="plain">
              {{ statusLabel(q.status) }}
            </el-tag>
          </div>
          <div style="font-size: 12px; color: #606266; margin-top: 6px">{{ q.description }}</div>
          <div v-if="q.remark" style="font-size: 12px; color: #909399; margin-top: 4px">
            💬 {{ q.remark }}
          </div>
          <div style="font-size: 11px; color: #c0c4cc; margin-top: 4px">
            创建于 {{ q.createTime }} · 处理人：{{ q.handler }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReviewStore } from '@/store/review'

const store = useReviewStore()

function typeLabel(t: string) {
  return {
    duplicate_complaint: '重复投诉',
    name_mismatch: '名称不一致',
    capacity_over: '容量超限',
    photo_missing: '照片缺失',
    pending_confirm: '待人工确认'
  }[t] || t
}
function levelLabel(l: string) {
  return { high: '高危', medium: '中危', low: '低危' }[l] || l
}
function levelTagType(l: string): any {
  const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'info' }
  return map[l] || 'info'
}
function statusLabel(s: string) {
  return { pending: '待处理', processing: '处理中', resolved: '已解决' }[s] || s
}
function statusTagType(s: string): any {
  const map: Record<string, string> = { pending: 'danger', processing: 'warning', resolved: 'success' }
  return map[s] || 'info'
}
</script>

<style lang="scss" scoped>
.queue-item {
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid #e6a23c;
  background: #fdf6ec;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
  &.pending {
    border-left-color: #f56c6c;
    background: #fef0f0;
  }
  &.resolved {
    border-left-color: #67c23a;
    background: #f0f9eb;
  }
}
</style>
