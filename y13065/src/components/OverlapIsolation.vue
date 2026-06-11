<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, ArrowRight, Ruler } from 'lucide-vue-next'
import type { OverlapPair, Bar } from '@/types'
import { formatCoordinate, formatTimestamp } from '@/utils/coordinate'

const props = defineProps<{
  pairs: OverlapPair[]
  bars: Bar[]
}>()

const emit = defineEmits<{
  (e: 'select-bar', id: string): void
}>()

const getBar = (id: string) => computed(() => props.bars.find(b => b.id === id))

const riskColor = (lv: string) => {
  switch (lv) {
    case '高': return 'border-red-400 bg-red-50 text-red-700'
    case '中': return 'border-amber-400 bg-amber-50 text-amber-700'
    default: return 'border-yellow-300 bg-yellow-50 text-yellow-700'
  }
}

const riskBadgeColor = (lv: string) => {
  switch (lv) {
    case '高': return 'bg-red-500'
    case '中': return 'bg-amber-500'
    default: return 'bg-yellow-500'
  }
}
</script>

<template>
  <div class="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200">
    <div class="px-6 py-2.5 flex items-center gap-3 border-b border-amber-200/60">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-accent-warning" />
        <span class="font-title text-sm text-amber-800">异常隔离区 · 对象重叠记录</span>
      </div>
      <span class="text-xs text-amber-600 bg-white/60 px-2 py-0.5 rounded-engineer border border-amber-200">
        共 {{ pairs.length }} 组 · 已从正常结果中单独拎出
      </span>
      <span class="ml-auto text-xs text-amber-600">项目经理重点关注区域</span>
    </div>

    <div class="px-6 py-3 flex gap-3 overflow-x-auto scrollbar-thin">
      <div
        v-for="pair in pairs"
        :key="pair.id"
        class="card border-l-4 px-4 py-3 flex-shrink-0 w-96"
        :class="riskColor(pair.riskLevel)"
      >
        <div class="flex items-center gap-2 mb-2.5">
          <span class="badge" :class="riskBadgeColor(pair.riskLevel) + ' text-white'">
            风险 {{ pair.riskLevel }}
          </span>
          <span class="text-xs text-gray-500">检测于 {{ formatTimestamp(pair.detectedAt) }}</span>
        </div>

        <div class="flex items-center gap-2 text-sm">
          <div
            class="flex-1 bg-white/80 rounded-engineer p-2.5 border border-gray-200 cursor-pointer hover:border-primary transition-colors"
            @click="emit('select-bar', pair.barIdA)"
          >
            <div class="text-xs text-gray-500 mb-0.5">吊杆 A</div>
            <div class="font-medium text-gray-800">{{ getBar(pair.barIdA).value?.name }}</div>
            <div class="text-[10px] font-mono-num text-gray-500 mt-1">
              X:{{ formatCoordinate(getBar(pair.barIdA).value?.x ?? 0) }}
              Y:{{ formatCoordinate(getBar(pair.barIdA).value?.y ?? 0) }}
              Z:{{ formatCoordinate(getBar(pair.barIdA).value?.z ?? 0) }}
            </div>
          </div>

          <div class="flex flex-col items-center gap-1 px-1">
            <ArrowRight class="w-4 h-4 text-gray-400" />
            <div class="text-[10px] text-accent-warning font-mono-num whitespace-nowrap">
              <Ruler class="w-3 h-3 inline -mt-0.5" />
              {{ pair.overlapDistance }}mm
            </div>
          </div>

          <div
            class="flex-1 bg-white/80 rounded-engineer p-2.5 border border-gray-200 cursor-pointer hover:border-primary transition-colors"
            @click="emit('select-bar', pair.barIdB)"
          >
            <div class="text-xs text-gray-500 mb-0.5">吊杆 B</div>
            <div class="font-medium text-gray-800">{{ getBar(pair.barIdB).value?.name }}</div>
            <div class="text-[10px] font-mono-num text-gray-500 mt-1">
              X:{{ formatCoordinate(getBar(pair.barIdB).value?.x ?? 0) }}
              Y:{{ formatCoordinate(getBar(pair.barIdB).value?.y ?? 0) }}
              Z:{{ formatCoordinate(getBar(pair.barIdB).value?.z ?? 0) }}
            </div>
          </div>
        </div>

        <div class="mt-2.5 text-[11px] text-gray-600 bg-white/50 rounded-engineer px-2 py-1.5">
          两吊杆空间净距仅 <span class="font-mono-num font-medium text-accent-warning">{{ pair.overlapDistance }}mm</span>，
          {{ pair.riskLevel === '高' ? '存在严重碰撞风险，需立即调整' : pair.riskLevel === '中' ? '存在碰撞风险，建议复核后调整' : '接近安全临界值，建议关注' }}
        </div>
      </div>

      <div v-if="pairs.length === 0" class="text-sm text-gray-400 py-4">
        暂无重叠异常记录
      </div>
    </div>
  </div>
</template>
