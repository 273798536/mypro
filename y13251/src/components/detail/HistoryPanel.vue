<template>
  <div>
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom: 0">
        <el-icon :size="16" color="#409eff"><History /></el-icon>
        <span style="margin-left: 6px">历史变化记录</span>
        <el-tag size="small" type="info" style="margin-left: 8px">
          人工确认前后变化 · 周一早会可直接复盘
        </el-tag>
      </div>
    </div>

    <el-alert
      title="📅 此面板用于周一早会前复盘：向运营主管清晰解释「改了什么、谁改的、何时改的、前后差异」"
      type="info"
      :closable="false"
      show-icon
      class="mb-16"
    />

    <div v-if="store.selectedPointHistory.length === 0 && store.selectedPointReviews.length <= 1" style="text-align: center; padding: 40px 0">
      <el-empty description="该点位暂未产生历史变化记录" />
    </div>

    <el-timeline v-if="store.selectedPointHistory.length">
      <el-timeline-item
        v-for="h in sortedHistory"
        :key="h.id"
        :timestamp="h.operateTime"
        placement="top"
        :color="opColor(h.operateType)"
        :hollow="h.operateType === 'create'"
      >
        <div class="history-card">
          <div class="flex-between mb-12">
            <div style="font-weight: 600; font-size: 15px">
              <el-tag :type="opTagType(h.operateType)" effect="light" size="small">
                {{ opLabel(h.operateType) }}
              </el-tag>
              <span style="margin-left: 10px">{{ h.remark }}</span>
            </div>
            <el-tag type="info" effect="plain" size="small">操作人：{{ h.operator }}</el-tag>
          </div>

          <div v-if="h.diffFields && h.diffFields.length" class="diff-block">
            <div style="font-size: 13px; color: #909399; margin-bottom: 8px">
              📝 涉及字段：<b>{{ h.diffFields.join('、') }}</b>
            </div>
            <el-table
              :data="toDiffRows(h.beforeSnapshot, h.afterSnapshot, h.diffFields)"
              size="small"
              border
              style="width: 100%"
            >
              <el-table-column prop="field" label="字段" width="140" align="center" />
              <el-table-column label="修改前（人工确认前）">
                <template #default="{ row }">
                  <span class="change-before">{{ formatVal(row.before) || '(无)' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="修改后（人工确认后）">
                <template #default="{ row }">
                  <span class="change-after">{{ formatVal(row.after) || '(无)' }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>

    <div v-if="store.selectedPointReviews.length > 1" class="mt-16">
      <div class="section-title">
        <el-icon :size="16" color="#909399"><Tickets /></el-icon>
        <span style="margin-left: 6px">历史版本回溯（V1 → V2）</span>
      </div>
      <div style="display: flex; gap: 16px">
        <el-card
          v-for="rv in sortedReviews"
          :key="rv.id"
          shadow="never"
          style="flex: 1"
          :class="{ latest: rv.isLatest }"
        >
          <template #header>
            <div class="flex-between">
              <b style="font-size: 15px">版本 V{{ rv.version }}</b>
              <el-tag v-if="rv.isLatest" type="success" size="small" effect="dark">当前</el-tag>
              <el-tag v-else type="info" size="small">历史</el-tag>
            </div>
          </template>
          <div style="line-height: 1.9; font-size: 13px">
            <div><b>状态：</b>{{ reviewStatus(rv.status) }}</div>
            <div><b>复核人：</b>{{ rv.reviewer }}</div>
            <div><b>时间：</b>{{ rv.reviewTime }}</div>
            <div><b>建议容量：</b>{{ rv.capacitySuggestion }}</div>
            <div><b>备注：</b>{{ rv.manualRemark || '(无)' }}</div>
            <div v-if="rv.confirmReason"><b>待确认原因：</b>{{ rv.confirmReason }}</div>
            <div v-if="rv.impactScope"><b>影响范围：</b>{{ rv.impactScope }}</div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReviewStore } from '@/store/review'
import type { HistoryRecord } from '@/types'

const store = useReviewStore()

const sortedHistory = computed(() =>
  [...store.selectedPointHistory].sort(
    (a, b) => new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime()
  )
)
const sortedReviews = computed(() =>
  [...store.selectedPointReviews].sort((a, b) => a.version - b.version)
)

function opLabel(t: string) {
  return {
    create: '新建工单',
    update: '更新复核',
    confirm: '人工确认',
    reject: '驳回',
    photo_upload: '照片补录',
    remark_add: '备注追加'
  }[t] || t
}
function opColor(t: string) {
  return {
    create: '#909399',
    update: '#409eff',
    confirm: '#67c23a',
    reject: '#f56c6c',
    photo_upload: '#e6a23c',
    remark_add: '#909399'
  }[t] || '#409eff'
}
function opTagType(t: string): any {
  const map: Record<string, string> = {
    create: 'info',
    update: 'primary',
    confirm: 'success',
    reject: 'danger',
    photo_upload: 'warning',
    remark_add: 'info'
  }
  return map[t] || 'info'
}
function reviewStatus(s: string) {
  return {
    draft: '草稿',
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    need_confirm: '待确认'
  }[s] || s
}
function toDiffRows(before: any, after: any, fields: string[]) {
  const fieldLabel: any = {
    status: '复核状态',
    capacitySuggestion: '建议容量',
    manualRemark: '人工备注',
    confirmReason: '待确认原因',
    impactScope: '影响范围'
  }
  return fields.map((f) => ({
    field: fieldLabel[f] || f,
    before: before?.[f],
    after: after?.[f]
  }))
}
function formatVal(v: any) {
  if (typeof v === 'string' && v.length > 30) return v.slice(0, 30) + '…'
  return v
}
</script>

<style lang="scss" scoped>
.latest :deep(.el-card__header) {
  background: #f0f9eb;
}
.diff-block {
  background: #fff;
  padding: 12px;
  border-radius: 4px;
  border: 1px dashed #ebeef5;
}
</style>
