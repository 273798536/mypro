<template>
  <div class="export-page">
    <el-row :gutter="24">
      <el-col :span="24" :lg="14">
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon color="#409EFF" :size="20"><Document /></el-icon>
              <span class="header-title">导出说明</span>
            </div>
          </template>
          <el-timeline class="desc-timeline">
            <el-timeline-item
              v-for="(sheet, idx) in sheetDescs"
              :key="idx"
              :timestamp="sheet.name"
              :color="sheet.color"
              size="large"
            >
              <div class="sheet-info">
                <div class="sheet-title">{{ sheet.name }} · {{ sheet.desc }}</div>
                <div class="sheet-fields">
                  <el-tag
                    v-for="f in sheet.fields"
                    :key="f"
                    type="info"
                    effect="plain"
                    size="small"
                    class="field-tag"
                  >
                    {{ f }}
                  </el-tag>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>

          <el-divider />

          <div class="extra-notes">
            <el-alert
              title="导出规则说明"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <ul class="notes-list">
                  <li><strong>主清单 Sheet</strong>：所有已标记为正常状态的记录，含审核标签与备注</li>
                  <li><strong>坐标清单 Sheet</strong>：含经纬度、坐标系、验证状态与地图链接</li>
                  <li><strong>异常清单 Sheet</strong>：冲突、挂起、坏数据记录及对应问题标签</li>
                  <li><strong>溯源引用 Sheet</strong>：每条记录的源文件名、行号与原始内容快照</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </el-card>
      </el-col>

      <el-col :span="24" :lg="10">
        <el-card class="action-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon color="#67c23a" :size="20"><Download /></el-icon>
              <span class="header-title">导出操作</span>
            </div>
          </template>

          <div class="scope-section">
            <div class="section-title">导出范围</div>
            <el-radio-group v-model="exportScope" class="scope-group">
              <el-radio value="all" size="large">
                <el-icon><Collection /></el-icon> 全部记录
                <el-tag type="primary" effect="light" size="small" style="margin-left: 8px;">
                  {{ store.statistics.total }} 条
                </el-tag>
              </el-radio>
              <el-radio value="custom" size="large">
                <el-icon><Checked /></el-icon> 指定记录 ID
              </el-radio>
            </el-radio-group>
          </div>

          <div v-if="exportScope === 'custom'" class="custom-ids">
            <el-input
              v-model="customIdsText"
              type="textarea"
              :rows="5"
              placeholder="请输入记录 ID，每行一个，例如：&#10;1&#10;2&#10;3"
              resize="none"
            />
            <div class="id-count">
              已输入 <el-tag type="success" size="small">{{ parsedIds.length }}</el-tag> 个有效 ID
            </div>
          </div>

          <div class="format-section">
            <div class="section-title">文件格式</div>
            <el-tag type="success" effect="light" size="large">
              <el-icon><Document /></el-icon> Excel (.xlsx)
            </el-tag>
            <span class="format-hint">包含 4 个 Sheet，可直接用于政务公示与档案归档</span>
          </div>

          <el-button
            type="primary"
            size="large"
            class="export-btn"
            :icon="Download"
            :loading="exporting"
            @click="doExport"
          >
            {{ exporting ? '导出中，请稍候...' : '导出 Excel' }}
          </el-button>

          <el-progress
            v-if="exporting"
            :percentage="exportProgress"
            :stroke-width="10"
            class="export-progress"
            status="success"
          />

          <div v-if="downloadLink" class="download-section">
            <el-alert
              title="导出完成！"
              type="success"
              :closable="false"
              show-icon
              class="success-alert"
            />
            <div class="download-links">
              <el-button
                type="success"
                size="large"
                :href="downloadLink"
                :download="downloadFilename"
                class="dl-btn"
              >
                <el-icon><Download /></el-icon> 点击下载文件
              </el-button>
              <el-button size="large" @click="resetExport">
                <el-icon><Refresh /></el-icon> 再次导出
              </el-button>
            </div>
            <div class="file-info">
              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="文件名">{{ downloadFilename }}</el-descriptions-item>
                <el-descriptions-item label="生成时间">{{ exportTime }}</el-descriptions-item>
                <el-descriptions-item label="记录数">
                  {{ exportScope === 'all' ? store.statistics.total : parsedIds.length }} 条
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>

        <el-card class="history-card" shadow="never" v-if="exportHistory.length > 0">
          <template #header>
            <div class="card-header">
              <el-icon color="#909399" :size="20"><Clock /></el-icon>
              <span class="header-title">最近导出记录</span>
            </div>
          </template>
          <el-table :data="exportHistory" size="small">
            <el-table-column prop="time" label="导出时间" />
            <el-table-column prop="count" label="记录数" width="80" align="center" />
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" :href="row.link" :download="row.filename">下载</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Document, Download, Collection, Checked, Refresh, Clock
} from '@element-plus/icons-vue'
import { useRecordsStore } from '@/store/records'
import { exportExcel } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const store = useRecordsStore()

