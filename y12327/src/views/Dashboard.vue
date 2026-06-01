<script setup lang="ts">
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { formatCurrency } from '@/utils/currency'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Copy,
  AlertCircle,
  ChevronRight,
  PieChart as PieChartIcon
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const store = useBudgetStore()
const router = useRouter()

const totalBudget = computed(() =>
  store.channels.reduce((sum, c) => sum + c.budget, 0)
)

const totalSpent = computed(() =>
  store.channels.reduce((sum, c) => sum + c.spentBudget, 0)
)

const totalRemaining = computed(() =>
  store.channels.reduce((sum, c) => sum + c.remainingBudget, 0)
)

const totalConversions = computed(() =>
  store.conversions
    .filter(c => c.status !== 'REJECTED')
    .reduce((sum, c) => sum + c.conversionCount, 0)
)

const totalConversionValue = computed(() =>
  store.conversions
    .filter(c => c.status !== 'REJECTED')
    .reduce((sum, c) => sum + c.conversionValue, 0)
)

const budgetUsagePercent = computed(() => {
  if (totalBudget.value === 0) return 0
  return (totalSpent.value / totalBudget.value) * 100
})

const topChannels = computed(() =>
  [...store.channels]
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 5)
)

const recentAlerts = computed(() =>
  store.activeAlerts.slice(0, 5)
)

function getChannelTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SEARCH: '搜索',
    DISPLAY: '展示',
    SOCIAL: '社交',
    VIDEO: '视频',
    APP: '应用'
  }
  return labels[type] || type
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'BUDGET_EXHAUSTED':
      return AlertTriangle
    case 'CONVERSION_DELAYED':
      return Clock
    case 'DUPLICATE_MATERIAL':
      return Copy
    case 'DATA_CONFLICT':
      return AlertCircle
    default:
      return AlertCircle
  }
}

function getAlertLevelClass(level: string) {
  switch (level) {
    case 'ERROR':
      return 'bg-danger-100 text-danger-600'
    case 'WARNING':
      return 'bg-warning-100 text-warning-600'
    default:
      return 'bg-primary-100 text-primary-600'
  }
}

