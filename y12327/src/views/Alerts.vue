<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import type { AlertMessage, AlertType } from '@/types'
import {
  Bell,
  AlertTriangle,
  Clock,
  Copy,
  AlertCircle,
  Edit2,
  Check,
  CheckCheck,
  Filter,
  X
} from 'lucide-vue-next'
import dayjs from 'dayjs'

const store = useBudgetStore()

const filterType = ref<AlertType | ''>('')
const filterLevel = ref<'WARNING' | 'ERROR' | 'INFO' | ''>('')
const showUnreadOnly = ref(true)

const typeOptions: { value: AlertType | ''; label: string; icon: any }[] = [
  { value: '', label: '全部类型', icon: Bell },
  { value: 'BUDGET_EXHAUSTED', label: '预算耗尽', icon: AlertTriangle },
  { value: 'CONVERSION_DELAYED', label: '转化延迟', icon: Clock },
  { value: 'DUPLICATE_MATERIAL', label: '素材重复', icon: Copy },
  { value: 'DATA_CONFLICT', label: '数据冲突', icon: AlertCircle },
  { value: 'MANUAL_MODIFICATION', label: '人工修改', icon: Edit2 }
]

const levelOptions = [
  { value: '', label: '全部级别' },
  { value: 'ERROR', label: '错误' },
  { value: 'WARNING', label: '警告' },
  { value: 'INFO', label: '提示' }
]

const filteredAlerts = computed(() => {
  let result = store.alerts

  if (showUnreadOnly.value) {
    result = result.filter(a => !a.isRead)
  }

  if (filterType.value) {
    result = result.filter(a => a.type === filterType.value)
  }

  if (filterLevel.value) {
    result = result.filter(a => a.level === filterLevel.value)
  }

  return result
})

function getAlertIcon(type: AlertType) {
  return typeOptions.find(o => o.value === type)?.icon || Bell
}

function getAlertTypeLabel(type: AlertType): string {
  return typeOptions.find(o => o.value === type)?.label || type
}

function getLevelLabel(level: string): string {
  return levelOptions.find(o => o.value === level)?.label || level
}

