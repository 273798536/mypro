<script setup lang="ts">
import { ref, computed } from 'vue'
import { Camera, Locate, Filter, ChevronRight, Trash2, ZoomIn, AlertCircle, CheckCircle } from 'lucide-vue-next'
import type { ScreenshotRecord, FilterCriteria } from '@/types'
import { formatTimestamp } from '@/utils/coordinate'

const props = defineProps<{
  screenshots: ScreenshotRecord[]
}>()

const emit = defineEmits<{
  (e: 'restore-filter', filter: FilterCriteria): void
  (e: 'select-bar', id: string): void
  (e: 'delete-shot', id: string): void
}>()

const viewingShotId = ref<string | null>(null)

const filterSummary = (f: FilterCriteria) => {
  const parts: string[] = []
  if (f.status?.length) parts.push(`状态×${f.status.length}`)
  if (f.zone) parts.push(f.zone)
  if (f.keyword) parts.push(`关键词`)
  if (f.riskLevel?.length) parts.push(`风险×${f.riskLevel.length}`)
  return parts.length ? parts.join(' · ') : '无筛选'
}

const isRealImage = (shot: ScreenshotRecord) =>
  shot.imageUrl && shot.imageUrl.startsWith('data:image/')

const viewingShot = computed(() =>
  viewingShotId.value ? props.screenshots.find(s => s.id === viewingShotId.value) : null
)

function handleHotspotClick(barId: string, shotId: string) {
  emit('select-bar', barId)
  const shot = props.screenshots.find(s => s.id === shotId)
  if (shot) {
    emit('restore-filter', shot.filterSnapshot)
  }
}

function handleRestore(shot: ScreenshotRecord) {
  emit('restore-filter', shot.filterSnapshot)
  if (shot.linkedBarIds.length > 0) {
    emit('select-bar', shot.linkedBarIds[0])
  }
}
</script>

<template>
  <div class="card">
    <div class="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
      <Camera class="w-4 h-4 text-primary" />
      <h4 class="font-title text-sm text-primary">评审截图回溯</h4>
      <span class="text-xs text-gray-500 ml-auto">从截图回到对象来源和筛选</span>
    </div>

    <div class="p-3 space-y-2.5 max-h-64 overflow-y-auto scrollbar-thin">
      <div v-if="screenshots.length === 0" class="text-sm text-gray-400 text-center py-6">
        <Camera class="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>暂无截图记录</p>
        <p class="text-[11px] mt-1">点击顶部「截取当前视图」按钮保存</p>
      </div>

      <div
        v-for="shot in screenshots"
        :key="shot.id"
        class="border border-gray-200 rounded-engineer overflow-hidden hover:border-primary/40 transition-colors group"
      >
        <div
          class="relative h-24 bg-gradient-to-br from-canvas-bg to-primary/10 overflow-hidden cursor-pointer"
          @click="viewingShotId = viewingShotId === shot.id ? null : shot.id"
        >
          <img
            v-if="isRealImage(shot)"
            :src="shot.imageUrl"
            :alt="shot.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="absolute inset-0 flex items-center justify-center">
            <div class="absolute inset-0 opacity-20">
              <svg width="100%" height="100%">
                <defs>
                  <pattern width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0F3B4A" stroke-width="0.3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            <div class="text-center relative z-10">
              <AlertCircle class="w-5 h-5 mx-auto mb-1 text-accent-warning" />
              <p class="text-[10px] text-gray-500">历史数据，无真实截图</p>
            </div>
          </div>

          <div
            v-for="(hs, idx) in shot.hotspotAreas"
            :key="idx"
            class="absolute border-2 border-accent-warning bg-accent-warning/15 rounded-engineer hover:bg-accent-warning/30 transition-all group/hs"
            :style="{
              left: (hs.x * 100) + '%',
              top: (hs.y * 100) + '%',
              width: (hs.width * 100) + '%',
              height: (hs.height * 100) + '%'
            }"
            @click.stop="handleHotspotClick(hs.barId, shot.id)"
            :title="`点击定位到 ${hs.barId}`"
          >
            <span class="absolute -top-4 left-0 text-[9px] bg-accent-warning text-white px-1 rounded opacity-0 group-hover/hs:opacity-100 transition-opacity whitespace-nowrap">
              定位 {{ hs.barId }}
            </span>
          </div>

          <div class="absolute bottom-1 right-2 flex items-center gap-1">
            <span v-if="isRealImage(shot)" class="inline-flex items-center gap-0.5 text-[10px] text-accent-pass bg-white/80 px-1.5 py-0.5 rounded">
              <CheckCircle class="w-2.5 h-2.5" />
              真实截图
            </span>
            <ZoomIn class="w-3 h-3 text-white/80 bg-black/30 rounded p-0.5" />
          </div>

          <span class="absolute bottom-1 left-2 text-[10px] text-white/80 bg-black/30 px-1.5 py-0.5 rounded font-mono-num">
            {{ formatTimestamp(shot.capturedAt) }}
          </span>
        </div>

        <div class="px-3 py-2 bg-white">
          <div class="flex items-center gap-2">
            <div class="text-sm font-medium text-gray-800 truncate flex-1">{{ shot.title }}</div>
            <button
              class="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded"
              @click.stop="emit('delete-shot', shot.id)"
              title="删除截图"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex items-center gap-2 mt-1.5 text-[11px]">
            <span class="flex items-center gap-1 text-gray-500 flex-1 min-w-0">
              <Filter class="w-3 h-3 flex-shrink-0" />
              <span class="truncate">{{ filterSummary(shot.filterSnapshot) }}</span>
            </span>
            <button
              class="flex items-center gap-0.5 text-primary hover:text-primary-light transition-colors font-medium group-hover:underline flex-shrink-0"
              @click.stop="handleRestore(shot)"
            >
              <Locate class="w-3 h-3" />
              恢复筛选
              <ChevronRight class="w-3 h-3" />
            </button>
          </div>

          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="barId in shot.linkedBarIds"
              :key="barId"
              class="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded cursor-pointer hover:bg-primary/20 transition-colors"
              @click.stop="emit('select-bar', barId)"
            >
              定位: {{ barId }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="viewingShot && isRealImage(viewingShot)"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8"
        @click="viewingShotId = null"
      >
        <div class="max-w-4xl max-h-full overflow-auto bg-white rounded-engineer shadow-2xl">
          <div class="px-4 py-2 border-b border-gray-200 flex items-center gap-2">
            <Camera class="w-4 h-4 text-primary" />
            <span class="font-medium">{{ viewingShot.title }}</span>
            <span class="text-xs text-gray-500 ml-auto">{{ formatTimestamp(viewingShot.capturedAt) }}</span>
          </div>
          <div class="relative" @click.stop>
            <img :src="viewingShot.imageUrl" class="max-w-full" :alt="viewingShot.title" />
            <div
              v-for="(hs, idx) in viewingShot.hotspotAreas"
              :key="idx"
              class="absolute border-2 border-accent-warning bg-accent-warning/20 rounded-engineer cursor-pointer hover:bg-accent-warning/40 transition-colors"
              :style="{
                left: (hs.x * 100) + '%',
                top: (hs.y * 100) + '%',
                width: (hs.width * 100) + '%',
                height: (hs.height * 100) + '%'
              }"
              @click="handleHotspotClick(hs.barId, viewingShot.id); viewingShotId = null"
            >
              <span class="absolute -top-5 left-0 text-[10px] bg-accent-warning text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                点击定位: {{ hs.barId }}
              </span>
            </div>
          </div>
          <div class="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
            点击热区可定位到对应吊杆并恢复当时筛选条件 · 点击空白处关闭
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
