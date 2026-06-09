<template>
  <div class="page-container">
    <div class="section-card">
      <div class="section-title">
        <el-icon><Upload /></el-icon>
        导入题目清单（支持 CSV / Excel）
      </div>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <el-upload
          :show-file-list="false"
          :before-upload="handleBeforeUpload"
          accept=".csv,.xlsx,.xls"
          :http-request="customUpload"
        >
          <el-button type="primary" :loading="importing">
            <el-icon><Upload /></el-icon>
            选择文件导入（日常·误差分析）
          </el-button>
        </el-upload>
        <el-tag type="info">支持列：题目编号/题号/题目标题/矩阵/精确特征值/近似特征值/误差/备注</el-tag>
        <el-link type="primary" :underline="false" @click="downloadTemplate">
          <el-icon style="margin-right: 4px;"><Download /></el-icon>
          下载模板
        </el-link>
      </div>

      <el-alert v-if="lastImportResult" type="success" :closable="false" style="margin-top: 16px;">
        <template #title>
          <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
            <span><strong>导入完成</strong> 批次号：{{ lastImportResult.batch_no }}</span>
            <el-tag>总数 {{ lastImportResult.total_count }}</el-tag>
            <el-tag type="success">新增 {{ lastImportResult.new_count }}</el-tag>
            <el-tag type="warning">更新 {{ lastImportResult.updated_count }}</el-tag>
            <el-tag type="info">重复跳过 {{ lastImportResult.duplicate_count }}</el-tag>
            <el-tag type="danger" v-if="lastImportResult.quality_issues?.length">
              质量问题 {{ lastImportResult.quality_issues.length }}
            </el-tag>
            <el-button size="small" type="primary" plain @click="selectBatchById(lastImportResult.batch_no)">
              查看该批次
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <div class="section-card">
      <div class="section-title">
        <el-icon><Files /></el-icon>
        历史批次
        <span style="font-size: 12px; color: #909399; font-weight: normal;">
          图表、明细、下载将使用同一批次数据
        </span>
      </div>
      <el-table :data="batches" size="small" @row-click="onBatchClick" highlight-current-row
        style="cursor: pointer;">
        <el-table-column label="批次号" prop="batch_no" width="220" />
        <el-table-column label="文件名" prop="filename" show-overflow-tooltip />
        <el-table-column label="来源" width="110">
          <template #default="{ row }">
            <el-tag :type="row.source === 'error_analysis' ? 'primary' : 'warning'" size="small">
              {{ row.source === 'error_analysis' ? '误差分析' : '约束校验' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="总数" prop="total_count" width="70" align="center" />
        <el-table-column label="新增" prop="new_count" width="70" align="center" type="success" />
        <el-table-column label="更新" prop="updated_count" width="70" align="center" />
        <el-table-column label="重复" prop="duplicate_count" width="70" align="center" />
        <el-table-column label="质量问题" prop="quality_issues" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.quality_issues > 0 ? 'danger' : 'info'">
              {{ row.quality_issues }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="导入时间" width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click.stop="selectBatch(row)">查看</el-button>
            <el-button size="small" type="success" link @click.stop="handleExport(row)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template v-if="currentBatch">
      <div class="section-card">
        <div class="section-title">
          <el-icon><Histogram /></el-icon>
          可视化图表
          <span style="font-size: 12px; color: #909399; font-weight: normal;">
            当前批次：{{ currentBatch.batch_no }}
          </span>
        </div>
        <el-row :gutter="16">
          <el-col :span="12">
            <div style="font-weight: 500; margin-bottom: 8px;">误差散点分布</div>
            <BaseChart :option="scatterOption" height="320px" />
          </el-col>
          <el-col :span="6">
            <div style="font-weight: 500; margin-bottom: 8px;">误差级别分布</div>
            <BaseChart :option="errorPieOption" height="320px" />
          </el-col>
          <el-col :span="6">
            <div style="font-weight: 500; margin-bottom: 8px;">状态分布</div>
            <BaseChart :option="statusPieOption" height="320px" />
          </el-col>
        </el-row>

        <div style="margin-top: 20px;">
          <div style="font-weight: 500; margin-bottom: 8px;">质量问题汇总</div>
          <el-row :gutter="12">
            <el-col :span="6">
              <el-statistic title="空值字段" :value="chartData.quality_summary?.empty_value || 0" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="重复记录" :value="chartData.quality_summary?.duplicate || 0" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="备注混写" :value="chartData.quality_summary?.remark_mixed || 0" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="大误差" :value="chartData.quality_summary?.large_error || 0" />
            </el-col>
          </el-row>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">
          <el-icon><Notebook /></el-icon>
          题目明细
        </div>
        <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
          <el-select v-model="filterStatus" placeholder="按状态" clearable size="small" style="width: 120px;">
            <el-option label="待确认" value="pending" />
            <el-option label="通过" value="passed" />
            <el-option label="驳回" value="rejected" />
            <el-option label="需复核" value="need_review" />
          </el-select>
          <el-select v-model="filterError" placeholder="按误差级别" clearable size="small" style="width: 120px;">
            <el-option label="正常" value="normal" />
            <el-option label="警告" value="warning" />
            <el-option label="严重" value="critical" />
          </el-select>
          <el-checkbox v-model="filterIssue" size="small">仅显示有质量问题</el-checkbox>
          <el-button size="small" type="success" @click="handleExport(currentBatch)">
            <el-icon><Download /></el-icon>
            下载本批次（含明细+质量问题+审计日志）
          </el-button>
        </div>

        <el-table :data="records" size="small" border stripe>
          <el-table-column label="ID" prop="id" width="60" />
          <el-table-column label="题号" width="100">
            <template #default="{ row }">{{ row.question_no || row.question_id || '-' }}</template>
          </el-table-column>
          <el-table-column label="题目标题" prop="question_title" show-overflow-tooltip min-width="160" />
          <el-table-column label="精确特征值" prop="eigenvalue_exact" show-overflow-tooltip width="140" />
          <el-table-column label="近似特征值" prop="eigenvalue_approx" show-overflow-tooltip width="140" />
          <el-table-column label="误差值" width="90" align="right">
            <template #default="{ row }">
              <span :style="{ color: row.error_level === 'critical' ? '#f56c6c' : row.error_level === 'warning' ? '#e6a23c' : '' }">
                {{ Number(row.error_value || 0).toFixed(4) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="误差" width="80">
            <template #default="{ row }">
              <el-tag size="small" :class="`tag-error-${row.error_level}`">
                {{ errText(row.error_level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :class="`tag-status-${row.status}`">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="质量标记" width="170">
            <template #default="{ row }">
              <el-tag v-if="row.has_empty" size="small" type="warning">空值</el-tag>
              <el-tag v-if="row.has_duplicate" size="small" type="info" style="margin-left: 4px;">重复</el-tag>
              <el-tag v-if="row.remark_mixed" size="small" type="danger" style="margin-left: 4px;">备注混写</el-tag>
              <span v-if="!row.has_empty && !row.has_duplicate && !row.remark_mixed" style="color: #67c23a;">
                ✓ 干净
              </span>
            </template>
          </el-table-column>
          <el-table-column label="备注" prop="remark" show-overflow-tooltip min-width="140" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="openEdit(row)">人工修正</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination style="margin-top: 12px; text-align: right;"
          v-model:current-page="page" v-model:page-size="pageSize"
          :total="totalRecords" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadRecords" @current-change="loadRecords" />
      </div>
    </template>

    <RecordEditDialog v-model="editVisible" :record="editingRecord" @saved="onRecordSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Download, Files, Histogram, Notebook } from '@element-plus/icons-vue'
import { api } from '../api.js'
import BaseChart from '../components/BaseChart.vue'
import RecordEditDialog from '../components/RecordEditDialog.vue'

const batches = ref([])
const currentBatch = ref(null)
const lastImportResult = ref(null)
const importing = ref(false)
const chartData = ref({ scatter_points: [], error_distribution: {}, status_distribution: {}, quality_summary: {} })

const records = ref([])
const totalRecords = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const filterError = ref('')
const filterIssue = ref(false)

const editVisible = ref(false)
const editingRecord = ref(null)

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}
function statusText(s) {
  return { pending: '待确认', passed: '通过', rejected: '驳回', need_review: '需复核' }[s] || s
}
function errText(s) {
  return { normal: '正常', warning: '警告', critical: '严重' }[s] || s
}

async function loadBatches() {
  try {
    batches.value = await api.listBatches('error_analysis')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function onBatchClick(row) {
  selectBatch(row)
}

function selectBatch(row) {
  currentBatch.value = row
  page.value = 1
  loadChart()
  loadRecords()
}

async function selectBatchById(batchNo) {
  await loadBatches()
  const found = batches.value.find((b) => b.batch_no === batchNo)
  if (found) selectBatch(found)
}

async function loadChart() {
  if (!currentBatch.value) return
  try {
    chartData.value = await api.getBatchChart(currentBatch.value.id)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function loadRecords() {
  if (!currentBatch.value) return
  const params = { page: page.value, page_size: pageSize.value }
  if (filterStatus.value) params.status = filterStatus.value
  if (filterError.value) params.error_level = filterError.value
  if (filterIssue.value) params.has_issue = true
  try {
    const res = await api.getBatchRecords(currentBatch.value.id, params)
    records.value = res.items
    totalRecords.value = res.total
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function handleBeforeUpload(file) {
  const ok = /\.(csv|xlsx|xls)$/i.test(file.name)
  if (!ok) {
    ElMessage.error('仅支持 CSV / Excel 文件')
    return false
  }
  return true
}

async function customUpload(opt) {
  importing.value = true
  try {
    const result = await api.importBatch(opt.file, 'error_analysis', '排课老师')
    lastImportResult.value = result
    ElMessage.success(`导入完成：${result.new_count} 新增，${result.updated_count} 更新，${result.duplicate_count} 重复`)
    await loadBatches()
    if (result.batch_no) await selectBatchById(result.batch_no)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    importing.value = false
  }
}

function downloadTemplate() {
  const header = ['题目编号', '题号', '题目标题', '矩阵数据', '精确特征值', '近似特征值', '误差值', '备注']
  const row = ['Q001', '1', '示例：求矩阵特征值', '[[2,1],[1,2]]', '3,1', '2.99,1.01', '0.005', '示例备注']
  const csv = '\ufeff' + [header, row].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '特征值导入模板.csv'
  a.click()
}

function handleExport(row) {
  api.exportBatch(row.id)
}

function openEdit(row) {
  editingRecord.value = row
  editVisible.value = true
}

function onRecordSaved() {
  loadRecords()
  loadChart()
  loadBatches()
}

const scatterOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: (p) => `${p.data.label}<br/>误差值：${p.data.value}` },
  grid: { left: 40, right: 20, top: 20, bottom: 40 },
  xAxis: { type: 'category', data: chartData.value.scatter_points.map((p) => p.label), axisLabel: { rotate: 30 } },
  yAxis: { type: 'value', name: '误差值' },
  series: [{
    type: 'scatter',
    symbolSize: 12,
    data: chartData.value.scatter_points.map((p) => ({
      name: p.label,
      value: p.value,
      itemStyle: {
        color: p.value >= 0.1 ? '#f56c6c' : p.value >= 0.01 ? '#e6a23c' : '#67c23a',
      },
    })),
    markLine: {
      silent: true,
      lineStyle: { type: 'dashed' },
      data: [{ yAxis: 0.01, label: { formatter: '警告阈值 0.01', color: '#e6a23c' } },
             { yAxis: 0.1, label: { formatter: '严重阈值 0.1', color: '#f56c6c' } }],
    },
  }],
}))

const errorPieOption = computed(() => {
  const d = chartData.value.error_distribution || {}
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      label: { formatter: '{b}: {c}' },
      data: [
        { name: '正常', value: d.normal || 0, itemStyle: { color: '#67c23a' } },
        { name: '警告', value: d.warning || 0, itemStyle: { color: '#e6a23c' } },
        { name: '严重', value: d.critical || 0, itemStyle: { color: '#f56c6c' } },
      ],
    }],
  }
})

const statusPieOption = computed(() => {
  const d = chartData.value.status_distribution || {}
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      label: { formatter: '{b}: {c}' },
      data: [
        { name: '待确认', value: d.pending || 0, itemStyle: { color: '#909399' } },
        { name: '通过', value: d.passed || 0, itemStyle: { color: '#67c23a' } },
        { name: '驳回', value: d.rejected || 0, itemStyle: { color: '#f56c6c' } },
        { name: '需复核', value: d.need_review || 0, itemStyle: { color: '#e6a23c' } },
      ],
    }],
  }
})

onMounted(loadBatches)
</script>
