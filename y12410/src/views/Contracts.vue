<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">影片合同</div>
      <div>
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>新建合同
        </el-button>
        <el-button @click="showImportDialog">
          <el-icon><Upload /></el-icon>导入合同
        </el-button>
      </div>
    </div>

    <div class="card-section">
      <el-table :data="filteredContracts" style="width: 100%" @row-click="handleRowClick">
        <el-table-column prop="filmName" label="影片名称" min-width="120">
          <template #default="{ row }">
            <el-button type="primary" link>{{ row.filmName }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="contractNo" label="合同编号" width="130" />
        <el-table-column prop="distributor" label="发行方" width="160" />
        <el-table-column prop="producer" label="出品方" width="160" />
        <el-table-column label="保底金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-display">{{ formatAmt(row.guaranteeAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="保底票房" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-display">{{ formatAmt(row.guaranteeBoxOffice) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="出品方分账" width="100" align="center">
          <template #default="{ row }">{{ row.producerShareRate }}%</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.rawMaterialId" type="info" size="small">导入</el-tag>
            <el-tag v-else size="small">手动</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="editContract(row)">编辑</el-button>
            <el-button type="info" link size="small" @click.stop="viewTraces(row)">追踪</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="createVisible" :title="editingId ? '编辑合同' : '新建合同'" width="700px" destroy-on-close>
      <el-form :model="formData" label-width="110px" size="default">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="影片名称" required>
              <el-input v-model="formData.filmName" placeholder="输入影片名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同编号" required>
              <el-input v-model="formData.contractNo" placeholder="输入合同编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出品方" required>
              <el-input v-model="formData.producer" placeholder="出品方名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发行方" required>
              <el-input v-model="formData.distributor" placeholder="发行方名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="签订日期">
              <el-date-picker v-model="formData.contractDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结算周期">
              <el-select v-model="formData.settlementCycle" style="width:100%">
                <el-option label="月度" value="月度" />
                <el-option label="季度" value="季度" />
                <el-option label="半年度" value="半年度" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">保底条款</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="保底金额(元)" required>
              <el-input-number v-model="formData.guaranteeAmount" :min="0" :step="1000000" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="保底票房(元)">
              <el-input-number v-model="formData.guaranteeBoxOffice" :min="0" :step="10000000" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出品方分账%" required>
              <el-input-number v-model="formData.producerShareRate" :min="0" :max="100" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发行方分账%">
              <el-input-number v-model="formData.distributorShareRate" :min="0" :max="100" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="宣发预算(元)">
              <el-input-number v-model="formData.promoBudget" :min="0" :step="100000" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同状态">
              <el-select v-model="formData.status" style="width:100%">
                <el-option label="生效中" value="active" />
                <el-option label="已终止" value="terminated" />
                <el-option label="已完结" value="completed" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="有效期起">
              <el-date-picker v-model="formData.validFrom" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期止">
              <el-date-picker v-model="formData.validTo" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="saveContract">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="导入合同数据" width="600px">
      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        accept=".xlsx,.xls,.csv"
        :on-change="handleFileChange"
        :limit="1"
      >
        <el-icon size="40"><UploadFilled /></el-icon>
        <div>拖拽或点击上传 Excel 文件</div>
      </el-upload>
      <div v-if="previewData.length > 0" style="margin-top: 16px;">
        <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
          预览到 {{ previewData.length }} 条数据，确认后导入
        </el-alert>
        <el-table :data="previewData.slice(0, 5)" size="small" max-height="200">
          <el-table-column v-for="col in previewColumns" :key="col" :prop="col" :label="col" min-width="100" />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :disabled="previewData.length === 0" @click="confirmImport">确认导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="traceVisible" title="影响追踪" width="700px">
      <div v-if="traceEntity">
        <div class="mb-10"><strong>{{ traceEntity.filmName }}</strong> 的影响链路</div>
      </div>
      <el-empty v-if="traces.length === 0" description="暂无影响追踪记录" :image-size="60" />
      <div v-else>
        <div v-for="t in traces" :key="t.id" class="trace-item" :class="traceClass(t.impactType)">
          <div class="flex-between mb-10">
            <strong>{{ t.impactDescription }}</strong>
            <el-tag :type="t.impactType === 'exception_trigger' ? 'danger' : t.impactType === 'status_change' ? 'warning' : 'info'" size="small">
              {{ t.impactType === 'value_change' ? '值变更' : t.impactType === 'status_change' ? '状态变更' : '异常触发' }}
            </el-tag>
          </div>
          <div class="text-muted" style="font-size: 12px;">
            {{ t.sourceEntity }}.{{ t.sourceField }} → {{ t.targetEntity }}.{{ t.targetField }}
          </div>
          <div class="text-muted" style="font-size: 12px;">
            {{ t.createdAt }} | {{ t.createdBy.name }}
          </div>
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
import type { FilmContract, ImpactTrace } from '../types'

const store = useBusinessStore()

const createVisible = ref(false)
const importVisible = ref(false)
const traceVisible = ref(false)
const editingId = ref('')
const traceEntity = ref<FilmContract | null>(null)
const traces = ref<ImpactTrace[]>([])
const previewData = ref<Record<string, any>[]>([])
const previewColumns = ref<string[]>([])
const currentFile = ref<File | null>(null)

const defaultForm = (): Partial<FilmContract> => ({
  filmName: '', contractNo: '', contractDate: '', distributor: '', producer: '',
  guaranteeAmount: 0, guaranteeBoxOffice: 0, producerShareRate: 43, distributorShareRate: 57,
  promoBudget: 0, settlementCycle: '月度', validFrom: '', validTo: '', status: 'active', remark: ''
})

const formData = ref<Partial<FilmContract>>(defaultForm())

const filteredContracts = computed(() => store.contracts)

function formatAmt(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(2) + '万'
  return n.toLocaleString()
}

function statusTag(s: string) { return { active: 'success', terminated: 'danger', completed: 'info' }[s] || '' }
function statusLabel(s: string) { return { active: '生效中', terminated: '已终止', completed: '已完结' }[s] || s }

function showCreateDialog() {
  editingId.value = ''
  formData.value = defaultForm()
  createVisible.value = true
}

function editContract(row: FilmContract) {
  editingId.value = row.id
  formData.value = { ...row }
  createVisible.value = true
}

function saveContract() {
  if (!formData.value.filmName || !formData.value.contractNo) {
    ElMessage.warning('请填写影片名称和合同编号')
    return
  }
  if (editingId.value) {
    store.updateContract(editingId.value, formData.value)
    ElMessage.success('合同已更新')
  } else {
    store.createContract(formData.value)
    ElMessage.success('合同已创建')
  }
  createVisible.value = false
}

function handleRowClick(row: FilmContract) {
  editContract(row)
}

function viewTraces(row: FilmContract) {
  traceEntity.value = row
  traces.value = store.getEntityTraces(row.id)
  traceVisible.value = true
}

function traceClass(type: string) {
  if (type === 'exception_trigger') return 'danger'
  if (type === 'status_change') return 'warning'
  return ''
}

function showImportDialog() {
  previewData.value = []
  previewColumns.value = []
  currentFile.value = null
  importVisible.value = true
}

function handleFileChange(file: any) {
  const f = file.raw || file
  currentFile.value = f
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target!.result as ArrayBuffer)
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws)
    if (json.length > 0) {
      previewColumns.value = Object.keys(json[0])
      previewData.value = json
    }
  }
  reader.readAsArrayBuffer(f)
}

function confirmImport() {
  if (previewData.value.length === 0) return
  const material = store.importRawMaterial(
    'contract',
    currentFile.value?.name || '手动粘贴',
    currentFile.value?.size || 0,
    previewData.value,
    '合同数据导入'
  )
  const mapping: Record<string, string> = {}
  previewColumns.value.forEach(col => {
    const lower = col.toLowerCase()
    if (lower.includes('影片') || lower.includes('名称')) mapping.filmName = col
    else if (lower.includes('编号') || lower.includes('合同')) mapping.contractNo = col
    else if (lower.includes('日期') || lower.includes('签订')) mapping.contractDate = col
    else if (lower.includes('发行')) mapping.distributor = col
    else if (lower.includes('出品')) mapping.producer = col
    else if (lower.includes('保底') && lower.includes('金额')) mapping.guaranteeAmount = col
    else if (lower.includes('保底') && lower.includes('票房')) mapping.guaranteeBoxOffice = col
    else if (lower.includes('出品') && lower.includes('分账')) mapping.producerShareRate = col
    else if (lower.includes('发行') && lower.includes('分账')) mapping.distributorShareRate = col
    else if (lower.includes('预算') || lower.includes('宣发')) mapping.promoBudget = col
  })
  const result = store.processRawMaterial(material.id, 'contract', mapping)
  if (result.success > 0) ElMessage.success(`成功导入 ${result.success} 条合同`)
  if (result.failed > 0) ElMessage.warning(`${result.failed} 条导入失败`)
  if (result.errors.length > 0) console.warn('导入错误:', result.errors)
  importVisible.value = false
}
</script>