function getLevelClass(level: string): string {
  switch (level) {
    case 'ERROR': return 'bg-danger-100 text-danger-600 border-danger-200'
    case 'WARNING': return 'bg-warning-100 text-warning-600 border-warning-200'
    case 'INFO': return 'bg-primary-100 text-primary-600 border-primary-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function getLevelBadgeClass(level: string): string {
  switch (level) {
    case 'ERROR': return 'badge-danger'
    case 'WARNING': return 'badge-warning'
    case 'INFO': return 'badge-info'
    default: return 'badge-secondary'
  }
}

function getObjectTypeLabel(type: string): string {
  switch (type) {
    case 'CHANNEL': return '渠道'
    case 'MATERIAL': return '素材'
    case 'CONVERSION': return '转化记录'
    case 'ALLOCATION': return '分配明细'
    default: return type
  }
}

function markAsRead(alertId: string) {
  store.markAlertRead(alertId)
}

function markAllAsRead() {
  store.markAllAlertsRead()
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">未读提醒</div>
            <div class="stat-value text-primary-600">
              {{ store.activeAlerts.length }}
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
            <Bell class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">预算耗尽</div>
            <div class="stat-value text-danger-600">
              {{ store.alerts.filter(a => a.type === 'BUDGET_EXHAUSTED' && !a.isRead).length }}
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-danger-100 flex items-center justify-center text-danger-600">
            <AlertTriangle class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">转化延迟</div>
            <div class="stat-value text-warning-600">
              {{ store.alerts.filter(a => a.type === 'CONVERSION_DELAYED' && !a.isRead).length }}
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
            <div class="stat-label">数据冲突</div>
            <div class="stat-value text-slate-600">
              {{ store.unresolvedConflicts.length }}
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
            v-model="filterType"
            class="input-field pl-9 pr-8 appearance-none bg-white min-w-[140px]"
          >
            <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <select
          v-model="filterLevel"
          class="input-field min-w-[120px]"
        >
          <option v-for="opt in levelOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="showUnreadOnly"
            class="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
          />
          <span class="text-sm text-slate-600">仅显示未读</span>
        </label>

        <span class="text-sm text-slate-500">
          共 {{ filteredAlerts.length }} 条记录
        </span>
      </div>

      <button
        class="btn-secondary"
        :disabled="store.activeAlerts.length === 0"
        @click="markAllAsRead"
      >
        <CheckCheck class="w-4 h-4 mr-2" />
        全部标记已读
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="filteredAlerts.length === 0" class="text-center py-12">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Bell class="w-8 h-8" />
          </div>
          <h3 class="text-lg font-medium text-slate-900 mb-2">暂无提醒</h3>
          <p class="text-slate-500">所有异常都已处理完毕</p>
        </div>

        <div v-else class="divide-y divide-slate-200">
          <div
            v-for="alert in filteredAlerts"
            :key="alert.id"
            :class="[
              'p-6 transition-colors',
              alert.isRead ? 'bg-white' : 'bg-primary-50/30'
            ]"
          >
            <div class="flex items-start gap-4">
              <div
                :class="[
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border',
                  getLevelClass(alert.level)
                ]"
              >
                <component :is="getAlertIcon(alert.type)" class="w-6 h-6" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-semibold text-slate-900">{{ alert.title }}</h4>
                      <span :class="['badge', getLevelBadgeClass(alert.level)]">
                        {{ getLevelLabel(alert.level) }}
                      </span>
                      <span class="badge-secondary">
                        {{ getAlertTypeLabel(alert.type) }}
                      </span>
                      <span
                        v-if="!alert.isRead"
                        class="w-2 h-2 rounded-full bg-primary-500"
                      ></span>
                    </div>

                    <p class="text-slate-700 mb-3">{{ alert.message }}</p>

                    <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span class="flex items-center gap-1">
                        <span class="font-medium">相关对象：</span>
                        {{ getObjectTypeLabel(alert.relatedObjectType) }} - {{ alert.relatedObjectName }}
                      </span>
                      <span class="flex items-center gap-1">
                        <Clock class="w-4 h-4" />
                        {{ dayjs(alert.timestamp).format('YYYY-MM-DD HH:mm:ss') }}
                      </span>
                    </div>

                    <div
                      v-if="alert.data && Object.keys(alert.data).length > 0"
                      class="mt-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div class="text-xs font-medium text-slate-500 mb-2">详细数据</div>
                      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div v-for="(value, key) in alert.data" :key="key" class="flex items-center gap-2">
                          <span class="text-slate-500">{{ key }}:</span>
                          <span class="font-medium text-slate-700">
                            {{ typeof value === 'number' ? value.toLocaleString() : value }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    v-if="!alert.isRead"
                    class="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
                    data-tip="标记已读"
                    @click="markAsRead(alert.id)"
                  >
                    <Check class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold text-slate-900">异常处理规则</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div class="p-4 bg-danger-50 rounded-lg border border-danger-200">
              <div class="flex items-start gap-3">
                <AlertTriangle class="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div class="font-medium text-danger-800">预算耗尽</div>
                  <p class="text-sm text-danger-700 mt-1">
                    当渠道剩余预算不足总预算的5%时触发。系统会提示具体渠道名称、剩余金额和占比，
                    请及时补充预算或调整分配。
                  </p>
                </div>
              </div>
            </div>

            <div class="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <div class="flex items-start gap-3">
                <Clock class="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div class="font-medium text-warning-800">转化延迟</div>
                  <p class="text-sm text-warning-700 mt-1">
                    当转化发生日期与归因日期间隔超过7天时触发。
                    系统会提示具体的渠道、素材和延迟天数，请关注数据准确性。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <div class="flex items-start gap-3">
                <Copy class="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div class="font-medium text-primary-800">素材重复</div>
                  <p class="text-sm text-primary-700 mt-1">
                    当检测到相同内容的素材在多个渠道使用时触发。
                    系统会提示重复的素材名称和已使用的渠道，请确认是否为同一素材。
                  </p>
                </div>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div class="flex items-start gap-3">
                <AlertCircle class="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div class="font-medium text-slate-800">数据冲突</div>
                  <p class="text-sm text-slate-700 mt-1">
                    当渠道数据与转化数据口径不一致时触发。
                    <strong class="text-danger-600">系统不会自动修改数据</strong>，
                    会列出两个数据源的具体数值，请业务同事确认口径后再处理。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div class="flex items-start gap-3">
            <Edit2 class="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <div class="font-medium text-slate-800">人工修改记录</div>
              <p class="text-sm text-slate-700 mt-1">
                所有手动修改边际收益的操作都会记录在此，包括修改前后的值、修改原因和修改人。
                这些记录会在导出报表和预算回放中体现，确保所有调整都可追溯。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
