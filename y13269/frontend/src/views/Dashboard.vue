<template>
  <div class="dashboard-page">
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="8" :md="4">
        <el-card class="stat-card stat-total" shadow="hover">
          <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
            <el-icon :size="32" color="#fff"><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              <span v-loading="store.statsLoading">{{ store.statistics.total }}</span>
            </div>
            <div class="stat-label">记录总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card class="stat-card stat-normal" shadow="hover">
          <div class="stat-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
            <el-icon :size="32" color="#fff"><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              <span v-loading="store.statsLoading">{{ store.statistics.normal }}</span>
            </div>
            <div class="stat-label">正常记录</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card class="stat-card stat-conflict" shadow="hover">
          <div class="stat-icon" style="background: linear-gradient(135deg, #eb3349, #f45c43)">
            <el-icon :size="32" color="#fff"><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              <span v-loading="store.statsLoading">{{ store.statistics.conflict }}</span>
            </div>
            <div class="stat-label">口径冲突</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card class="stat-card stat-suspended" shadow="hover">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
            <el-icon :size="32" color="#fff"><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              <span v-loading="store.statsLoading">{{ store.statistics.suspended }}</span>
            </div>
            <div class="stat-label">坐标挂起</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card class="stat-card stat-bad" shadow="hover">
          <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
            <el-icon :size="32" color="#fff"><CircleClose /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              <span v-loading="store.statsLoading">{{ store.statistics.bad_data }}</span>
            </div>
            <div class="stat-label">坏数据</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card class="stat-card stat-merge" shadow="hover">
          <div class="stat-icon" style="background: linear-gradient(135deg, #a18cd1, #fbc2eb)">
            <el-icon :size="32" color="#fff"><Merge /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              <span v-loading="store.statsLoading">{{ store.statistics.merge_candidate }}</span>
            </div>
            <div class="stat-label">归并候选</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon color="#409EFF"><Warning /></el-icon>
            <span>异常记录汇总（前 20 条）</span>
          </div>
          <el-button type="primary" link @click="goToAbnormal">
            查看全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>
      <el-table
        v-loading="store.loading"
        :data="abnormalList"
        stripe
        style="width: 100%"
        :row-class-name="rowClassName"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="community" label="社区" min-width="120" />
        <el-table-column prop="street" label="街道" min-width="120" />
        <el-table-column prop="intersection" label="路口" min-width="140" />
        <el-table-column prop="address" label="详细地址" min-width="180" show-overflow-tooltip />
        <el-table-column label="坐标状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.coord_status === 'verified'" type="success" size="small">已验证</el-tag>
            <el-tag v-else-if="row.coord_status === 'suspended'" type="warning" size="small">挂起</el-tag>
            <el-tag v-else type="info" size="small">未验证</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="口径状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'normal'" type="success" size="small">正常</el-tag>
            <el-tag v-else-if="row.status === 'conflict'" type="danger" size="small">冲突</el-tag>
            <el-tag v-else-if="row.status === 'suspended'" type="warning" size="small">挂起</el-tag>
            <el-tag v-else-if="row.status === 'bad_data'" type="danger" effect="plain" size="small">坏数据</el-tag>
            <el-tag v-else type="info" size="small">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="归并状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.merge_status === 'candidate'" type="warning" size="small">候选</el-tag>
            <el-tag v-else-if="row.merge_status === 'merged'" type="info" size="small">已归并</el-tag>
            <el-tag v-else type="success" size="small">独立</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goToDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="goToAbnormal">处理</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无异常记录" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRecordsStore } from '@/store/records'
import { ElMessage } from 'element-plus'

const store = useRecordsStore()
const router = useRouter()

const abnormalList = computed(() => {
  if (store.list.length > 0) {
    return store.abnormalRecords
  }
  return []
})

const rowClassName = ({ row }) => {
  if (row.status === 'conflict') return 'row-conflict'
  if (row.status === 'suspended') return 'row-suspended'
  if (row.status === 'bad_data') return 'row-bad'
  if (row.merge_status === 'candidate') return 'row-merge'
  return ''
}

const goToDetail = (row) => {
  router.push({ path: '/records', query: { id: row.id } })
}

const goToAbnormal = () => {
  router.push('/abnormal')
}

const loadData = async () => {
  try {
    await Promise.all([
      store.fetchStatistics(),
      store.fetchRecords({ page: 1, page_size: 100 })
    ])
  } catch (e) {
    ElMessage.warning('数据加载失败，后端服务可能未启动')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-row {
  margin: 0;
}

.stat-card {
  border: none;
  border-radius: 12px;
  overflow: hidden;
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.table-card {
  border-radius: 12px;
  border: none;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-table .row-conflict) {
  background-color: #fef0f0 !important;
}

:deep(.el-table .row-conflict:hover > td) {
  background-color: #fde2e2 !important;
}

:deep(.el-table .row-suspended) {
  background-color: #fdf6ec !important;
}

:deep(.el-table .row-suspended:hover > td) {
  background-color: #faecd8 !important;
}

:deep(.el-table .row-bad) {
  background-color: #fff7e6 !important;
}

:deep(.el-table .row-bad:hover > td) {
  background-color: #ffedd5 !important;
}

:deep(.el-table .row-merge) {
  background-color: #f3e8ff !important;
}

:deep(.el-table .row-merge:hover > td) {
  background-color: #e9d5ff !important;
}
</style>
