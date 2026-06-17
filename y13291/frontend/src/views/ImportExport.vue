<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon :size="22" style="margin-right:8px;vertical-align:middle;color:#3a8ee6">
          <Upload />
        </el-icon>
        数据导入 / 导出
      </h2>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <el-card shadow="never" style="margin-bottom:16px">
          <div class="section-title">
            <el-icon style="margin-right:4px"><UploadFilled /></el-icon>
            导入居民反馈 Excel
          </div>
          <div class="action-hint">
            <el-icon style="margin-right:6px;vertical-align:middle"><InfoFilled /></el-icon>
            <b>导入原则：</b>原始数据永久保留痕迹，不做自动清洗。
            列名支持中文：<code>来源 / 原始地点 / 反馈内容 / 反映人 / 联系方式 / 反馈日期 / 桥名 / 影响范围</code>等。
            即使列名不匹配，也会保留整行原始 JSON 在"原始数据留痕"中。
          </div>

          <el-upload
            drag
            :auto-upload="false"
            :limit="1"
            :on-change="handleFile"
            accept=".xlsx,.xls"
            style="margin:14px 0"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖放 Excel 文件到此处，或 <em>点击选择</em></div>
            <template #tip>
              <div class="el-upload__tip" style="text-align:center">
                仅支持 .xlsx / .xls 格式，建议先下载模板
              </div>
            </template>
          </el-upload>

          <div style="display:flex;gap:10px;justify-content:center">
            <el-button type="primary" :disabled="!selectedFile" @click="doImport" :loading="importing">
              <el-icon><Upload /></el-icon>开始导入
            </el-button>
            <el-button @click="downloadTemplate">
              <el-icon><Download /></el-icon>下载导入模板
            </el-button>
          </div>

          <el-divider />

          <div v-if="importResult">
            <div class="section-title">
              <el-icon style="margin-right:4px"><Select /></el-icon>
              导入结果
            </div>
            <el-descriptions :column="2" border size="small" style="margin-bottom:12px">
              <el-descriptions-item label="读取行数">{{ importResult.total_rows }}</el-descriptions-item>
              <el-descriptions-item label="成功">
                <span style="color:#67c23a;font-weight:600">{{ importResult.created_count }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="失败">
                <span style="color:#f56c6c;font-weight:600">{{ importResult.failed_count }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="原始列">{{ importResult.columns?.join('、') || '—' }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="importResult.created?.length" style="margin-bottom:10px">
              <div style="font-size:13px;color:#606266;margin-bottom:6px">成功创建的记录：</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <el-tag
                  v-for="c in importResult.created"
                  :key="c.id"
                  type="success"
                  effect="light"
                  style="cursor:pointer"
                  @click="$router.push(`/feedbacks/${c.id}`)"
                >
                  {{ c.feedback_no }}
                </el-tag>
              </div>
            </div>
            <el-alert
              v-for="(f, idx) in importResult.failed"
              :key="idx"
              :title="`第 ${f.row} 行失败：${f.error}`"
              type="error"
              :closable="false"
              style="margin-top:6px"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never" style="margin-bottom:16px">
          <div class="section-title">
            <el-icon style="margin-right:4px"><Download /></el-icon>
            导出数据
          </div>
          <div class="action-hint">
            <b>导出内容：</b>当前筛选条件下的全部记录。Excel 含所有字段（含原始数据痕迹），可继续编辑后再导入。
            PDF 用于正式汇报打印，排版友好。
          </div>

          <el-form :model="exportFilter" label-width="80px" style="margin:14px 0">
            <el-form-item label="状态">
              <el-select v-model="exportFilter.status" clearable placeholder="全部" style="width:100%">
                <el-option
                  v-for="(label, key) in store.statusLabels"
                  :key="key"
                  :label="label"
                  :value="key"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="来源">
              <el-select v-model="exportFilter.source" clearable placeholder="全部" style="width:100%">
                <el-option label="12345热线" value="12345热线" />
                <el-option label="社区微信群" value="社区微信群" />
                <el-option label="现场巡查" value="现场巡查" />
                <el-option label="人大建议转办" value="人大建议转办" />
              </el-select>
            </el-form-item>
            <el-form-item label="桥名">
              <el-input v-model="exportFilter.bridge_name" clearable placeholder="模糊搜索" />
            </el-form-item>
            <el-form-item label="关键词">
              <el-input v-model="exportFilter.keyword" clearable placeholder="内容/地点/编号" />
            </el-form-item>
          </el-form>

          <div style="display:flex;gap:10px">
            <el-button type="success" @click="doExcel" style="flex:1">
              <el-icon><Document /></el-icon>导出 Excel
            </el-button>
            <el-button style="flex:1;background:#6c5ce7;color:#fff" @click="doPdf">
              <el-icon><Printer /></el-icon>导出 PDF 报告
            </el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <div class="section-title" style="border-left-color:#e6a23c">
            <el-icon style="margin-right:4px"><Files /></el-icon>
            老曹工作提醒
          </div>
          <div style="font-size:13px;line-height:2;color:#606266">
            <div>✅ 每次导入后先去"状态看板"看新增的待处理数量</div>
            <div>✅ 先去"重复归并中心"扫一遍，避免同一地点重复核</div>
            <div>✅ 缺材料的别拖着，转"待补材料"写清楚缺什么</div>
            <div>✅ 领导问起时，点详情看"操作日志"和"领导问询"字段</div>
            <div>✅ 月底导出 PDF 汇报，Excel 留底继续用</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/store'
import { api } from '@/api'
import { ElMessage } from 'element-plus'

const store = useAppStore()
const selectedFile = ref(null)
const importing = ref(false)
const importResult = ref(null)

const exportFilter = reactive({
  status: '',
  source: '',
  bridge_name: '',
  keyword: ''
})

onMounted(async () => {
  if (!store.statusLabels || !Object.keys(store.statusLabels).length) {
    await store.loadStatusInfo()
  }
})

const handleFile = file => {
  selectedFile.value = file.raw
  importResult.value = null
}

const doImport = async () => {
  if (!selectedFile.value) return
  importing.value = true
  try {
    importResult.value = await api.importExcel(selectedFile.value, store.operator)
    const { created_count, failed_count } = importResult.value
    if (failed_count === 0) {
      ElMessage.success(`导入成功，新增 ${created_count} 条记录`)
    } else {
      ElMessage.warning(`导入完成：成功 ${created_count} 条，失败 ${failed_count} 条`)
    }
    await store.loadDashboard()
  } finally {
    importing.value = false
  }
}

const doExcel = () => {
  api.exportExcel({ ...exportFilter })
  ElMessage.success('正在生成 Excel，稍后浏览器会自动下载')
}

const doPdf = () => {
  api.exportPdf({ ...exportFilter })
  ElMessage.success('正在生成 PDF 报告，稍后浏览器会自动下载')
}

const downloadTemplate = () => {
  const content = [
    ['来源', '原始地点', '反馈内容', '反映人', '联系方式', '反馈日期', '桥名', '影响范围', '备注'],
    ['12345热线', 'XX路与YY路交叉口，慢行桥南坡道', '轮椅上坡太陡，老人推不动', '李阿姨家属', '138****1234', '2026-05-20', 'XX路慢行桥', '涉及坡道全长约40米', '示例行，可删除']
  ]
  const csv = content.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '慢行桥坡道容量复核_导入模板.csv'
  a.click()
  window.URL.revokeObjectURL(url)
  ElMessage.success('模板已下载，可用 Excel 打开编辑后另存为 .xlsx 再导入')
}
</script>
