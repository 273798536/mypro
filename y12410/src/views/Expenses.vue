<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">宣发费用</div>
      <div>
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>录入费用
        </el-button>
        <el-button @click="showImportDialog">
          <el-icon><Upload /></el-icon>导入费用
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
          <el-select v-model="filterStatus" placeholder="审批状态" clearable style="width:100%">
            <el-option label="待审批" value="pending" />
            <el-option label="已审批" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterBearer" placeholder="费用承担" clearable style="width:100%">
            <el-option label="出品方承担" value="producer" />
            <el-option label="发行方承担" value="distributor" />
            <el-option label="双方分摊" value="shared" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div class="card-section">
      <el-table :data="filteredData" style="width: 100%">
        <el-table-column prop="filmName" label="影片" width="120" />
        <el-table-column prop="expenseDate" label="费用日期" width="110" />
        <el-table-column prop="expenseType" label="费用类型" width="100" />
        <el-table-column prop="expenseItem" label="费用项目" min-width="140" />
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">
            <span class="amount-display">{{ row.amount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="承担方" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="bearerTag(row.bearer)" size="small">{{ bearerLabel(row.bearer) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分摊比例" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.bearer === 'shared'">{{ row.shareRate }}%</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="settlementPeriod" label="结算周期" width="100" />
        <el-table-column label="审批" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="expStatusTag(row.status)" size="small">{{ expStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="已追扣" width="70" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.isDeducted" class="text-success"><Check /></el-icon>
            <el-icon v-else class="text-muted"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.rawMaterialId" type="info" size="small">导入</el-tag>
            <el-tag v-else size="small">手动</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" link size="small" @click="approveExp(row)">审批</el-button>
            <el-button v-if="row.status === 'pending'" type="danger" link size="small" @click="rejectExp(row)">驳回</el-button>
            <el-button type="primary" link size="small" @click="editExp(row)">编辑</el-button>
            <el-button type="info" link size="small" @click="viewTraces(row)">追踪</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="createVisible" :title="editingId ? '编辑宣发费用' : '录入宣发费用'" width="600px" destroy-on-close>
      <el-form :model="formData" label-width="100px">
        <el-form-item label="影片名称" required>
          <el-select v-model="formData.contractId" placeholder="选择影片" style="width:100%" @change="onFilmSelect">
            <el-option v-for="c in store.contracts" :key="c.id" :label="c.filmName" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="费用日期">
              <el-date-picker v-model="formData.expenseDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结算周期">
              <el-input v-model="formData.settlementPeriod" placeholder="如 2026-05" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="费用类型">
              <el-select v-model="formData.expenseType" style="width:100%">
                <el-option label="宣发推广" value="宣发推广" />
                <el-option label="线下活动" value="线下活动" />
                <el-option label="物料制作" value="物料制作" />
                <el-option label="媒体投放" value="媒体投放" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="费用项目">
              <el-input v-model="formData.expenseItem" placeholder="费用项目说明" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="费用金额" required>
              <el-input-number v-model="formData.amount" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="费用承担">
              <el-select v-model="formData.bearer" style="width:100%">
                <el-option label="出品方承担" value="producer" />
                <el-option label="发行方承担" value="distributor" />
                <el-option label="双方分摊" value="shared" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="formData.bearer === 'shared'" :gutter="16">
          <el-col :span="12">
            <el-form-item label="出品方比例%">
              <el-input-number v-model="formData.shareRate" :min="0" :max="100" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="saveExp">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="导入宣发费用" width="600px">
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
        <div v-for="t in traces" :key="t.id" class="trace-item" :class="t.impactType === 'exception_trigger' ? 'danger' : ''">
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
import type { PromoExpense, ImpactTrace } from '../types'

const store = useBusinessStore()
const createVisible = ref(false)
const importVisible = ref(false)
const traceVisible = ref(false)
const editingId = ref('')
const traces = ref<ImpactTrace[]>([])
const filterFilm = ref('')
const filterStatus = ref('')
const filterBearer = ref('')
const previewData = ref<Record<string, any>[]>([])
const currentFile = ref<File | null>(null)

const defaultForm = (): Partial<PromoExpense> => ({
  contractId: '', filmName: '', expenseDate: '', expenseType: '宣发推广',
  expenseItem: '', amount: 0, bearer: 'shared', shareRate: 50,
  settlementPeriod: '', isDeducted: false, deductionPeriod: '', status: 'pending', remark: ''
})
const formData = ref<Partial<PromoExpense>>(defaultForm())

const filteredData = computed(() => {
  return store.expenses.filter(e => {
    if (filterFilm.value && e.contractId !== filterFilm.value) return false
    if (filterStatus.value && e.status !== filterStatus.value) return false
    if (filterBearer.value && e.bearer !== filterBearer.value) return false
    return true
  })
})

function bearerTag(b: string) { return { producer: 'warning', distributor: '', shared: 'info' }[b] || '' }
function bearerLabel(b: string) { return { producer: '出品方', distributor: '发行方', shared: '分摊' }[b] || b }
function expStatusTag(s: string) { return { pending: 'warning', approved: 'success', rejected: 'danger' }[s] || '' }
function expStatusLabel(s: string) { return { pending: '待审批', approved: '已审批', rejected: '已驳回' }[s] || s }

function showCreateDialog() { editingId.value = ''; formData.value = defaultForm(); createVisible.value = true }
function onFilmSelect(id: string) { const c = store.contracts.find(c => c.id === id); if (c) formData.value.filmName = c.filmName }
function editExp(row: PromoExpense) { editingId.value = row.id; formData.value = { ...row }; createVisible.value = true }

function saveExp() {
  if (!formData.value.filmName) { ElMessage.warning('请选择影片'); return }
  if (editingId.value) { store.updateExpense(editingId.value, formData.value); ElMessage.success('已更新') }
  else { store.createExpense(formData.value); ElMessage.success('已录入') }
  createVisible.value = false
}

function approveExp(row: PromoExpense) { store.updateExpense(row.id, { status: 'approved' }); ElMessage.success('已审批') }
function rejectExp(row: PromoExpense) { store.updateExpense(row.id, { status: 'rejected' }); ElMessage.info('已驳回') }
function viewTraces(row: PromoExpense) { traces.value = store.getEntityTraces(row.id); traceVisible.value = true }

function handleFileChange(file: any) {
  const f = file.raw || file; currentFile.value = f
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target!.result as ArrayBuffer)
    const wb = XLSX.read(data, { type: 'array' })
    previewData.value = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]])
  }
  reader.readAsArrayBuffer(f)
}

function confirmImport() {
  if (previewData.value.length === 0) return
  const material = store.importRawMaterial('expense', currentFile.value?.name || '粘贴', currentFile.value?.size || 0, previewData.value, '宣发费用导入')
  const mapping: Record<string, string> = {}
  const cols = previewData.value.length > 0 ? Object.keys(previewData.value[0]) : []
  cols.forEach(col => {
    const l = col.toLowerCase()
    if (l.includes('影片')) mapping.filmName = col
    else if (l.includes('日期')) mapping.expenseDate = col
    else if (l.includes('类型')) mapping.expenseType = col
    else if (l.includes('项目') || l.includes('说明')) mapping.expenseItem = col
    else if (l.includes('金额')) mapping.amount = col
    else if (l.includes('承担')) mapping.bearer = col
    else if (l.includes('比例') || l.includes('分摊')) mapping.shareRate = col
    else if (l.includes('周期') || l.includes('结算')) mapping.settlementPeriod = col
  })
  const result = store.processRawMaterial(material.id, 'expense', mapping)
  if (result.success > 0) ElMessage.success(`成功导入 ${result.success} 条`)
  if (result.failed > 0) ElMessage.warning(`${result.failed} 条失败`)
  importVisible.value = false
}
</script>
