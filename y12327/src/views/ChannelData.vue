<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { formatCurrency } from '@/utils/currency'
import { validateChannelData } from '@/utils/validation'
import type { ChannelData, ChannelType, CurrencyUnit } from '@/types'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Building2,
  Search,
  Monitor,
  Users,
  Video,
  Smartphone,
  Filter,
  Download
} from 'lucide-vue-next'
import { validateChannelData as validateChannelDataFn } from '@/utils/validation'

const store = useBudgetStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingChannel = ref<ChannelData | null>(null)
const filterType = ref<ChannelType | ''>('')
const activeForm = ref<any>(null)

const channelTypeOptions: { value: ChannelType; label: string; icon: any }[] = [
  { value: 'SEARCH', label: '搜索广告', icon: Search },
  { value: 'DISPLAY', label: '展示广告', icon: Monitor },
  { value: 'SOCIAL', label: '社交广告', icon: Users },
  { value: 'VIDEO', label: '视频广告', icon: Video },
  { value: 'APP', label: '应用推广', icon: Smartphone }
]

const currencyOptions: { value: CurrencyUnit; label: string }[] = [
  { value: 'CNY', label: '人民币 (CNY)' },
  { value: 'USD', label: '美元 (USD)' },
  { value: 'EUR', label: '欧元 (EUR)' },
  { value: 'JPY', label: '日元 (JPY)' }
]

const newChannel = reactive({
  channelName: '',
  channelType: 'SEARCH' as ChannelType,
  currencyUnit: 'CNY' as CurrencyUnit,
  budget: 0,
  spentBudget: 0,
  dailyBudget: 0,
  startDate: '',
  endDate: '',
  materialIds: [] as string[],
  conversionRate: 0,
  cpc: 0,
  cpm: 0,
  impressions: 0,
  clicks: 0
})

const editForm = reactive({
  channelName: '',
  channelType: 'SEARCH' as ChannelType,
  currencyUnit: 'CNY' as CurrencyUnit,
  budget: 0,
  spentBudget: 0,
  dailyBudget: 0,
  startDate: '',
  endDate: '',
  conversionRate: 0,
  cpc: 0,
  cpm: 0,
  impressions: 0,
  clicks: 0
})

const validationErrors = ref<{ field: string; message: string }[]>([])
const validationWarnings = ref<{ field: string; message: string }[]>([])

const filteredChannels = computed(() => {
  if (!filterType.value) return store.channels
  return store.channels.filter(c => c.channelType === filterType.value)
})

function getChannelTypeIcon(type: ChannelType) {
  return channelTypeOptions.find(o => o.value === type)?.icon || Building2
}

function getChannelTypeLabel(type: string): string {
  return channelTypeOptions.find(o => o.value === type)?.label || type
}

function getBudgetUsagePercent(channel: ChannelData): number {
  if (channel.budget === 0) return 0
  return (channel.spentBudget / channel.budget) * 100
}

function isBudgetLow(channel: ChannelData): boolean {
  return getBudgetUsagePercent(channel) > 95
}

function isBudgetWarning(channel: ChannelData): boolean {
  const percent = getBudgetUsagePercent(channel)
  return percent > 80 && percent <= 95
}

function openAddModal() {
  Object.assign(newChannel, {
    channelName: '',
    channelType: 'SEARCH' as ChannelType,
    currencyUnit: 'CNY' as CurrencyUnit,
    budget: 0,
    spentBudget: 0,
    dailyBudget: 0,
    startDate: '',
    endDate: '',
    materialIds: [],
    conversionRate: 0,
    cpc: 0,
    cpm: 0,
    impressions: 0,
    clicks: 0
  })
  validationErrors.value = []
  validationWarnings.value = []
  activeForm.value = newChannel
  showAddModal.value = true
}

function validateForm(form: any) {
  const result = validateChannelDataFn(form)
  validationErrors.value = result.errors.map(e => ({ field: e.field, message: e.message }))
  validationWarnings.value = result.warnings.map(w => ({ field: w.field, message: w.message }))
  return result.valid
}

function addChannel() {
  if (!validateForm(newChannel)) return

  try {
    store.addChannel({ ...newChannel })
    showAddModal.value = false
  } catch (e: any) {
    alert(e.message)
  }
}

