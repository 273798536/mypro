<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Download, Camera, RefreshCw, User, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-vue-next'
import CommentSidebar from '@/components/CommentSidebar.vue'
import BarCanvas from '@/components/BarCanvas.vue'
import FilterBar from '@/components/FilterBar.vue'
import OverlapIsolation from '@/components/OverlapIsolation.vue'
import HistoryTimeline from '@/components/HistoryTimeline.vue'
import ScreenshotGallery from '@/components/ScreenshotGallery.vue'
import FinalizationPanel from '@/components/FinalizationPanel.vue'
import ExportDialog from '@/components/ExportDialog.vue'
import DetailPanel from '@/components/DetailPanel.vue'

import { useReview } from '@/composables/useReview'
import { useOverlap } from '@/composables/useOverlap'
import { useHistory } from '@/composables/useHistory'
import { useScreenshot } from '@/composables/useScreenshot'
import { useExport } from '@/composables/useExport'
import { generateFinalizationList, summarizeFinalization } from '@/utils/finalize'

const {
  bars,
  comments,
  filteredBars,
  filteredComments,
  selectedBar,
  selectedBarId,
  selectedCommentId,
  hoverBarId,
  filter,
  zones,
  summary,
  toggleStatusFilter,
  toggleRiskFilter,
  clearRiskFilter,
  setFilter,
  clearFilter,
  selectBar,
  selectComment,
  updateCommentStatus,
  resetAll
} = useReview()

const { pairs } = useOverlap()
const { sortedHistory } = useHistory()
const {
  sortedScreenshots,
  captureCurrentView,
  isCapturing,
  captureError,
  clearError: clearShotError,
  deleteShot
} = useScreenshot()

const {
  isLoading: isExporting,
  isChecking,
  error: exportError,
  apiAvailable,
  lastResponse,
  checkHealth,
  validateExport,
  exportJSON,
  exportCSV,
  clearError: clearExportError
} = useExport()

const showExportDialog = ref(false)
const barCanvasRef = ref<InstanceType<typeof BarCanvas> | null>(null)
const toast = ref<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)
let toastTimer: number | null = null

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { type, message }
  toastTimer = window.setTimeout(() => { toast.value = null }, 4000)
}

const overlapBarIds = computed(() => {
  const s = new Set<string>()
  pairs.value.forEach(p => { s.add(p.barIdA); s.add(p.barIdB) })
  return s
})

const finalizationItems = computed(() =>
  generateFinalizationList(bars.value, comments.value, pairs.value)
)
const finalizationSummary = computed(() => summarizeFinalization(finalizationItems.value))

const currentExportData = computed(() => lastResponse.value || null)

onMounted(async () => {
  await checkHealth()
})

watch(showExportDialog, async (val) => {
  if (val) {
    clearExportError()
    await validateExport(filter, bars.value, comments.value)
  }
})

function handleSelectBar(id: string | null) {
  selectBar(id)
}

function handleHoverBar(id: string | null) {
  hoverBarId.value = id
}

function handleRestoreFilter(f: any) {
  if (f.status) filter.status = [...f.status]
  if (f.zone) filter.zone = f.zone
  if (f.keyword) filter.keyword = f.keyword
  if (f.riskLevel) filter.riskLevel = [...f.riskLevel]
  filter.appliedAt = Date.now()
}

async function handleCaptureShot() {
  clearShotError()
  const defaultTitle = `复核快照 ${new Date().toLocaleString('zh-CN')}`
  let title: string | null = defaultTitle

  try {
    title = prompt('请输入截图说明：', defaultTitle)
  } catch {
    title = defaultTitle
  }

  if (!title) return

  if (!barCanvasRef.value) {
    showToast('error', '画布组件未就绪，请稍候重试')
    return
  }

  const canvasEl = (barCanvasRef.value as any).canvasWrapperRef as HTMLElement | null
  const canvasW = (barCanvasRef.value as any).CANVAS_W as number
  const canvasH = (barCanvasRef.value as any).CANVAS_H as number
  const pad = (barCanvasRef.value as any).PAD as number

  const record = await captureCurrentView({
    canvasElement: canvasEl,
    title,
    bars: filteredBars.value,
    filter,
    hoverBarId: hoverBarId.value,
    canvasWidth: canvasW,
    canvasHeight: canvasH,
    pad
  })

  if (record) {
    showToast('success', `截图已保存：${title}`)
  } else if (captureError.value) {
    showToast('error', `截图失败：${captureError.value}`)
  }
}

async function handleExportJSON() {
  clearExportError()
  const success = await exportJSON(
    filter,
    bars.value,
    comments.value,
    pairs.value
  )
  if (success) {
    showToast('success', 'JSON 导出成功，筛选口径已包含在文件中')
    showExportDialog.value = false
  } else if (exportError.value) {
    showToast('error', `导出失败：${exportError.value}`)
  }
}

async function handleExportCSV() {
  clearExportError()
  const success = await exportCSV(
    filter,
    bars.value,
    comments.value
  )
  if (success) {
    showToast('success', 'CSV 导出成功，坐标数值与屏幕显示一致')
    showExportDialog.value = false
  } else if (exportError.value) {
    showToast('error', `导出失败：${exportError.value}`)
  }
}

function handleReset() {
  if (confirm('确认重置所有数据为初始状态？')) {
    resetAll()
    location.reload()
  }
}

