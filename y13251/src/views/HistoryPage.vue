<template>
  <div class="history-page page-container">
    <header class="page-header flex-between">
      <div class="flex-center">
        <el-icon :size="28" color="#67c23a"><Clock /></el-icon>
        <h1 style="margin-left: 12px; font-size: 20px; color: #303133">历史记录复盘</h1>
        <el-tag type="success" effect="light" style="margin-left: 16px">周一早会专用视图</el-tag>
      </div>
      <div>
        <el-button :type="route.name === 'Review' ? 'primary' : 'default'" @click="$router.push('/review')">
          <el-icon><DataAnalysis /></el-icon>&nbsp;复核工作台
        </el-button>
        <el-button :type="route.name === 'Queue' ? 'primary' : 'default'" @click="$router.push('/queue')" style="margin-left: 8px">
          <el-icon><Warning /></el-icon>&nbsp;异常队列
        </el-button>
        <el-button :type="route.name === 'History' ? 'primary' : 'default'" @click="$router.push('/history')" style="margin-left: 8px">
          <el-icon><Clock /></el-icon>&nbsp;历史复盘
        </el-button>
      </div>
    </header>

    <div style="padding: 24px; flex: 1; overflow: auto">
      <el-card shadow="never" class="mb-16">
        <template #header>
          <b>📋 本周复核情况概览（可直接向运营主管汇报）</b>
        </template>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-statistic title="复核点位总数" :value="store.gisPoints.length" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="已确认" :value="confirmedCount">
              <template #suffix>
                <el-tag type="success" effect="light" size="small">
                  {{ ((confirmedCount / store.gisPoints.length) * 100).toFixed(0) }}%
                </el-tag>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="异常队列总数" :value="store.abnormalQueues.length" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="重复投诉点位" :value="duplicateCount" value-style="color:#f56c6c" />
          </el-col>
        </el-row>
      </el-card>

      <el-row :gutter="16">
        <el-col :span="10">
          <el-card shadow="never" style="height: 100%">
            <template #header>
              <b>🕐 全量历史操作时间线</b>
            </template>
            <el-timeline style="max-height: 600px; overflow-y: auto">
              <el-timeline-item
                v-for="h in sortedAllHistory"
                :key="h.id"
                :timestamp="h.operateTime"
                :color="opColor(h.operateType)"
                placement="top"
              >
                <div style="font-size: 13px; line-height: 1.8">
                  <div>
                    <el-tag :type="opTag(h.operateType)" effect="light" size="small">
                      {{ opLabel(h.operateType) }}
                    </el-tag>
                    <span style="margin-left: 6px; font-weight: 600">
                      {{ pointName(h.pointId) }}
                    </span>
                  </div>
                  <div style="color: #606266; margin-top: 4px">{{ h.remark }}</div>
                  <div v-if="h.diffFields && h.diffFields.length" style="color: #909399; margin-top: 4px">
                    变更：{{ h.diffFields.join('、') }}
                  </div>
                  <div style="color: #c0c4cc; margin-top: 2px; font-size: 12px">
                    操作人：{{ h.operator }}
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-col>

        <el-col :span="14">
          <el-card shadow="never" style="margin-bottom: 16px">
            <template #header>
              <div class="flex-between">
                <b>📝 重点复核案例（建议在早会讲解）</b>
                <el-tag type="warning" effect="light">已为你标记重复投诉点位</el-tag>
              </div>
            </template>
            <el-table :data="keyPoints" size="small" stripe @row-click="onRowClick" style="cursor: pointer">
              <el-table-column prop="name" label="点位名称" min-width="180">
                <template #default="{ row }">
                  <span style="font-weight: 500">{{ row.name }}</span>
                  <el-tag v-if="row.duplicateComplaint" type="danger" effect="light" size="small" style="margin-left: 6px">
                    重复投诉
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="核定/建议" width="110" align="center">
                <template #default="{ row }">
                  {{ row.capacity }} / {{ suggestCapacity(row.id) }}
                </template>
              </el-table-column>
              <el-table-column prop="complaintCount" label="投诉数" width="70" align="center" />
              <el-table-column label="最近变化" min-width="220">
                <template #default="{ row }">
                  <div v-if="latestHistory(row.id)" style="font-size: 12px; line-height: 1.6">
                    <div style="color: #606266">
                      <b>{{ opLabel(latestHistory(row.id)!.operateType) }}</b>
                      ：{{ latestHistory(row.id)!.remark }}
                    </div>
                    <div style="color: #909399">{{ latestHistory(row.id)!.operateTime }} · {{ latestHistory(row.id)!.operator }}</div>
                  </div>
                  <span v-else style="color: #c0c4cc">暂无变化</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="statusTag(row.status)" effect="light" size="small">
                    {{ statusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card shadow="never">
            <template #header>
              <b>🎯 人工确认前后典型对比（南京东路案例）</b>
            </template>
            <div style="display: flex; gap: 16px">
              <el-card style="flex: 1; background: #fef0f0; border: 1px dashed #fbc4c4" shadow="never">
                <div style="text-align: center; color: #f56c6c; font-weight: 600; margin-bottom: 12px">
                  📌 人工确认前
                </div>
                <div style="line-height: 2; font-size: 13px">
                  <div><b>建议容量：</b>69 个</div>
                  <div><b>状态：</b>草稿 → 待确认</div>
                  <div><b>备注：</b>（无）</div>
                  <div><b>依据：</b>仅GIS点位估算</div>
                </div>
              </el-card>
              <div style="align-self: center; color: #909399">
                <el-icon :size="28"><Right /></el-icon>
              </div>
              <el-card style="flex: 1; background: #f0f9eb; border: 1px dashed #c2e7b0" shadow="never">
                <div style="text-align: center; color: #67c23a; font-weight: 600; margin-bottom: 12px">
                  ✅ 人工确认后（周一早会决议）
                </div>
                <div style="line-height: 2; font-size: 13px">
                  <div><b>建议容量：</b><span class="change-after">54 个</span></div>
                  <div><b>状态：</b>复核中</div>
                  <div><b>备注：</b>重复投诉属实，核减</div>
                  <div><b>依据：</b>现场照片 + 居民走访 + 投诉排查</div>
                </div>
              </el-card>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReviewStore } from '@/store/review'
import type { GisPoint } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useReviewStore()

const confirmedCount = computed(() => store.gisPoints.filter(p => p.status === 'confirmed').length)
const duplicateCount = computed(() => store.gisPoints.filter(p => p.duplicateComplaint).length)

const sortedAllHistory = computed(() =>
  [...store.historyRecords].sort(
    (a, b) => new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime()
  )
)
const keyPoints = computed(() =>
  [...store.gisPoints].sort((a, b) => {
    if (a.duplicateComplaint !== b.duplicateComplaint) return a.duplicateComplaint ? -1 : 1
    return b.complaintCount - a.complaintCount
  })
)

function pointName(id: string) {
  return store.gisPoints.find(p => p.id === id)?.name || id
}
function suggestCapacity(id: string) {
  return store.reviewRecords.find(r => r.pointId === id && r.isLatest)?.capacitySuggestion || '-'
}
function latestHistory(id: string) {
  const list = store.historyRecords.filter(h => h.pointId === id)
  if (!list.length) return null
  return list.sort((a, b) => new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime())[0]
}
function onRowClick(row: GisPoint) {
  store.selectPoint(row.id)
  router.push('/review')
}
function opLabel(t: string) {
  return { create: '新建', update: '更新', confirm: '确认', reject: '驳回', photo_upload: '照片补录', remark_add: '备注' }[t] || t
}
function opColor(t: string) {
  return { create: '#909399', update: '#409eff', confirm: '#67c23a', reject: '#f56c6c', photo_upload: '#e6a23c', remark_add: '#909399' }[t] || '#409eff'
}
function opTag(t: string): any {
  const map: Record<string, string> = { create: 'info', update: 'primary', confirm: 'success', reject: 'danger', photo_upload: 'warning', remark_add: 'info' }
  return map[t] || 'info'
}
function statusLabel(s: string) {
  return { pending: '待复核', reviewing: '复核中', confirmed: '已确认', disputed: '有争议' }[s] || s
}
function statusTag(s: string): any {
  const map: Record<string, string> = { pending: 'info', reviewing: 'warning', confirmed: 'success', disputed: 'danger' }
  return map[s] || 'info'
}
</script>
