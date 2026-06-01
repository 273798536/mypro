<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { formatCurrency } from '@/utils/currency'
import { validateConversionData } from '@/utils/validation'
import type { ConversionData, ConversionStatus, CurrencyUnit } from '@/types'
import {
  Plus,
  Edit2,
  X,
  Save,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  FileText,
  AlertCircle,
  Info
} from 'lucide-vue-next'
import { validateConversionData as validateConversionDataFn } from '@/utils/validation'
import dayjs from 'dayjs'

const store = useBudgetStore()

const showAddModal = ref(false)
const filterStatus = ref<ConversionStatus | ''>('')
const filterChannel = ref<string>('')
const showDelayedOnly = ref(false)
const showSupplementaryOnly = ref(false)

const statusOptions: { value: ConversionStatus | ''; label: string; color: string }[] = [
  { value: '', label: '全部状态', color: '' },
  { value: 'PENDING', label: '待确认', color: 'badge-warning' },
  { value: 'CONFIRMED', label: '已确认', color: 'badge-success' },
  { value: 'REJECTED', label: '已拒绝', color: 'badge-danger' },
  { value: 'DELAYED', label: '延迟归因', color: 'badge-info' }
]

const currencyOptions: { value: CurrencyUnit; label: string }[] = [
  { value: 'CNY', label: '人民币 (CNY)' },
  { value: 'USD', label: '美元 (USD)' },
  { value: 'EUR', label: '欧元 (EUR)' },
  { value: 'JPY', label: '日元 (JPY)' }
]

const newConversion = reactive({
  channelId: '',
  materialId: '',
  conversionDate: '',
  attributionDate: '',
  conversionCount: 0,
  conversionValue: 0,
  delayDays: 0,
  status: 'PENDING' as ConversionStatus,
  unitPrice: 0,
  currencyUnit: 'CNY' as CurrencyUnit,
  remark: '',
  isSupplementary: false
})

const validationErrors = ref<{ field: string; message: string }[]>([])
const validationWarnings = ref<{ field: string; message: string }[]>([])

const filteredConversions = computed(() => {
  let result = store.conversions

  if (filterStatus.value) {
    result = result.filter(c => c.status === filterStatus.value)
  }

  if (filterChannel.value) {
    result = result.filter(c => c.channelId === filterChannel.value)
  }

  if (showDelayedOnly.value) {
    result = result.filter(c => c.delayDays > 7)
  }

  if (showSupplementaryOnly.value) {
    result = result.filter(c => c.isSupplementary)
  }

  return result
})

const channelOptions = computed(() =>
  store.channels.map(c => ({ value: c.id, label: c.channelName }))
)

const materialOptions = computed(() =>
  store.materials.map(m => ({ value: m.id, label: m.name }))
)

function getStatusLabel(status: ConversionStatus): string {
  return statusOptions.find(o => o.value === status)?.label || status
}

function getStatusClass(status: ConversionStatus): string {
  return statusOptions.find(o => o.value === status)?.color || 'badge-secondary'
}

function getChannelName(channelId: string): string {
  return store.channels.find(c => c.id === channelId)?.channelName || '未知渠道'
}

function getMaterialName(materialId: string): string {
  return store.materials.find(m => m.id === materialId)?.name || '未知素材'
}

function calculateDelayDays(conversionDate: string, attributionDate: string): number {
  if (!conversionDate || !attributionDate) return 0
  return dayjs(attributionDate).diff(dayjs(conversionDate), 'day')
}

function updateDelayDays() {
  newConversion.delayDays = calculateDelayDays(newConversion.conversionDate, newConversion.attributionDate)
}

function openAddModal() {
  Object.assign(newConversion, {
    channelId: store.channels[0]?.id || '',
    materialId: store.materials[0]?.id || '',
    conversionDate: '',
    attributionDate: '',
    conversionCount: 0,
    conversionValue: 0,
    delayDays: 0,
    status: 'PENDING' as ConversionStatus,
    unitPrice: 0,
    currencyUnit: 'CNY' as CurrencyUnit,
    remark: '',
    isSupplementary: false
  })
  validationErrors.value = []
  validationWarnings.value = []
  showAddModal.value = true
}

function validateForm(form: any) {
  const result = validateConversionDataFn(form)
  validationErrors.value = result.errors.map(e => ({ field: e.field, message: e.message }))
  validationWarnings.value = result.warnings.map(w => ({ field: w.field, message: w.message }))
  return result.valid
}

function addConversion() {
  if (!validateForm(newConversion)) return

  try {
    store.addConversion({
      ...newConversion,
      affectedRecordIds: []
    })
    showAddModal.value = false
  } catch (e: any) {
    alert(e.message)
  }
}

function getFieldError(field: string): string | undefined {
  return validationErrors.value.find(e => e.field === field)?.message
}