function handleDeleteShot(id: string) {
  if (confirm('确认删除此截图？')) {
    deleteShot(id)
    showToast('success', '截图已删除')
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-50 overflow-hidden relative">
    <header class="bg-primary text-white px-6 py-3 flex items-center gap-4 shadow-sm flex-shrink-0">
      <div>
        <h1 class="font-title text-lg tracking-wide">剧院吊杆阵列空间复核系统</h1>
        <p class="text-[11px] text-primary-light mt-0.5">Theater Batten Array Spatial Review System</p>
      </div>

      <div class="ml-8 flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5 bg-primary-light/40 px-2.5 py-1 rounded-engineer">
          <span class="text-primary-light">总计</span>
          <span class="font-mono-num font-medium">{{ summary.total }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-accent-pass"></span>
          <span class="font-mono-num">{{ summary.passed }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-accent-danger"></span>
          <span class="font-mono-num">{{ summary.needFix }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-accent-warning animate-overlap"></span>
          <span class="font-mono-num">{{ summary.overlap }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-gray-400"></span>
          <span class="font-mono-num">{{ summary.pending }}</span>
        </div>
      </div>

      <div
        v-if="apiAvailable !== null"
        class="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-engineer"
        :class="apiAvailable ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'"
        :title="apiAvailable ? '后端导出服务正常' : '后端导出服务不可用，将使用本地数据兜底'"
      >
        <span :class="apiAvailable ? 'bg-green-400' : 'bg-red-400'" class="w-1.5 h-1.5 rounded-full animate-pulse"></span>
        {{ apiAvailable ? 'API 正常' : 'API 离线' }}
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
          class="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-engineer transition-colors flex items-center gap-1.5"
          :disabled="isCapturing"
          @click="handleCaptureShot"
        >
          <Loader2 v-if="isCapturing" class="w-3.5 h-3.5 animate-spin" />
          <Camera v-else class="w-3.5 h-3.5" />
          {{ isCapturing ? '截取中...' : '截取当前视图' }}
        </button>
        <button
          class="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-engineer transition-colors flex items-center gap-1.5"
          :disabled="isExporting"
          @click="showExportDialog = true"
        >
          <Loader2 v-if="isExporting" class="w-3.5 h-3.5 animate-spin" />
          <Download v-else class="w-3.5 h-3.5" />
          导出数据
        </button>
        <button
          class="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-engineer transition-colors flex items-center gap-1.5"
          @click="handleReset"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          重置
        </button>
        <div class="w-px h-6 bg-white/20 mx-1"></div>
        <div class="flex items-center gap-1.5 text-xs">
          <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <User class="w-3.5 h-3.5" />
          </div>
          <span>林姐</span>
        </div>
      </div>
    </header>

    <FilterBar
      :zones="zones"
      :current-zone="filter.zone || ''"
      :status-filter="filter.status || []"
      :risk-level-filter="filter.riskLevel || []"
      :keyword="filter.keyword || ''"
      @toggle-status="toggleStatusFilter"
      @toggle-risk="toggleRiskFilter"
      @clear-risk="clearRiskFilter"
      @set-zone="(z) => setFilter('zone', z)"
      @set-keyword="(kw) => setFilter('keyword', kw)"
      @clear="clearFilter"
    />

    <OverlapIsolation
      :pairs="pairs"
      :bars="bars"
      @select-bar="handleSelectBar"
    />

    <div class="flex-1 flex min-h-0">
      <CommentSidebar
        :comments="filteredComments"
        :bars="bars"
        :selected-comment-id="selectedCommentId"
        :selected-bar-id="selectedBarId"
        :hover-bar-id="hoverBarId"
        @select-comment="selectComment"
        @hover-bar="handleHoverBar"
      />

      <BarCanvas
        ref="barCanvasRef"
        :bars="filteredBars"
        :all-bars="bars"
        :selected-bar-id="selectedBarId"
        :hover-bar-id="hoverBarId"
        :overlap-bar-ids="overlapBarIds"
        :filter="filter"
        @select-bar="handleSelectBar"
        @hover-bar="handleHoverBar"
      />

      <div class="w-80 bg-white border-l border-gray-200 flex flex-col h-full min-h-0">
        <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 min-h-0">
          <div class="h-auto flex-shrink-0">
            <DetailPanel
              :bar="selectedBar"
              :comments="comments"
              @update-status="(cid, s, r) => updateCommentStatus(cid, s, r)"
            />
          </div>

          <HistoryTimeline
            :history="sortedHistory"
            :bar-id="selectedBarId"
          />

          <ScreenshotGallery
            :screenshots="sortedScreenshots"
            @restore-filter="handleRestoreFilter"
            @select-bar="handleSelectBar"
            @delete-shot="handleDeleteShot"
          />

          <FinalizationPanel
            :items="finalizationItems"
            :summary="finalizationSummary"
            @select-bar="handleSelectBar"
          />
        </div>
      </div>
    </div>

    <ExportDialog
      :visible="showExportDialog"
      :export-data="currentExportData"
      :filter="filter"
      :is-loading="isExporting"
      :is-checking="isChecking"
      :error="exportError"
      :api-available="apiAvailable"
      @close="showExportDialog = false; clearExportError()"
      @export-json="handleExportJSON"
      @export-csv="handleExportCSV"
    />

    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toast"
          class="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-engineer shadow-lg border animate-fade-in"
          :class="{
            'bg-green-50 border-green-200 text-green-800': toast.type === 'success',
            'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
            'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'warning'
          }"
        >
          <CheckCircle v-if="toast.type === 'success'" class="w-4 h-4 text-green-600" />
          <XCircle v-else-if="toast.type === 'error'" class="w-4 h-4 text-red-600" />
          <AlertTriangle v-else class="w-4 h-4 text-amber-600" />
          <span class="text-sm font-medium">{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
