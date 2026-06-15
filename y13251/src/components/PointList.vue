<template>
  <div class="point-list card" style="height: 280px; display: flex; flex-direction: column">
    <div class="flex-between p-16" style="border-bottom: 1px solid #ebeef5">
      <div class="section-title" style="margin-bottom: 0">
        <el-icon :size="18" color="#409eff"><List /></el-icon>
        <span style="margin-left: 6px">点位列表</span>
        <el-tag size="small" type="info" style="margin-left: 8px">
          共 {{ store.filteredPoints.length }} / {{ store.gisPoints.length }}
        </el-tag>
      </div>
    </div>
    <el-table
      :data="store.filteredPoints"
      size="small"
      height="220"
      highlight-current-row
      stripe
      @row-click="(r: any) => store.selectPoint(r.id)"
      @current-change="(r: any) => r && store.selectPoint(r.id)"
    >
      <el-table-column prop="name" label="点位名称" min-width="180">
        <template #default="{ row }">
          <span style="font-weight: 500; color: #303133">{{ row.name }}</span>
          <el-tag
            v-if="row.duplicateComplaint"
            type="danger"
            effect="light"
            size="small"
            style="margin-left: 6px"
          >重复投诉</el-tag>
          <el-tag
            v-if="store.allAbnormalPointIds.has(row.id)"
            type="warning"
            effect="plain"
            size="small"
            style="margin-left: 4px"
          >异常</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="street" label="街道" width="110" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          {{ typeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column label="容量(核定/当前)" width="120" align="center">
        <template #default="{ row }">
          <b>{{ row.capacity }}</b> /
          <span :class="{ over: row.currentCapacity > row.capacity }">
            {{ row.currentCapacity }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="complaintCount" label="投诉" width="60" align="center">
        <template #default="{ row }">
          <span :style="{ color: row.complaintCount > 4 ? '#f56c6c' : '#606266' }">
            {{ row.complaintCount }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" effect="light" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updateTime" label="最近更新" width="160" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { useReviewStore } from '@/store/review'

const store = useReviewStore()

function typeLabel(t: string) {
  return { street: '沿街', plaza: '广场', pedestrian: '步行街' }[t] || t
}
function statusLabel(s: string) {
  return { pending: '待复核', reviewing: '复核中', confirmed: '已确认', disputed: '有争议' }[s] || s
}
function statusTagType(s: string): any {
  const map: Record<string, string> = {
    pending: 'info',
    reviewing: 'warning',
    confirmed: 'success',
    disputed: 'danger'
  }
  return map[s] || 'info'
}
</script>

<style lang="scss" scoped>
.over {
  color: #f56c6c;
  font-weight: 600;
}
:deep(.el-table__row) {
  cursor: pointer;
}
</style>