function navigateToBudgetAllocation() {
  router.push('/allocation')
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">总预算</div>
            <div class="stat-value">
              {{ formatCurrency(totalBudget, store.defaultCurrency) }}
            </div>
            <div class="stat-change text-slate-500">
              {{ store.channels.length }} 个渠道
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
            <PieChartIcon class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">已花费</div>
            <div class="stat-value">
              {{ formatCurrency(totalSpent, store.defaultCurrency) }}
            </div>
            <div class="stat-change text-slate-500">
              使用率 {{ budgetUsagePercent.toFixed(1) }}%
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center text-success-600">
            <TrendingUp class="w-6 h-6" />
          </div>
        </div>
        <div class="mt-4">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :class="{
                'progress-fill-danger': budgetUsagePercent > 90,
                'progress-fill-warning': budgetUsagePercent > 70 && budgetUsagePercent <= 90
              }"
              :style="{ width: `${Math.min(budgetUsagePercent, 100)}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">剩余预算</div>
            <div class="stat-value">
              {{ formatCurrency(totalRemaining, store.defaultCurrency) }}
            </div>
            <div class="stat-change text-slate-500">
              可用率 {{ (100 - budgetUsagePercent).toFixed(1) }}%
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center text-warning-600">
            <TrendingDown class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-start justify-between">
          <div>
            <div class="stat-label">累计转化</div>
            <div class="stat-value">
              {{ totalConversions.toLocaleString() }}
            </div>
            <div class="stat-change text-slate-500">
              转化价值 {{ formatCurrency(totalConversionValue, store.defaultCurrency) }}
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center text-success-600">
            <TrendingUp class="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h3 class="font-semibold text-slate-900">异常概览</h3>
          <button
            class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            @click="router.push('/alerts')"
          >
            查看全部 <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-danger-50 border border-danger-200">
              <div class="flex items-center gap-2 text-danger-700 mb-2">
                <AlertTriangle class="w-4 h-4" />
                <span class="text-sm font-medium">预算耗尽</span>
              </div>
              <div class="text-2xl font-bold text-danger-700">
                {{ store.exhaustedChannels.length }}
              </div>
            </div>
            <div class="p-4 rounded-lg bg-warning-50 border border-warning-200">
              <div class="flex items-center gap-2 text-warning-700 mb-2">
                <Clock class="w-4 h-4" />
                <span class="text-sm font-medium">转化延迟</span>
              </div>
              <div class="text-2xl font-bold text-warning-700">
                {{ store.delayedConversions.length }}
              </div>
            </div>
            <div class="p-4 rounded-lg bg-primary-50 border border-primary-200">
              <div class="flex items-center gap-2 text-primary-700 mb-2">
                <Copy class="w-4 h-4" />
                <span class="text-sm font-medium">素材重复</span>
              </div>
              <div class="text-2xl font-bold text-primary-700">
                {{ store.duplicateMaterials.length }}
              </div>
            </div>
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div class="flex items-center gap-2 text-slate-700 mb-2">
                <AlertCircle class="w-4 h-4" />
                <span class="text-sm font-medium">数据冲突</span>
              </div>
              <div class="text-2xl font-bold text-slate-700">
                {{ store.unresolvedConflicts.length }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card md:col-span-2">
        <div class="card-header flex items-center justify-between">
          <h3 class="font-semibold text-slate-900">最近异常提醒</h3>
          <button
            class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            @click="router.push('/alerts')"
          >
            查看全部 <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        <div class="card-body">
          <div v-if="recentAlerts.length === 0" class="text-center py-8 text-slate-500">
            暂无异常提醒
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="alert in recentAlerts"
              :key="alert.id"
              class="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-slate-200"
              @click="router.push('/alerts')"
            >
              <div :class="['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', getAlertLevelClass(alert.level)]">
                <component :is="getAlertIcon(alert.type)" class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-slate-900 text-sm">{{ alert.title }}</span>
                  <span :class="['badge', alert.level === 'ERROR' ? 'badge-danger' : alert.level === 'WARNING' ? 'badge-warning' : 'badge-info']">
                    {{ alert.level === 'ERROR' ? '错误' : alert.level === 'WARNING' ? '警告' : '提示' }}
                  </span>
                </div>
                <p class="text-sm text-slate-600 mt-1 line-clamp-2">{{ alert.message }}</p>
                <p class="text-xs text-slate-400 mt-1">
                  相关对象: {{ alert.relatedObjectName }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h3 class="font-semibold text-slate-900">渠道预算概览</h3>
          <button
            class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            @click="router.push('/channels')"
          >
            管理渠道 <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        <div class="card-body">
          <div class="space-y-4">
            <div v-for="channel in topChannels" :key="channel.id" class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-slate-900">{{ channel.channelName }}</span>
                  <span class="badge-secondary">{{ getChannelTypeLabel(channel.channelType) }}</span>
                </div>
                <div class="text-slate-600">
                  {{ formatCurrency(channel.spentBudget, channel.currencyUnit) }} / {{ formatCurrency(channel.budget, channel.currencyUnit) }}
                </div>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :class="{
                    'progress-fill-danger': (channel.spentBudget / channel.budget) > 0.95,
                    'progress-fill-warning': (channel.spentBudget / channel.budget) > 0.8 && (channel.spentBudget / channel.budget) <= 0.95
                  }"
                  :style="{ width: `${Math.min((channel.spentBudget / channel.budget) * 100, 100)}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-xs text-slate-500">
                <span>转化率: {{ (channel.conversionRate * 100).toFixed(2) }}%</span>
                <span>CPC: {{ formatCurrency(channel.cpc, channel.currencyUnit) }}</span>
                <span>剩余: {{ formatCurrency(channel.remainingBudget, channel.currencyUnit) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h3 class="font-semibold text-slate-900">快捷操作</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-4">
            <button
              class="p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center gap-3 group"
              @click="navigateToBudgetAllocation"
            >
              <div class="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <PieChartIcon class="w-6 h-6" />
              </div>
              <div class="text-center">
                <div class="font-medium text-slate-900">生成预算分配</div>
                <div class="text-sm text-slate-500 mt-1">基于渠道表现智能分配</div>
              </div>
            </button>

            <button
              class="p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-success-500 hover:bg-success-50 transition-all flex flex-col items-center gap-3 group"
              @click="router.push('/reports')"
            >
              <div class="w-12 h-12 rounded-xl bg-success-100 text-success-600 flex items-center justify-center group-hover:bg-success-200 transition-colors">
                <TrendingUp class="w-6 h-6" />
              </div>
              <div class="text-center">
                <div class="font-medium text-slate-900">导出分析报告</div>
                <div class="text-sm text-slate-500 mt-1">含修改痕迹与补录标记</div>
              </div>
            </button>
          </div>

          <div class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="flex items-start gap-3">
              <AlertCircle class="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <div class="font-medium text-slate-900">系统提示</div>
                <p class="text-sm text-slate-600 mt-1">
                  当渠道数据、转化率、分配报告出现口径冲突时，系统不会自动修改数据，
                  会在异常提醒中列出具体差异，请业务同事确认后再处理。
                  所有人工修改边际收益的操作都会被记录，并在回放和导出报表中体现。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
