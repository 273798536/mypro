<template>
  <div class="queue-page page-container">
    <header class="page-header flex-between">
      <div class="flex-center">
        <el-icon :size="28" color="#e6a23c"><Warning /></el-icon>
        <h1 style="margin-left: 12px; font-size: 20px; color: #303133">异常队列管理</h1>
        <el-tag type="warning" style="margin-left: 16px">
          待处理 {{ pendingCount }} / 处理中 {{ processingCount }} / 已解决 {{ resolvedCount }}
        </el-tag>
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
          <div class="flex-between">
            <b>队列筛选</b>
            <el-button size="small" type="primary" link @click="resetLocalFilter">重置</el-button>
          </div>
        </template>
        <el-form :inline="true" :model="localFilter" label-width="80px">
          <el-form-item label="异常类型">
            <el-select v-model="localFilter.type" placeholder="全部" clearable style="width: 160px" @change="syncFilter">
              <el-option label="重复投诉" value="duplicate_complaint" />
              <el-option label="名称不一致" value="name_mismatch" />
              <el-option label="容量超限" value="capacity_over" />
              <el-option label="照片缺失" value="photo_missing" />
              <el-option label="待人工确认" value="pending_confirm" />
            </el-select>
          </el-form-item>
          <el-form-item label="等级">
            <el-radio-group v-model="localFilter.level" @change="syncFilter">
              <el-radio-button value="" label="全部" />
              <el-radio-button value="high" label="高危" />
              <el-radio-button value="medium" label="中危" />
              <el-radio-button value="low" label="低危" />
            </el-radio-group>
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="localFilter.status" @change="syncFilter">
              <el-radio-button value="" label="全部" />
              <el-radio-button value="pending" label="待处理" />
              <el-radio-button value="processing" label="处理中" />
              <el-radio-button value="resolved" label="已解决" />
            </el-radio-group>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="localFilter.keyword" placeholder="点位名/描述" clearable style="width: 200px" @input="syncFilter" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="flex-between">
            <b>异常列表（共 {{ filteredQueues.length }} 条）</b>
            <el-tag type="danger" effect="light">高危优先处理</el-tag>
          </div>
        </template>
        <el-table :data="filteredQueues" stripe>
          <el-table-column label="等级" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="levelTag(row.level)" effect="dark" size="small">
                {{ levelLabel(row.level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120" align="center">
            <template #default="{ row }">
              <span class="type-icon">{{ typeIcon(row.type) }}</span>
              <span style="margin-left: 4px">{{ typeLabel(row.type) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="pointName" label="关联点位" min-width="180" />
          <el-table-column prop="description" label="异常描述" min-width="260" show-overflow-tooltip />
          <el-table-column label="处理状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" effect="light" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="handler" label="处理人" width="90" align="center" />
          <el-table-column prop="createTime" label="创建时间" width="170" />
          <el-table-column prop="remark" label="处理备注" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="goReview(row)">跳转复核</el-button>
              <el-button size="small" type="success" link v-if="row.status !== 'resolved'" @click="resolve(row)">标记解决</el-button>
              <el-button size="small" link @click="editRemark(row)">编辑备注</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog v-model="remarkVisible" title="编辑处理备注" width="500px">
      <el-input v-model="remarkDraft" type="textarea" :rows="4" placeholder="请填写处理进展备注..." />
      <template #footer>
        <el-button @click="remarkVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRemark">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useReviewStore } from '@/store/review'
import type { AbnormalQueue } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useReviewStore()

const localFilter = reactive({
  type: '',
  level: '',
  status: '',
  keyword: ''
})
function syncFilter() {}
function resetLocalFilter() {
  localFilter.type = ''
  localFilter.level = ''
  localFilter.status = ''
  localFilter.keyword = ''
}

const pendingCount = computed(() => store.abnormalQueues.filter(q => q.status === 'pending').length)
const processingCount = computed(() => store.abnormalQueues.filter(q => q.status === 'processing').length)
const resolvedCount = computed(() => store.abnormalQueues.filter(q => q.status === 'resolved').length)

const filteredQueues = computed(() => {
  let list = store.abnormalQueues
  if (localFilter.type) list = list.filter(q => q.type === localFilter.type)
  if (localFilter.level) list = list.filter(q => q.level === localFilter.level)
  if (localFilter.status) list = list.filter(q => q.status === localFilter.status)
  if (localFilter.keyword) {
    const kw = localFilter.keyword.toLowerCase()
    list = list.filter(q => q.pointName.toLowerCase().includes(kw) || q.description.toLowerCase().includes(kw))
  }
  const order: any = { high: 0, medium: 1, low: 2 }
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    return order[a.level] - order[b.level]
  })
})

const remarkVisible = ref(false)
const remarkDraft = ref('')
const editingQueue = ref<AbnormalQueue | null>(null)

function goReview(row: AbnormalQueue) {
  store.selectPoint(row.pointId)
  router.push('/review')
}
function resolve(row: AbnormalQueue) {
  store.updateAbnormalQueue(row.id, { status: 'resolved', remark: (row.remark || '') + ' 【已标记解决】' })
  ElMessage.success('已标记为已解决')
}
function editRemark(row: AbnormalQueue) {
  editingQueue.value = row
  remarkDraft.value = row.remark
  remarkVisible.value = true
}
function saveRemark() {
  if (!editingQueue.value) return
  store.updateAbnormalQueue(editingQueue.value.id, { remark: remarkDraft.value })
  ElMessage.success('备注已保存')
  remarkVisible.value = false
}

function typeLabel(t: string) {
  return {
    duplicate_complaint: '重复投诉',
    name_mismatch: '名称不一致',
    capacity_over: '容量超限',
    photo_missing: '照片缺失',
    pending_confirm: '待确认'
  }[t] || t
}
function typeIcon(t: string) {
  return {
    duplicate_complaint: '🔁',
    name_mismatch: '🏷️',
    capacity_over: '📊',
    photo_missing: '📷',
    pending_confirm: '🤔'
  }[t] || '⚠️'
}
function levelLabel(l: string) {
  return { high: '高危', medium: '中危', low: '低危' }[l] || l
}
function levelTag(l: string): any {
  const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'info' }
  return map[l] || 'info'
}
function statusLabel(s: string) {
  return { pending: '待处理', processing: '处理中', resolved: '已解决' }[s] || s
}
function statusTag(s: string): any {
  const map: Record<string, string> = { pending: 'danger', processing: 'warning', resolved: 'success' }
  return map[s] || 'info'
}
</script>
