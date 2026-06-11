<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Bar, FilterCriteria } from '@/types'
import { formatCoordinate } from '@/utils/coordinate'

const canvasWrapperRef = ref<HTMLElement | null>(null)

defineExpose({
  canvasWrapperRef,
  CANVAS_W: 720,
  CANVAS_H: 520,
  PAD: 50
})

const props = defineProps<{
  bars: Bar[]
  allBars: Bar[]
  selectedBarId: string | null
  hoverBarId: string | null
  overlapBarIds: Set<string>
  filter: FilterCriteria
}>()

const emit = defineEmits<{
  (e: 'select-bar', id: string): void
  (e: 'hover-bar', id: string | null): void
}>()

const CANVAS_W = 720
const CANVAS_H = 520
const PAD = 50

const xMax = computed(() => Math.max(...props.allBars.map(b => b.x)) + 500)
const yMax = computed(() => Math.max(...props.allBars.map(b => b.y)) + 500)

const toCanvasX = (x: number) => PAD + (x / xMax.value) * (CANVAS_W - PAD * 2)
const toCanvasY = (y: number) => CANVAS_H - PAD - (y / yMax.value) * (CANVAS_H - PAD * 2)

const barHeight = (z: number) => Math.max(20, Math.min(120, (z / 10000) * 120))

const filterText = computed(() => {
  const parts: string[] = []
  if (props.filter.status?.length) parts.push(`状态:${props.filter.status.join('/')}`)
  if (props.filter.zone) parts.push(`区域:${props.filter.zone}`)
  if (props.filter.riskLevel?.length) parts.push(`风险:${props.filter.riskLevel.join('/')}`)
  if (props.filter.keyword) parts.push(`关键词:${props.filter.keyword}`)
  return parts.length ? parts.join(' | ') : '无筛选'
})

const statusColor = (bar: Bar) => {
  if (props.overlapBarIds.has(bar.id)) return '#DC2626'
  switch (bar.status) {
    case 'passed': return '#059669'
    case 'need-fix': return '#DC2626'
    case 'overlap': return '#D97706'
    default: return '#6B7280'
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-100 relative">
    <div class="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-4 text-xs">
      <div>
        <span class="text-gray-500">坐标系：</span>
        <span class="font-mono-num text-primary font-medium">stage-local（舞台本地坐标系）</span>
      </div>
      <div class="h-4 w-px bg-gray-300"></div>
      <div>
        <span class="text-gray-500">当前筛选：</span>
        <span class="font-mono-num text-gray-700">{{ filterText }}</span>
      </div>
      <div class="h-4 w-px bg-gray-300"></div>
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-gray-500"></span>待复核</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-accent-pass"></span>已通过</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-accent-danger"></span>需修改</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-accent-warning animate-overlap"></span>重叠异常</span>
      </div>
    </div>

    <div class="flex-1 p-4 overflow-auto">
      <div ref="canvasWrapperRef" class="relative bg-canvas-bg rounded-engineer border border-canvas-grid shadow-inner" :style="{ width: CANVAS_W + 'px', height: CANVAS_H + 'px' }">
        <svg :width="CANVAS_W" :height="CANVAS_H" class="absolute inset-0">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#B8D4E8" stroke-width="0.5" />
            </pattern>
          </defs>
          <rect :width="CANVAS_W" :height="CANVAS_H" fill="url(#grid)" />

          <line x1="PAD" :y1="CANVAS_H - PAD" :x2="CANVAS_W - PAD" :y2="CANVAS_H - PAD" stroke="#0F3B4A" stroke-width="2" />
          <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="CANVAS_H - PAD" stroke="#0F3B4A" stroke-width="2" />
          <text :x="CANVAS_W - PAD" :y="CANVAS_H - PAD + 18" class="fill-primary text-xs font-mono-num" text-anchor="end">X (mm)</text>
          <text :x="PAD - 5" :y="PAD - 8" class="fill-primary text-xs font-mono-num" text-anchor="end">Y (mm)</text>

          <text :x="CANVAS_W - PAD" :y="CANVAS_H - PAD + 35" class="fill-gray-500 text-[10px] font-mono-num" text-anchor="end">{{ formatCoordinate(xMax) }}</text>
          <text :x="PAD" :y="CANVAS_H - PAD + 35" class="fill-gray-500 text-[10px] font-mono-num" text-anchor="start">0</text>
          <text :x="PAD - 8" :y="PAD + 5" class="fill-gray-500 text-[10px] font-mono-num" text-anchor="end">{{ formatCoordinate(yMax) }}</text>
          <text :x="PAD - 8" :y="CANVAS_H - PAD" class="fill-gray-500 text-[10px] font-mono-num" text-anchor="end">0</text>
        </svg>

        <div class="absolute top-3 left-3 bg-white/85 backdrop-blur px-2 py-1 rounded-engineer text-[10px] text-gray-500 font-mono-num border border-gray-200">
          筛选水印: {{ filterText }}
        </div>

        <div
          v-for="bar in bars"
          :key="bar.id"
          class="absolute cursor-pointer transition-all duration-150 group"
          :style="{
            left: toCanvasX(bar.x) + 'px',
            top: (toCanvasY(bar.y) - barHeight(bar.z)) + 'px',
            transform: 'translateX(-50%)'
          }"
          :class="{
            'z-20': selectedBarId === bar.id || hoverBarId === bar.id,
            'z-10': true
          }"
          @click="emit('select-bar', bar.id)"
          @mouseenter="emit('hover-bar', bar.id)"
          @mouseleave="emit('hover-bar', null)"
        >
          <div
            class="relative rounded-t-sm transition-all"
            :style="{
              width: bar.length > 8000 ? '48px' : bar.length > 5000 ? '36px' : '24px',
              height: barHeight(bar.z) + 'px',
              backgroundColor: statusColor(bar),
              opacity: overlapBarIds.has(bar.id) ? 0.85 : 0.95
            }"
            :class="{
              'ring-2 ring-primary ring-offset-1 ring-offset-canvas-bg scale-105': selectedBarId === bar.id,
              'scale-110': hoverBarId === bar.id && selectedBarId !== bar.id,
              'animate-overlap': overlapBarIds.has(bar.id)
            }"
          >
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white" :style="{ backgroundColor: statusColor(bar) }"></div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono-num font-medium px-1 py-0.5 rounded bg-white text-gray-700 whitespace-nowrap shadow-sm">
              Z:{{ formatCoordinate(bar.z) }}
            </div>
          </div>

          <div
            v-if="hoverBarId === bar.id || selectedBarId === bar.id"
            class="absolute left-1/2 -translate-x-1/2 -top-2 bg-white rounded-engineer shadow-lg border border-gray-200 p-2 w-40 z-30 animate-fade-in"
            :style="{ transform: `translate(-50%, calc(-100% - 8px))` }"
          >
            <div class="text-xs font-medium text-primary mb-1">{{ bar.name }}</div>
            <div class="text-[10px] font-mono-num text-gray-600 space-y-0.5">
              <div>X: {{ formatCoordinate(bar.x) }} mm</div>
              <div>Y: {{ formatCoordinate(bar.y) }} mm</div>
              <div>Z: {{ formatCoordinate(bar.z) }} mm</div>
              <div>长: {{ formatCoordinate(bar.length) }} mm</div>
              <div class="text-gray-500 mt-1 pt-1 border-t border-gray-100">区域: {{ bar.zone }}</div>
              <div v-if="overlapBarIds.has(bar.id)" class="text-accent-warning font-medium">⚠ 空间重叠</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
