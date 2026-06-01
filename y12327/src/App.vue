<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBudgetStore } from '@/stores/budget'
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  PieChart,
  FileBarChart,
  Bell,
  Settings,
  X,
  ChevronDown,
  DollarSign
} from 'lucide-vue-next'
import type { CurrencyUnit } from '@/types'

const store = useBudgetStore()
const route = useRoute()
const router = useRouter()

const sidebarCollapsed = ref(false)
const showCurrencyDropdown = ref(false)

const menuItems = [
  { path: '/dashboard', name: '数据总览', icon: LayoutDashboard },
  { path: '/channels', name: '渠道数据', icon: Building2 },
  { path: '/conversions', name: '转化数据', icon: TrendingUp },
  { path: '/allocation', name: '预算分配', icon: PieChart },
  { path: '/reports', name: '报告导出', icon: FileBarChart },
  { path: '/alerts', name: '异常提醒', icon: Bell }
]

const currencyOptions: { value: CurrencyUnit; label: string; symbol: string }[] = [
  { value: 'CNY', label: '人民币', symbol: '¥' },
  { value: 'USD', label: '美元', symbol: '$' },
  { value: 'EUR', label: '欧元', symbol: '€' },
  { value: 'JPY', label: '日元', symbol: '¥' }
]

const currentCurrency = computed(() =>
  currencyOptions.find(c => c.value === store.defaultCurrency)
)

const unreadAlertCount = computed(() => store.activeAlerts.length)

function navigate(path: string) {
  router.push(path)
}

function switchCurrency(unit: CurrencyUnit) {
  store.convertAllToCurrency(unit)
  showCurrencyDropdown.value = false
}

onMounted(() => {
  store.loadMockData()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <aside
      :class="[
        'bg-white border-r border-slate-200 flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-64'
      ]"
    >
      <div class="h-16 flex items-center px-4 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
            竞
          </div>
          <div v-if="!sidebarCollapsed" class="flex flex-col">
            <span class="font-semibold text-slate-900">竞价预算</span>
            <span class="text-xs text-slate-500">智能分配系统</span>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        <div
          v-for="item in menuItems"
          :key="item.path"
          :class="[
            route.path === item.path ? 'sidebar-item-active' : 'sidebar-item',
            'justify-center'
          ]"
          @click="navigate(item.path)"
        >
          <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
          <span v-if="!sidebarCollapsed" class="flex-1">{{ item.name }}</span>
          <span
            v-if="item.path === '/alerts' && unreadAlertCount > 0 && !sidebarCollapsed"
            class="badge-danger"
          >
            {{ unreadAlertCount }}
          </span>
        </div>
      </nav>

      <div class="p-3 border-t border-slate-200">
        <div
          class="sidebar-item justify-center"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <Settings class="w-5 h-5 flex-shrink-0" />
          <span v-if="!sidebarCollapsed" class="flex-1">收起侧边栏</span>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">
            {{ menuItems.find(m => m.path === route.path)?.name || '竞价广告预算分配' }}
          </h1>
        </div>

        <div class="flex items-center gap-4">
          <div class="relative">
            <button
              class="btn-secondary flex items-center gap-2"
              @click="showCurrencyDropdown = !showCurrencyDropdown"
            >
              <DollarSign class="w-4 h-4" />
              <span>{{ currentCurrency?.symbol }} {{ currentCurrency?.label }}</span>
              <ChevronDown class="w-4 h-4" />
            </button>

            <div
              v-if="showCurrencyDropdown"
              class="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
            >
              <button
                v-for="currency in currencyOptions"
                :key="currency.value"
                class="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                :class="{
                  'bg-primary-50 text-primary-700': currency.value === store.defaultCurrency
                }"
                @click="switchCurrency(currency.value)"
              >
                <span class="w-6 text-center font-medium">{{ currency.symbol }}</span>
                <span>{{ currency.label }}</span>
              </button>
            </div>
          </div>

          <button
            class="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            @click="navigate('/alerts')"
          >
            <Bell class="w-5 h-5" />
            <span
              v-if="unreadAlertCount > 0"
              class="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center"
            >
              {{ unreadAlertCount > 9 ? '9+' : unreadAlertCount }}
            </span>
          </button>

          <div class="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-medium text-sm">
              {{ store.currentUser.charAt(0) }}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-medium text-slate-900">{{ store.currentUser }}</span>
              <span class="text-xs text-slate-500">增长分析师</span>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <div
      v-if="showCurrencyDropdown"
      class="fixed inset-0 z-40"
      @click="showCurrencyDropdown = false"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
