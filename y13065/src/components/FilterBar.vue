<script setup lang="ts">
import { Search, X, Filter, MapPin, AlertTriangle } from 'lucide-vue-next'
import type { RiskLevel } from '@/types'

defineProps<{
  zones: string[]
  currentZone: string
  statusFilter: string[]
  riskLevelFilter: string[]
  keyword: string
}>()

const emit = defineEmits<{
  (e: 'toggle-status', status: string): void
  (e: 'toggle-risk', risk: RiskLevel): void
  (e: 'set-zone', zone: string): void
  (e: 'set-keyword', kw: string): void
  (e: 'clear'): void
}>()

const statusOptions = [
  { key: 'pending', label: '待复核', color: 'bg-gray-500' },
  { key: 'passed', label: '已通过', color: 'bg-accent-pass' },
  { key: 'need-fix', label: '需修改', color: 'bg-accent-danger' },
  { key: 'overlap', label: '重叠异常', color: 'bg-accent-warning' }
]

const riskOptions = [
  { key: '高', label: '高风险', color: 'bg-red-500' },
  { key: '中', label: '中风险', color: 'bg-amber-500' },
  { key: '低', label: '低风险', color: 'bg-green-500' }
]
</script>

<template>
  <div class="bg-white border-b border-gray-200 px-6 py-3">
    <div class="flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <Filter class="w-4 h-4 text-gray-500" />
        <span class="text-sm font-medium text-gray-700">筛选：</span>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          v-for="opt in statusOptions"
          :key="opt.key"
          class="chip"
          :class="{ 'chip-active': statusFilter.includes(opt.key) }"
          @click="emit('toggle-status', opt.key)"
        >
          <span :class="[opt.color, 'w-2 h-2 rounded-full']"></span>
          {{ opt.label }}
        </button>
      </div>

      <div class="h-5 w-px bg-gray-300 mx-1"></div>

      <div class="flex items-center gap-1.5">
        <MapPin class="w-3.5 h-3.5 text-gray-500" />
        <button
          class="chip"
          :class="{ 'chip-active': !currentZone }"
          @click="emit('set-zone', '')"
        >
          全部区域
        </button>
        <button
          v-for="z in zones"
          :key="z"
          class="chip"
          :class="{ 'chip-active': currentZone === z }"
          @click="emit('set-zone', z)"
        >
          {{ z }}
        </button>
      </div>

      <div class="h-5 w-px bg-gray-300 mx-1"></div>

      <div class="flex items-center gap-1.5">
        <AlertTriangle class="w-3.5 h-3.5 text-gray-500" />
        <button
          class="chip"
          :class="{ 'chip-active': riskLevelFilter.length === 0 }"
          @click="emit('toggle-risk', '高'); emit('toggle-risk', '中'); emit('toggle-risk', '低')"
          v-if="riskLevelFilter.length > 0"
        >
          全部风险
        </button>
        <button
          v-for="opt in riskOptions"
          :key="opt.key"
          class="chip"
          :class="{ 'chip-active': riskLevelFilter.includes(opt.key) }"
          @click="emit('toggle-risk', opt.key)"
        >
          <span :class="[opt.color, 'w-2 h-2 rounded-full']"></span>
          {{ opt.label }}
        </button>
      </div>

      <div class="h-5 w-px bg-gray-300 mx-1"></div>

      <div class="relative">
        <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          :value="keyword"
          @input="emit('set-keyword', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="搜索吊杆或批注内容..."
          class="pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-engineer w-64 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          v-if="keyword"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          @click="emit('set-keyword', '')"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex-1"></div>

      <button
        v-if="statusFilter.length || currentZone || keyword || riskLevelFilter.length"
        class="text-xs text-gray-500 hover:text-primary underline"
        @click="emit('clear')"
      >
        清空筛选
      </button>
    </div>
  </div>
</template>
