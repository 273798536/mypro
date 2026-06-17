<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon :size="22" style="margin-right:8px;vertical-align:middle;color:#3a8ee6">
          <List />
        </el-icon>
        居民反馈列表
      </h2>
      <div>
        <el-button type="success" @click="doExportExcel">
          <el-icon><Download /></el-icon>导出 Excel
        </el-button>
        <el-button style="margin-left:8px;background:#6c5ce7;color:#fff" @click="doExportPdf">
          <el-icon><Printer /></el-icon>导出 PDF 报告
        </el-button>
      </div>
    </div>

    <el-card shadow="never" style="margin-bottom:14px">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部状态" style="width:160px" @change="fetchList">
            <el-option
              v-for="(label, key) in store.statusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="query.source" clearable placeholder="全部来源" style="width:160px" @change="fetchList">
            <el-option label="12345热线" value="12345热线" />
            <el-option label="社区微信群" value="社区微信群" />
            <el-option label="现场巡查" value="现场巡查" />
            <el-option label="人大建议转办" value="人大建议转办" />
            <el-option label="领导转办" value="领导转办" />
          </el-select>
        </el-form-item>
        <el-form-item label="桥名">
          <el-input v-model="query.bridge_name" placeholder="模糊搜索桥名" clearable style="width:180px" @change="fetchList" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="编号/地点/内容/备注" clearable style="width:220px" @keyup.enter="fetchList">
            <template #append>
              <el-button @click="fetchList"><el-icon><Search /></el-icon></el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="store.statusHints[query.status]" class="action-hint">
      <el-icon style="margin-right:6px;vertical-align:middle"><InfoFilled /></el-icon>
      <b>{{ store.statusLabels[query.status] }}：</b>{{ store.statusHints[query.status] }}
    </div>

    <el-card shadow="never">
      <el-table :data="list" stripe @row-click="row => $router.push(`/feedbacks/${row.id}`)" style="cursor:pointer">
        <el-table-column prop="feedback_no" label="编号" width="170" fixed="left">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">{{ row.feedback_no }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :class="`status-${row.status}`" effect="light">
              {{ store.statusLabels[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bridge_name" label="桥名" width="160" show-overflow-tooltip />
        <el-table-column label="原始地点 vs 规范地点" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.original_location" style="color:#e6a23c;font-size:12px">
              <el-icon><EditPen /></el-icon>原：{{ row.original_location }}
            </div>
            <div v-if="row.normalized_location" style="color:#409eff;font-size:12px;margin-top:2px">
              <el-icon><LocationFilled /></el-icon>规：{{ row.normalized_location }}
            </div>
            <div v-if="!row.original_location && !row.normalized_location" style="color:#c0c4cc">—</div>
          </template>
        </el-table-column>
        <el-table-column label="反馈内容" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">{{ row.original_content || '—' }}</template>
        </el-table-column>
        <el-table-column prop="impact_scope" label="影响范围" width="200" show-overflow-tooltip />
        <el-table-column prop="original_source" label="来源" width="110" />
        <el-table-column prop="handler" label="处理人" width="90" />
        <el-table-column label="更新时间" width="150" fixed="right">
          <template #default="{ row }">
            {{ formatTime(row.updated_at) }}
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top:14px;text-align:right">
        <el-pagination
          layout="total, prev, pager, next, sizes"
          :total="total"
          :page-sizes="[20, 50, 100]"
          :page-size="query.limit"
          :current-page="page"
          @current-change="p => { page = p; fetchList() }"
          @size-change="s => { query.limit = s; page = 1; fetchList() }"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import { api } from '@/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const store = useAppStore()

const query = reactive({
  status: route.query.status || '',
  keyword: '',
  bridge_name: '',
  source: '',
  limit: 20
})

const page = ref(1)
const total = ref(0)
const list = ref([])

const fetchList = async () => {
  const skip = (page.value - 1) * query.limit
  const res = await api.list({ skip, limit: query.limit, ...query })
  total.value = res.total
  list.value = res.items
}

const formatTime = t => t ? dayjs(t).format('MM-DD HH:mm') : '—'

const doExportExcel = () => {
  api.exportExcel({ ...query })
  ElMessage.success('正在导出 Excel...')
}

const doExportPdf = () => {
  api.exportPdf({ ...query })
  ElMessage.success('正在生成 PDF 报告...')
}

watch(() => route.query.status, v => {
  if (v !== undefined) {
    query.status = v
    page.value = 1
    fetchList()
  }
})

onMounted(() => {
  if (!store.statusLabels || !Object.keys(store.statusLabels).length) {
    store.loadStatusInfo()
  }
  fetchList()
})
</script>