function getFieldWarning(field: string): string | undefined {
  return validationWarnings.value.find(w => w.field === field)?.message
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">总转化数</div>
            <div class="stat-value">
              {{ store.conversions.reduce((sum, c) => sum + c.conversionCount, 0).toLocaleString() }}
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center text-success-600">
            <CheckCircle class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">延迟转化</div>
            <div class="stat-value text-warning-600">
              {{ store.delayedConversions.length }}
            </div>
            <div class="stat-change text-slate-500">
              超过7天延迟
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center text-warning-600">
            <Clock class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">补录记录</div>
            <div class="stat-value text-primary-600">
              {{ store.conversions.filter(c => c.isSupplementary).length }}
            </div>
            <div class="stat-change text-slate-500">
              影响明细已标记
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
            <FileText class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">待确认</div>
            <div class="stat-value text-slate-600">
              {{ store.conversions.filter(c => c.status === 'PENDING').length }}
            </div>
            <div class="stat-change text-slate-500">
              需要人工审核
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <AlertCircle class="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <div class="relative">
          <Filter class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            v-model="filterStatus"
            class="input-field pl-9 pr-8 appearance-none bg-white min-w-[140px]"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <select
          v-model="filterChannel"
          class="input-field min-w-[180px]"
        >
          <option value="">全部渠道</option>
          <option v-for="opt in channelOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="showDelayedOnly"
            class="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
          />
          <span class="text-sm text-slate-600">仅显示延迟转化</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="showSupplementaryOnly"
            class="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
          />
          <span class="text-sm text-slate-600">仅显示补录记录</span>
        </label>

        <span class="text-sm text-slate-500">
          共 {{ filteredConversions.length }} 条记录
        </span>
      </div>

      <button class="btn-primary" @click="openAddModal">
        <Plus class="w-4 h-4 mr-2" />
        录入转化
      </button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>转化信息</th>
              <th>关联对象</th>
              <th>日期与延迟</th>
              <th>转化数据</th>
              <th>状态</th>
              <th>标记</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="conversion in filteredConversions" :key="conversion.id">
              <td>
                <div class="space-y-1">
                  <div class="font-medium text-slate-900">
                    转化 #{{ conversion.id.slice(0, 8) }}
                  </div>
                  <div class="text-sm text-slate-500">
                    {{ formatCurrency(conversion.conversionValue, conversion.currencyUnit) }}
                  </div>
                </div>
              </td>
              <td>
                <div class="space-y-1">
                  <div class="text-sm text-slate-900">
                    渠道: {{ getChannelName(conversion.channelId) }}
                  </div>
                  <div class="text-sm text-slate-500">
                    素材: {{ getMaterialName(conversion.materialId) }}
                  </div>
                </div>
              </td>
              <td>
                <div class="space-y-1">
                  <div class="text-sm text-slate-900">
                    转化: {{ conversion.conversionDate }}
                  </div>
                  <div class="text-sm text-slate-500">
                    归因: {{ conversion.attributionDate }}
                  </div>
                  <div
                    class="flex items-center gap-1"
                    :class="{
                      'text-warning-600': conversion.delayDays > 7,
                      'text-slate-500': conversion.delayDays <= 7
                    }"
                  >
                    <Clock v-if="conversion.delayDays > 7" class="w-3 h-3" />
                    <span class="text-xs">延迟 {{ conversion.delayDays }} 天</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="space-y-1">
                  <div class="text-sm text-slate-900">
                    数量: {{ conversion.conversionCount.toLocaleString() }}
                  </div>
                  <div class="text-sm text-slate-500">
                    单价: {{ formatCurrency(conversion.unitPrice, conversion.currencyUnit) }}
                  </div>
                </div>
              </td>
              <td>
                <span :class="['badge', getStatusClass(conversion.status)]">
                  {{ getStatusLabel(conversion.status) }}
                </span>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-if="conversion.isSupplementary"
                    class="badge-info flex items-center gap-1"
                  >
                    <RefreshCw class="w-3 h-3" />
                    补录
                  </span>
                  <span
                    v-if="conversion.affectedRecordIds.length > 0"
                    class="badge-warning flex items-center gap-1"
                    data-tip="补录已影响预算分配明细"
                  >
                    <AlertTriangle class="w-3 h-3" />
                    影响 {{ conversion.affectedRecordIds.length }} 条明细
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold text-slate-900">转化数据处理规则</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="p-4 bg-slate-50 rounded-lg">
            <div class="flex items-center gap-2 font-medium text-slate-900 mb-2">
              <Clock class="w-5 h-5 text-warning-600" />
              转化延迟处理
            </div>
            <p class="text-sm text-slate-600">
              系统自动计算转化发生日期与归因日期的间隔天数。
              延迟超过7天会标黄警告，超过30天会特别提示。
              延迟数据不会自动丢弃，需业务确认后处理。
            </p>
          </div>
          <div class="p-4 bg-slate-50 rounded-lg">
            <div class="flex items-center gap-2 font-medium text-slate-900 mb-2">
              <RefreshCw class="w-5 h-5 text-primary-600" />
              补录记录标记
            </div>
            <p class="text-sm text-slate-600">
              勾选"补录记录"后，系统会自动标记该记录影响的所有预算分配明细，
              在报表中可追溯哪些分配结果受到了补录数据的影响。
            </p>
          </div>
          <div class="p-4 bg-slate-50 rounded-lg">
            <div class="flex items-center gap-2 font-medium text-slate-900 mb-2">
              <AlertTriangle class="w-5 h-5 text-danger-600" />
              数据冲突检测
            </div>
            <p class="text-sm text-slate-600">
              系统会对比渠道数据计算的预期转化数与实际录入的转化数，
              差异超过10%时会触发冲突警告。系统不会自动修改数据，
              请业务同事确认口径后再处理。
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal max-w-3xl">
        <div class="modal-header">
          <h3 class="text-lg font-semibold text-slate-900">
            录入转化数据
          </h3>
          <button
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            @click="showAddModal = false"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="validationErrors.length > 0" class="alert-error mb-4">
            <div class="flex items-start gap-2">
              <AlertTriangle class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div class="font-medium">请修正以下错误</div>
                <ul class="list-disc list-inside mt-1 text-sm">
                  <li v-for="(err, idx) in validationErrors" :key="idx">{{ err.message }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div v-if="validationWarnings.length > 0" class="alert-warning mb-4">
            <div class="flex items-start gap-2">
              <AlertTriangle class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div class="font-medium">请注意以下提示</div>
                <ul class="list-disc list-inside mt-1 text-sm">
                  <li v-for="(warn, idx) in validationWarnings" :key="idx">{{ warn.message }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="label">关联渠道</label>
              <select
                v-model="newConversion.channelId"
                class="input-field"
              >
                <option v-for="opt in channelOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">关联素材</label>
              <select
                v-model="newConversion.materialId"
                class="input-field"
              >
                <option v-for="opt in materialOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">转化发生日期</label>
              <input
                v-model="newConversion.conversionDate"
                type="date"
                class="input-field"
                @change="updateDelayDays"
              />
            </div>

            <div>
              <label class="label">归因日期</label>
              <input
                v-model="newConversion.attributionDate"
                type="date"
                class="input-field"
                :class="{ 'input-error': getFieldError('attributionDate') }"
                @change="updateDelayDays"
              />
              <p v-if="getFieldError('attributionDate')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('attributionDate') }}
              </p>
            </div>

            <div>
              <label class="label">延迟天数（自动计算）</label>
              <input
                v-model.number="newConversion.delayDays"
                type="number"
                min="0"
                class="input-field bg-slate-50"
                readonly
              />
              <p v-if="getFieldWarning('delayDays')" class="text-xs text-warning-600 mt-1">
                {{ getFieldWarning('delayDays') }}
              </p>
            </div>

            <div>
              <label class="label">转化状态</label>
              <select
                v-model="newConversion.status"
                class="input-field"
              >
                <option value="PENDING">待确认</option>
                <option value="CONFIRMED">已确认</option>
                <option value="REJECTED">已拒绝</option>
                <option value="DELAYED">延迟归因</option>
              </select>
            </div>

            <div>
              <label class="label">货币单位</label>
              <select
                v-model="newConversion.currencyUnit"
                class="input-field"
              >
                <option v-for="opt in currencyOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">转化数量</label>
              <input
                v-model.number="newConversion.conversionCount"
                type="number"
                min="0"
                class="input-field"
                :class="{ 'input-error': getFieldError('conversionCount') }"
                placeholder="请输入转化数量"
              />
              <p v-if="getFieldError('conversionCount')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('conversionCount') }}
              </p>
            </div>

            <div>
              <label class="label">转化价值</label>
              <input
                v-model.number="newConversion.conversionValue"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                :class="{ 'input-error': getFieldError('conversionValue') }"
                placeholder="请输入转化总价值"
              />
              <p v-if="getFieldError('conversionValue')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('conversionValue') }}
              </p>
            </div>

            <div>
              <label class="label">单价</label>
              <input
                v-model.number="newConversion.unitPrice"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                placeholder="请输入单个转化价值"
              />
            </div>

            <div class="md:col-span-2">
              <label class="label">备注</label>
              <textarea
                v-model="newConversion.remark"
                class="input-field"
                rows="2"
                placeholder="请输入备注信息（可选）"
              ></textarea>
            </div>

            <div class="md:col-span-2">
              <label class="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  v-model="newConversion.isSupplementary"
                  class="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500 mt-0.5"
                />
                <div>
                  <div class="font-medium text-slate-900">补录记录</div>
                  <p class="text-sm text-slate-500 mt-1">
                    勾选表示此条记录为事后补录。系统会自动标记该记录影响的预算分配明细，
                    并在报表中突出显示。
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAddModal = false">
            取消
          </button>
          <button class="btn-primary" @click="addConversion">
            <Save class="w-4 h-4 mr-2" />
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
