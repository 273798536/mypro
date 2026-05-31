<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">票房流水</div>
      <div>
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>录入流水
        </el-button>
        <el-button @click="showImportDialog">
          <el-icon><Upload /></el-icon>导入流水
        </el-button>
      </div>
    </div>

    <div class="card-section" style="margin-bottom: 16px;">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filterFilm" placeholder="筛选影片" clearable style="width:100%">
            <el-option v-for="c in store.contracts" :key="c.id" :label="c.filmName" :value="c.id" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-input v-model="filterPeriod" placeholder="结算周期 如2026-05" clearable />
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width:100%">
            <el-option label="待确认" value="pending" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已对账" value="reconciled" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div class="card-section">
      <el-table :data="filteredData" style="width: 100%">
        <el-table-column prop="filmName" label="影片" width="120" />
        <el-table-column prop="flowDate" label="流水日期" width="110" />
        <el-table-column prop="cinemaName" label="影院" min-width="150" />
        <el-table-column label="票房金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-display">{{ row.boxOfficeAmount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="服务费" width="100" align="right">
          <template #default="{ row }">
            <span class="text-muted">{{ row.serviceFee.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="净票房" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-display text-success">{{ row.netBoxOffice.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="settlementPeriod" label="结算周期" width="100" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="boStatusTag(row.status)" size="small">{{ boStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.rawMaterialId" type="info" size="small">导入</el-tag>
            <el-tag v-else size="small">手动</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" link size="small" @click="confirmBO(row)">确认</el-button>
            <el-button type="primary" link size="small" @click="editBO(row)">编辑</el-button>
            <el-button type="info" link size="small" @click="viewTraces(row)">追踪</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="createVisible" :title="editingId ? '编辑票房流水' : '录入票房流水'" width="600px" destroy-on-close>
      <el-form :model="formData" label-width="100px">
        <el-form-item label="影片名称" required>
          <el-select v-model="formData.contractId" placeholder="选择影片" style="width:100%" @change="onFilmSelect">
            <el-option v-for="c in store.contracts" :key="c.id" :label="c.filmName" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="流水日期">
              <el-date-picker v-model="formData.flowDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结算周期">
              <el-input v-model="formData.settlementPeriod" placeholder="如 2026-05" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="影院名称">
          <el-input v-model="formData.cinemaName" placeholder="影院名称" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="票房金额">
              <el-input-number v-model="formData.boxOfficeAmount" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务费">
              <el-input-number v-model="formData.serviceFee" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="saveBO">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="导入票房流水" width="600px">
      <el-upload drag :auto-upload="false" accept=".xlsx,.xls,.csv" :on-change="handleFileChange" :limit="1">
        <el-icon size="40"><UploadFilled /></el-icon>
        <div>拖拽或点击上传 Excel 文件</div>
      </el-upload>
      <div v-if="previewData.length > 0" style="margin-top: 16px;">
        <el-alert type="info" :closable="false">预览到 {{ previewData.length }} 条数据</el-alert>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :disabled="previewData.length === 0" @click="confirmImport">确认导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="traceVisible" title="影响追踪" width="600px">
      <el-empty v-if="traces.length === 0" description="暂无追踪记录" :image-size="60" />
      <div v-else>
        <div v-for="t in traces" :key="t.id" class="trace-item" :class="t.impactType === 'exception_trigger' ? 'danger' : t.impactType === 'status_change' ? 'warning' : ''">
          <div class="flex-between mb-10">
            <strong>{{ t.impactDescription }}</strong>
            <el-tag :type="t.impactType === 'exception_trigger' ? 'danger' : 'info'" size="small">
              {{ t.impactType === 'value_change' ? '值变更' : t.impactType === 'status_change' ? '状态变更' : '异常触发' }}
            </el-tag>
          </div>
          <div class="text-muted" style="font-size: 12px;">{{ t.createdAt }} | {{ t.createdBy.name }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { useBusinessStore } from '../stores/business'
import type { BoxOfficeFlow, ImpactTrace } from '../types'

const store = useBusinessStore()
const createVisible = ref(false)
const importVisible = ref(false)
const traceVisible = ref(false)
const editingId = ref('')
const traces = ref<ImpactTrace[]>([])
const filterFilm = ref('')
const filterPeriod = ref('')
const filterStatus = ref('')
const previewData = ref<Record<string, any>[]>([])
const currentFile = ref<File | null>(null)

const defaultForm = (): Partial<BoxOfficeFlow> => ({
  contractId: '', filmName: '', flowDate: '', cinemaName: '',
  boxOfficeAmount: 0, serviceFee: 0, settlementPeriod: '', status: 'pending', remark: ''
})
const formData = ref<Partial<BoxOfficeFlow>>(defaultForm())

const filteredData = computed(() => {
  return store.boxOffices.filter(b => {
    if (filterFilm.value && b.contractId !== filterFilm.value) return false
    if (filterPeriod.value && b.settlementPeriod !== filterPeriod.value) return false
    if (filterStatus.value && b.status !== filterStatus.value) return false
    return true
  })
})

function boStatusTag(s: string) { return { pending: 'warning', confirmed: 'success', reconciled: 'info' }[s] || '' }
function boStatusLabel(s: string) { return { pending: '待确认', confirmed: '已确认', reconciled: '已对账' }[s] || s }

function showCreateDialog() { editingId.value = ''; formData.value = defaultForm(); createVisible.value = true }
function onFilmSelect(id: string) { const c = store.contracts.find(c => c.id === id); if (c) formData.value.filmName = c.filmName }

function editBO(row: BoxOfficeFlow) { editingId.value = row.id; formData.value = { ...row }; createVisible.value = true }

function saveBO() {
  if (!formData.value.filmName) { ElMessage.warning('请选择影片'); return }
  if (editingId.value) { store.updateBoxOffice(editingId.value, formData.value); ElMessage.success('已更新') }
  else { store.createBoxOffice(formData.value); ElMessage.success('已录入') }
  createVisible.value = false
}

function confirmBO(row: BoxOfficeFlow) {
  store.updateBoxOffice(row.id, { status: 'confirmed' })
  ElMessage.success('已确认')
}

function viewTraces(row: BoxOfficeFlow) { traces.value = store.getEntityTraces(row.id); traceVisible.value = true }

function handleFileChange(file: any) {
  const f = file.raw || file; currentFile.value = f
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target!.result as ArrayBuffer)
    const wb = XLSX.read(data, { type: 'array' })
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]])
    previewData.value = json
  }
  reader.readAsArrayBuffer(f)
}

function confirmImport() {
  if (previewData.value.length === 0) return
  const material = store.importRawMaterial('boxoffice', currentFile.value?.name || '粘贴', currentFile.value?.size || 0, previewData.value, '票房流水导入')
  const mapping: Record<string, string> = {}
  const cols = previewData.value.length > 0 ? Object.keys(previewData.value[0]) : []
  cols.forEach(col => {
    const l = col.toLowerCase()
    if (l.includes('影片') || l.includes('名称')) mapping.filmName = col
    else if (l.includes('日期')) mapping.flowDate = col
    else if (l.includes('影院')) mapping.cinemaName = col
    else if (l.includes('票房')) mapping.boxOfficeAmount = col
    else if (l.includes('服务费')) mapping.serviceFee = col
    else if (l.includes('净票房')) mapping.netBoxOffice = col
    else if (l.includes('周期') || l.includes('结算')) mapping.settlementPeriod = col
  })
  const result = store.processRawMaterial(material.id, 'boxoffice', mapping)
  if (result.success > 0) ElMessage.success(`成功导入 ${result.success} 条`)
  if (result.failed > 0) ElMessage.warning(`${result.failed} 条失败`)
  importVisible.value = false
}
</script>
