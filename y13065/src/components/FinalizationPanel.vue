<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, AlertTriangle, HelpCircle, ClipboardList, Info } from 'lucide-vue-next'
import type { FinalizationItem } from '@/types'

const props = defineProps<{
  items: FinalizationItem[]
  summary: { pass: number; '补材料': number; '待定': number }
}>()

const emit = defineEmits<{
  (e: 'select-bar', id: string): void
}>()

const passItems = computed(() => props.items.filter(i => i.action === 'pass'))
const fixItems = computed(() => props.items.filter(i => i.action === '补材料'))
const pendingItems = computed(() => props.items.filter(i => i.action === '待定'))
</script>

<template>
  <div class="card">
    <div class="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
      <ClipboardList class="w-4 h-4 text-primary" />
      <h4 class="font-title text-sm text-primary">复核收尾指示</h4>
      <span class="text-xs text-gray-500 ml-auto">林姐使用：哪条补材料、哪条放行</span>
    </div>

    <div class="p-4 space-y-4">
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-accent-pass"></span>
          <span class="text-gray-700">可放行 <span class="font-mono-num font-medium text-accent-pass">{{ summary.pass }}</span></span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-accent-warning"></span>
          <span class="text-gray-700">需补材料 <span class="font-mono-num font-medium text-accent-warning">{{ summary['补材料'] }}</span></span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-gray-400"></span>
          <span class="text-gray-700">待定 <span class="font-mono-num font-medium text-gray-600">{{ summary['待定'] }}</span></span>
        </div>
      </div>

      <div v-if="fixItems.length > 0" class="border-l-4 border-accent-warning bg-amber-50/50 rounded-engineer overflow-hidden">
        <div class="px-3 py-2 border-b border-amber-200 flex items-center gap-1.5 bg-amber-100/50">
          <AlertTriangle class="w-3.5 h-3.5 text-accent-warning" />
          <span class="text-sm font-medium text-amber-800">需补材料 · {{ fixItems.length }} 项</span>
        </div>
        <div class="p-2 space-y-1.5">
          <div
            v-for="item in fixItems"
            :key="item.barId"
            class="bg-white rounded-engineer px-3 py-2 text-sm hover:bg-amber-50 cursor-pointer transition-colors border border-amber-100"
            @click="emit('select-bar', item.barId)"
          >
            <div class="flex items-center gap-2">
              <span class="font-medium text-amber-900">{{ item.barName }}</span>
            </div>
            <div class="text-xs text-gray-600 mt-0.5 leading-relaxed">{{ item.reason }}</div>
          </div>
        </div>
      </div>

      <div v-if="passItems.length > 0" class="border-l-4 border-accent-pass bg-green-50/50 rounded-engineer overflow-hidden">
        <div class="px-3 py-2 border-b border-green-200 flex items-center gap-1.5 bg-green-100/50">
          <CheckCircle class="w-3.5 h-3.5 text-accent-pass" />
          <span class="text-sm font-medium text-green-800">可放行 · {{ passItems.length }} 项</span>
        </div>
        <div class="p-2 space-y-1.5">
          <div
            v-for="item in passItems"
            :key="item.barId"
            class="bg-white rounded-engineer px-3 py-2 text-sm hover:bg-green-50 cursor-pointer transition-colors border border-green-100"
            @click="emit('select-bar', item.barId)"
          >
            <div class="flex items-center gap-2">
              <span class="font-medium text-green-900">{{ item.barName }}</span>
            </div>
            <div class="text-xs text-gray-600 mt-0.5 leading-relaxed">{{ item.reason }}</div>
          </div>
        </div>
      </div>

      <div v-if="pendingItems.length > 0" class="border-l-4 border-gray-400 bg-gray-50 rounded-engineer overflow-hidden">
        <div class="px-3 py-2 border-b border-gray-200 flex items-center gap-1.5 bg-gray-100/70">
          <HelpCircle class="w-3.5 h-3.5 text-gray-500" />
          <span class="text-sm font-medium text-gray-700">待定 · {{ pendingItems.length }} 项</span>
        </div>
        <div class="p-2 space-y-1.5">
          <div
            v-for="item in pendingItems"
            :key="item.barId"
            class="bg-white rounded-engineer px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
            @click="emit('select-bar', item.barId)"
          >
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-800">{{ item.barName }}</span>
            </div>
            <div class="text-xs text-gray-600 mt-0.5 leading-relaxed">{{ item.reason }}</div>
          </div>
        </div>
      </div>

      <div class="text-[11px] text-gray-400 flex items-start gap-1.5 bg-gray-50 rounded-engineer px-2.5 py-2">
        <Info class="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>以上为复核意见汇总，仅供教学参考。正式放行需结合纸质签认记录。</span>
      </div>
    </div>
  </div>
</template>
