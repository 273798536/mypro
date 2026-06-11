<script setup lang="ts">
import { computed } from 'vue'
import { X, Download, FileJson, FileSpreadsheet, Filter, CheckCircle2, Loader2, AlertTriangle, ServerCrash, Server } from 'lucide-vue-next'
import type { ExportResponse, FilterCriteria } from '@/types'

const props = defineProps<{
  visible: boolean
  exportData: ExportResponse | null
  filter: FilterCriteria
  isLoading: boolean
  isChecking: boolean
  error: string | null
  apiAvailable: boolean | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'export-json'): void
  (e: 'export-csv'): void
}>()

const filterSummary = (f: FilterCriteria) => {
  const parts: string[] = []
  if (f.status?.length) parts.push(`状态筛选: ${f.status.join(', ')}`)
  if (f.zone) parts.push(`区域: ${f.zone}`)
  if (f.keyword) parts.push(`关键词: ${f.keyword}`)
  if (f.riskLevel?.length) parts.push(`风险等级: ${f.riskLevel.join(', ')}`)
  return parts.length ? parts : ['无筛选条件']
}

const displaySummary = computed(() => {
  if (props.exportData?.data?.summary) return props.exportData.data.summary
  if (props.isChecking) return { passed: 0, needFix: 0, overlap: 0, pending: 0 }
  const countStatus = (s: string) => {
    if (!props.filter.status?.length || props.filter.status.includes(s)) {
      const bars = (window as any).__BARS_CACHE__ || []
      return bars.filter((b: any) => b.status === s).length
    }
    return 0
  }
  return {
    passed: countStatus('passed'),
    needFix: countStatus('need-fix'),
    overlap: countStatus('overlap'),
    pending: countStatus('pending')
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-engineer shadow-2xl w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
        <div class="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
          <Download class="w-4 h-4 text-primary" />
          <h3 class="font-title text-base text-primary">导出复核数据</h3>

          <div class="ml-auto flex items-center gap-2">
            <div
              v-if="apiAvailable !== null"
              class="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-engineer"
              :class="apiAvailable ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'"
            >
              <Server v-if="apiAvailable" class="w-3 h-3" />
              <ServerCrash v-else class="w-3 h-3" />
              {{ apiAvailable ? '后端在线' : '后端离线（使用本地兜底）' }}
            </div>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors"
              @click="emit('close')"
              :disabled="isLoading"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <div
            v-if="isChecking"
            class="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-engineer border border-blue-100"
          >
            <Loader2 class="w-4 h-4 animate-spin text-primary" />
            <span>正在校验导出数据...</span>
          </div>

          <div
            v-else-if="error"
            class="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-3 py-2.5 rounded-engineer border border-red-200"
          >
            <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div class="font-medium">导出接口异常</div>
              <div class="text-xs text-red-600 mt-0.5">{{ error }}</div>
              <div class="text-xs text-red-500 mt-1">可继续导出，将使用浏览器本地数据兜底（筛选口径仍保留）</div>
            </div>
          </div>

          <div
            v-else-if="!apiAvailable"
            class="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2.5 rounded-engineer border border-amber-200"
          >
            <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div class="font-medium">后端导出服务不可用</div>
              <div class="text-xs text-amber-600 mt-0.5">
                请确认已执行 <code class="bg-amber-100 px-1 rounded">npm run server</code> 启动后端（端口 3001）
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <Filter class="w-3 h-3" />
              本次导出筛选口径（已包含在接口返回中）
            </h4>
            <div class="bg-slate-50 rounded-engineer border border-gray-200 p-3 space-y-1">
              <div
                v-for="(line, idx) in filterSummary(filter)"
                :key="idx"
                class="text-xs text-gray-700 flex items-center gap-1.5"
              >
                <CheckCircle2 class="w-3 h-3 text-accent-pass flex-shrink-0" />
                <span class="font-mono-num">{{ line }}</span>
              </div>
              <div class="text-xs text-gray-500 flex items-center gap-1.5 pt-1 border-t border-gray-200 mt-1.5">
                <CheckCircle2 class="w-3 h-3 text-accent-pass flex-shrink-0" />
                <span class="font-mono-num">坐标系: stage-local（舞台本地坐标系）</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-medium text-gray-500 mb-2">导出内容概览</h4>
            <div class="grid grid-cols-4 gap-2">
              <div class="bg-gray-50 rounded-engineer p-2.5 text-center border border-gray-200" :class="{ 'opacity-50': isChecking }">
                <div class="text-lg font-mono-num font-medium text-primary">
                  <Loader2 v-if="isChecking" class="w-5 h-5 mx-auto animate-spin" />
                  <template v-else>{{ displaySummary.passed }}</template>
                </div>
                <div class="text-[10px] text-gray-500">已通过</div>
              </div>
              <div class="bg-red-50 rounded-engineer p-2.5 text-center border border-red-200" :class="{ 'opacity-50': isChecking }">
                <div class="text-lg font-mono-num font-medium text-accent-danger">{{ displaySummary.needFix }}</div>
                <div class="text-[10px] text-gray-500">需修改</div>
              </div>
              <div class="bg-amber-50 rounded-engineer p-2.5 text-center border border-amber-200" :class="{ 'opacity-50': isChecking }">
                <div class="text-lg font-mono-num font-medium text-accent-warning">{{ displaySummary.overlap }}</div>
                <div class="text-[10px] text-gray-500">重叠异常</div>
              </div>
              <div class="bg-gray-50 rounded-engineer p-2.5 text-center border border-gray-200" :class="{ 'opacity-50': isChecking }">
                <div class="text-lg font-mono-num font-medium text-gray-600">{{ displaySummary.pending }}</div>
                <div class="text-[10px] text-gray-500">待复核</div>
              </div>
            </div>
          </div>

          <div class="text-[11px] text-gray-400 bg-blue-50 rounded-engineer px-3 py-2 border border-blue-100 space-y-0.5">
            <div class="flex items-start gap-1.5">
              <CheckCircle2 class="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>导出数据中的坐标数值与屏幕显示完全一致，坐标系统一为 stage-local</span>
            </div>
            <div class="flex items-start gap-1.5">
              <CheckCircle2 class="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>筛选口径（filterCriteria）已嵌入接口返回 JSON 结构，CSV 每行末尾也附带筛选字段</span>
            </div>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex items-center gap-3 justify-end bg-gray-50">
          <button
            class="btn-secondary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isLoading || isChecking"
            @click="emit('export-csv')"
          >
            <Loader2 v-if="isLoading" class="w-3.5 h-3.5 animate-spin" />
            <FileSpreadsheet v-else class="w-3.5 h-3.5" />
            导出 CSV
          </button>
          <button
            class="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isLoading || isChecking"
            @click="emit('export-json')"
          >
            <Loader2 v-if="isLoading" class="w-3.5 h-3.5 animate-spin" />
            <FileJson v-else class="w-3.5 h-3.5" />
            导出 JSON（完整数据 + 筛选口径）
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