function openEditModal(channel: ChannelData) {
  editingChannel.value = channel
  Object.assign(editForm, {
    channelName: channel.channelName,
    channelType: channel.channelType,
    currencyUnit: channel.currencyUnit,
    budget: channel.budget,
    spentBudget: channel.spentBudget,
    dailyBudget: channel.dailyBudget,
    startDate: channel.startDate,
    endDate: channel.endDate,
    conversionRate: channel.conversionRate,
    cpc: channel.cpc,
    cpm: channel.cpm,
    impressions: channel.impressions,
    clicks: channel.clicks
  })
  validationErrors.value = []
  validationWarnings.value = []
  activeForm.value = editForm
  showEditModal.value = true
}

function saveEdit() {
  if (!editingChannel.value) return
  if (!validateForm(editForm)) return

  try {
    store.updateChannel(editingChannel.value.id, { ...editForm })
    showEditModal.value = false
    editingChannel.value = null
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
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="relative">
          <Filter class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            v-model="filterType"
            class="input-field pl-9 pr-8 appearance-none bg-white"
          >
            <option value="">全部渠道类型</option>
            <option v-for="opt in channelTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <span class="text-sm text-slate-500">
          共 {{ filteredChannels.length }} 个渠道
        </span>
      </div>
      <button class="btn-primary" @click="openAddModal">
        <Plus class="w-4 h-4 mr-2" />
        添加渠道
      </button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>渠道信息</th>
              <th>预算使用</th>
              <th>日预算</th>
              <th>日期范围</th>
              <th>转化表现</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="channel in filteredChannels" :key="channel.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <component :is="getChannelTypeIcon(channel.channelType)" class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="font-medium text-slate-900">{{ channel.channelName }}</div>
                    <div class="flex items-center gap-2">
                      <span class="badge-secondary">{{ getChannelTypeLabel(channel.channelType) }}</span>
                      <span v-if="isBudgetLow(channel)" class="badge-danger flex items-center gap-1">
                        <AlertTriangle class="w-3 h-3" />
                        预算不足
                      </span>
                      <span v-else-if="isBudgetWarning(channel)" class="badge-warning flex items-center gap-1">
                        <AlertTriangle class="w-3 h-3" />
                        预算紧张
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-600">
                      {{ formatCurrency(channel.spentBudget, channel.currencyUnit) }}
                    </span>
                    <span class="text-slate-500">
                      / {{ formatCurrency(channel.budget, channel.currencyUnit) }}
                    </span>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :class="{
                        'progress-fill-danger': isBudgetLow(channel),
                        'progress-fill-warning': isBudgetWarning(channel)
                      }"
                      :style="{ width: `${Math.min(getBudgetUsagePercent(channel), 100)}%` }"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500">
                      使用率 {{ getBudgetUsagePercent(channel).toFixed(1) }}%
                    </span>
                    <span class="text-slate-500">
                      剩余 {{ formatCurrency(channel.remainingBudget, channel.currencyUnit) }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="text-sm text-slate-600">
                {{ formatCurrency(channel.dailyBudget, channel.currencyUnit) }}
              </td>
              <td class="text-sm text-slate-600">
                {{ channel.startDate }} ~ {{ channel.endDate }}
              </td>
              <td>
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500">转化率</span>
                    <span class="font-medium text-slate-900">{{ (channel.conversionRate * 100).toFixed(2) }}%</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500">CPC</span>
                    <span class="font-medium text-slate-900">{{ formatCurrency(channel.cpc, channel.currencyUnit) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500">点击量</span>
                    <span class="font-medium text-slate-900">{{ channel.clicks.toLocaleString() }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <button
                    class="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    @click="openEditModal(channel)"
                  >
                    <Edit2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold text-slate-900">单位换算说明</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-slate-50 rounded-lg">
            <div class="font-medium text-slate-900 mb-2">货币单位</div>
            <p class="text-sm text-slate-600">
              支持 CNY、USD、EUR、JPY 四种货币，可在顶部切换全局显示货币。
              系统会自动根据汇率进行换算，导出报表时会保留原始货币单位。
            </p>
          </div>
          <div class="p-4 bg-slate-50 rounded-lg">
            <div class="font-medium text-slate-900 mb-2">边界值校验</div>
            <p class="text-sm text-slate-600">
              预算不能为负数，已花费不能超过总预算，转化率必须在0-1之间。
              预算使用率超过95%会标红预警，超过80%标黄提示。
            </p>
          </div>
          <div class="p-4 bg-slate-50 rounded-lg">
            <div class="font-medium text-slate-900 mb-2">数据冲突处理</div>
            <p class="text-sm text-slate-600">
              当渠道数据与转化数据口径不一致时，系统只会提示冲突，
              不会自动修改数据，需业务同事确认后再处理。
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="showAddModal = false; showEditModal = false">
      <div class="modal max-w-3xl">
        <div class="modal-header">
          <h3 class="text-lg font-semibold text-slate-900">
            {{ showAddModal ? '添加渠道' : '编辑渠道' }}
          </h3>
          <button
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            @click="showAddModal = false; showEditModal = false"
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
            <div class="md:col-span-2">
              <label class="label">渠道名称</label>
              <input
                v-model="activeForm.channelName"
                type="text"
                class="input-field"
                :class="{ 'input-error': getFieldError('channelName') }"
                placeholder="请输入渠道名称"
              />
              <p v-if="getFieldError('channelName')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('channelName') }}
              </p>
            </div>

            <div>
              <label class="label">渠道类型</label>
              <select
                v-model="activeForm.channelType"
                class="input-field"
              >
                <option v-for="opt in channelTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">货币单位</label>
              <select
                v-model="activeForm.currencyUnit"
                class="input-field"
              >
                <option v-for="opt in currencyOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">总预算</label>
              <input
                v-model.number="activeForm.budget"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                :class="{ 'input-error': getFieldError('budget') }"
                placeholder="请输入总预算"
              />
              <p v-if="getFieldError('budget')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('budget') }}
              </p>
              <p v-if="getFieldWarning('budget')" class="text-xs text-warning-600 mt-1">
                {{ getFieldWarning('budget') }}
              </p>
            </div>

            <div>
              <label class="label">已花费预算</label>
              <input
                v-model.number="activeForm.spentBudget"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                :class="{ 'input-error': getFieldError('spentBudget') }"
                placeholder="请输入已花费金额"
              />
              <p v-if="getFieldError('spentBudget')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('spentBudget') }}
              </p>
              <p v-if="getFieldWarning('remainingBudget')" class="text-xs text-warning-600 mt-1">
                {{ getFieldWarning('remainingBudget') }}
              </p>
            </div>

            <div>
              <label class="label">日预算</label>
              <input
                v-model.number="activeForm.dailyBudget"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                placeholder="请输入日预算"
              />
              <p v-if="getFieldWarning('dailyBudget')" class="text-xs text-warning-600 mt-1">
                {{ getFieldWarning('dailyBudget') }}
              </p>
            </div>

            <div>
              <label class="label">开始日期</label>
              <input
                v-model="activeForm.startDate"
                type="date"
                class="input-field"
              />
            </div>

            <div>
              <label class="label">结束日期</label>
              <input
                v-model="activeForm.endDate"
                type="date"
                class="input-field"
              />
              <p v-if="getFieldError('dateRange')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('dateRange') }}
              </p>
            </div>

            <div>
              <label class="label">转化率</label>
              <input
                v-model.number="activeForm.conversionRate"
                type="number"
                min="0"
                max="1"
                step="0.0001"
                class="input-field"
                :class="{ 'input-error': getFieldError('conversionRate') }"
                placeholder="0-1 之间，如 0.05 表示 5%"
              />
              <p v-if="getFieldError('conversionRate')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('conversionRate') }}
              </p>
            </div>

            <div>
              <label class="label">平均点击成本 (CPC)</label>
              <input
                v-model.number="activeForm.cpc"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                :class="{ 'input-error': getFieldError('cpc') }"
                placeholder="请输入 CPC"
              />
              <p v-if="getFieldError('cpc')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('cpc') }}
              </p>
            </div>

            <div>
              <label class="label">千次展示成本 (CPM)</label>
              <input
                v-model.number="activeForm.cpm"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                :class="{ 'input-error': getFieldError('cpm') }"
                placeholder="请输入 CPM"
              />
              <p v-if="getFieldError('cpm')" class="text-xs text-danger-600 mt-1">
                {{ getFieldError('cpm') }}
              </p>
            </div>

            <div>
              <label class="label">曝光量</label>
              <input
                v-model.number="activeForm.impressions"
                type="number"
                min="0"
                class="input-field"
                placeholder="请输入曝光量"
              />
            </div>

            <div>
              <label class="label">点击量</label>
              <input
                v-model.number="activeForm.clicks"
                type="number"
                min="0"
                class="input-field"
                placeholder="请输入点击量"
              />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAddModal = false; showEditModal = false">
            取消
          </button>
          <button class="btn-primary" @click="showAddModal ? addChannel() : saveEdit()">
            <Save class="w-4 h-4 mr-2" />
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