const exportScope = ref('all')
const customIdsText = ref('')
const exporting = ref(false)
const exportProgress = ref(0)
const downloadLink = ref('')
const downloadFilename = ref('')
const exportTime = ref('')
const exportHistory = ref([])

const sheetDescs = [
  {
    name: 'Sheet 1 · 主清单',
    desc: '社区充电公示主清单（含审核标签）',
    color: '#409EFF',
    fields: ['社区', '街道', '路口', '地址', '时段', '高峰类型', '场景标注', '投诉次数', '口径状态', '统一备注']
  },
  {
    name: 'Sheet 2 · 坐标清单',
    desc: '坐标验证清单（含经纬度）',
    color: '#67c23a',
    fields: ['社区', '街道', '路口', '经度', '纬度', '坐标状态', '坐标系', '地图链接']
  },
  {
    name: 'Sheet 3 · 异常清单',
    desc: '数据异常与冲突记录清单',
    color: '#f56c6c',
    fields: ['社区', '路口', '异常类型', '问题标签', '冲突对方ID', '挂起原因', '处理状态']
  },
  {
    name: 'Sheet 4 · 溯源引用',
    desc: '数据来源溯源快照',
    color: '#e6a23c',
    fields: ['记录ID', '源文件名', '行号', '原始内容', '导入批次', '上传时间']
  }
]

const parsedIds = computed(() => {
  if (!customIdsText.value) return []
  return customIdsText.value
    .split(/[\n,，\s]+/)
    .map(s => s.trim())
    .filter(s => s && /^\d+$/.test(s))
    .map(s => Number(s))
})

const doExport = async () => {
  let ids = null
  if (exportScope.value === 'custom') {
    if (parsedIds.value.length === 0) {
      ElMessage.warning('请输入至少一个有效的记录 ID')
      return
    }
    ids = parsedIds.value
  }
  exporting.value = true
  exportProgress.value = 5

  const timer = setInterval(() => {
    if (exportProgress.value < 85) {
      exportProgress.value += Math.floor(Math.random() * 8) + 3
    }
  }, 180)

  try {
    const blob = await exportExcel(ids)
    exportProgress.value = 100

    const fName = `社区充电公示清单_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
    const url = window.URL.createObjectURL(new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }))

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fName)
    document.body.appendChild(link)
    link.click()
    link.remove()

    downloadLink.value = url
    downloadFilename.value = fName
    exportTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
    exportHistory.value.unshift({
      time: exportTime.value,
      count: ids ? ids.length : store.statistics.total,
      link: url,
      filename: fName
    })
    if (exportHistory.value.length > 5) exportHistory.value.length = 5

    ElMessage.success('导出完成')
  } catch (e) {
    // handled by interceptor
  } finally {
    clearInterval(timer)
    setTimeout(() => {
      exporting.value = false
      exportProgress.value = 0
    }, 800)
  }
}

const resetExport = () => {
  downloadLink.value = ''
  downloadFilename.value = ''
  exportTime.value = ''
}

onMounted(() => {
  store.fetchStatistics()
})
</script>

<style scoped>
.export-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card,
.action-card,
.history-card {
  border-radius: 12px;
  border: none;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.desc-timeline {
  padding: 10px 0;
}

.sheet-info {
  padding: 4px 0;
}

.sheet-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  font-size: 14px;
}

.sheet-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.field-tag {
  margin: 0;
}

.extra-notes {
  margin-top: 8px;
}

.notes-list {
  margin: 12px 0 4px 20px;
  padding: 0;
  line-height: 2;
  color: #606266;
  font-size: 13px;
}

.notes-list strong {
  color: #303133;
}

.scope-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.scope-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scope-group :deep(.el-radio) {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.scope-group :deep(.el-radio.is-checked) {
  background-color: #ecf5ff;
  border-color: #409EFF;
}

.custom-ids {
  margin-bottom: 20px;
}

.id-count {
  margin-top: 10px;
  font-size: 13px;
  color: #606266;
}

.format-section {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.format-hint {
  font-size: 13px;
  color: #909399;
}

.export-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.export-progress {
  margin-bottom: 16px;
}

.download-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.success-alert {
  border-radius: 8px;
}

.download-links {
  display: flex;
  gap: 12px;
}

.dl-btn {
  flex: 1;
}

.file-info {
  margin-top: 4px;
}

.history-card {
  margin-top: 20px;
}
</style>
