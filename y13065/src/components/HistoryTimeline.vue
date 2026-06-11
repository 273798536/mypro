<script setup lang="ts">
import { computed } from 'vue'
import { History, User, ChevronDown, ChevronRight } from 'lucide-vue-next'
import type { ModifyHistory } from '@/types'
import { formatTimestamp } from '@/utils/coordinate'
import { ref } from 'vue'

const props = defineProps<{
  history: ModifyHistory[]
  barId?: string | null
}>()

const expandedId = ref<string | null>(null)

const filteredHistory = computed(() => {
  if (props.barId) return props.history.filter(h => h.barId === props.barId)
  return props.history
})

const fieldLabel = (f: string) => {
  switch (f) {
    case 'status': return '复核状态'
    case 'coordinate': return '坐标值'
    case 'comment': return '批注内容'
    default: return f
  }
}
</script>

<template>
  <div class="card">
    <div class="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
      <History class="w-4 h-4 text-primary" />
      <h4 class="font-title text-sm text-primary">修改历史记录</h4>
      <span class="text-xs text-gray-500 ml-auto">林姐等操作人判断全记录</span>
    </div>

    <div class="p-4">
      <div v-if="filteredHistory.length === 0" class="text-sm text-gray-400 text-center py-6">
        暂无修改记录
      </div>

      <div v-else class="relative">
        <div class="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200"></div>

        <div class="space-y-3">
          <div
            v-for="item in filteredHistory"
            :key="item.id"
            class="relative pl-9"
          >
            <div
              class="absolute left-2 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-primary flex items-center justify-center"
            >
              <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
            </div>

            <div
              class="bg-gray-50 rounded-engineer border border-gray-200 cursor-pointer hover:border-primary/50 transition-colors"
              @click="expandedId = expandedId === item.id ? null : item.id"
            >
              <div class="px-3 py-2 flex items-center gap-2">
                <User class="w-3.5 h-3.5 text-gray-500" />
                <span class="text-sm font-medium text-gray-800">{{ item.operator }}</span>
                <span class="text-xs text-gray-500">修改了「{{ fieldLabel(item.field) }}」</span>
                <span class="text-[10px] text-gray-400 ml-auto font-mono-num">{{ formatTimestamp(item.modifiedAt) }}</span>
                <component :is="expandedId === item.id ? ChevronDown : ChevronRight" class="w-3.5 h-3.5 text-gray-400" />
              </div>

              <div v-if="expandedId === item.id" class="px-3 pb-3 animate-fade-in">
                <div class="flex gap-3 mt-2">
                  <div class="flex-1 bg-red-50 border border-red-200 rounded-engineer p-2">
                    <div class="text-[10px] text-red-600 font-medium mb-0.5">修改前</div>
                    <div class="text-sm text-red-800">{{ item.beforeValue }}</div>
                  </div>
                  <div class="flex items-center text-gray-400 text-xs">→</div>
                  <div class="flex-1 bg-green-50 border border-green-200 rounded-engineer p-2">
                    <div class="text-[10px] text-green-600 font-medium mb-0.5">修改后</div>
                    <div class="text-sm text-green-800">{{ item.afterValue }}</div>
                  </div>
                </div>
                <div class="mt-2 text-xs text-gray-600 bg-white rounded-engineer px-2.5 py-1.5 border border-gray-200">
                  <span class="text-gray-500">修改原因：</span>{{ item.reason }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
