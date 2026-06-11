<script setup lang="ts">
import { computed } from 'vue'
import { MessageSquare, Clock, Paperclip, AlertTriangle, CheckCircle, XCircle } from 'lucide-vue-next'
import type { ReviewComment, Bar } from '@/types'
import { formatTimestamp } from '@/utils/coordinate'

const props = defineProps<{
  comments: ReviewComment[]
  bars: Bar[]
  selectedCommentId: string | null
  selectedBarId: string | null
  hoverBarId: string | null
}>()

const emit = defineEmits<{
  (e: 'select-comment', id: string): void
  (e: 'hover-bar', id: string | null): void
}>()

const statusIcon = (status: string) => {
  switch (status) {
    case '已通过': return CheckCircle
    case '需修改': return XCircle
    default: return Clock
  }
}

const statusColor = (status: string) => {
  switch (status) {
    case '已通过': return 'text-accent-pass bg-green-50 border-green-200'
    case '需修改': return 'text-accent-danger bg-red-50 border-red-200'
    default: return 'text-accent-pending bg-gray-50 border-gray-200'
  }
}

const getBar = (barId: string) => computed(() => props.bars.find(b => b.id === barId))
</script>

<template>
  <div class="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
    <div class="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-primary" />
        <h3 class="font-title text-base text-primary">评审批注</h3>
        <span class="ml-auto text-xs text-gray-500">{{ comments.length }} 条</span>
      </div>
      <p class="text-xs text-gray-500 mt-1">从批注切入复核，悬停联动画布</p>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5">
      <div
        v-for="cmt in comments"
        :key="cmt.id"
        class="card p-3 cursor-pointer transition-all duration-150 hover:shadow-md"
        :class="{
          'ring-2 ring-primary/60 shadow-md': selectedCommentId === cmt.id,
          'ring-1 ring-accent-warning/50 bg-amber-50/30': hoverBarId === cmt.barId
        }"
        @click="emit('select-comment', cmt.id)"
        @mouseenter="emit('hover-bar', cmt.barId)"
        @mouseleave="emit('hover-bar', null)"
      >
        <div class="flex items-start gap-2.5">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="badge" :class="statusColor(cmt.status)">
                <component :is="statusIcon(cmt.status)" class="w-3 h-3" />
                {{ cmt.status }}
              </span>
              <span
                v-if="cmt.hasLateAttachment"
                class="badge border border-accent-warning bg-amber-50 text-accent-warning"
              >
                <Paperclip class="w-3 h-3" />
                晚到附件
              </span>
            </div>

            <div class="text-xs text-gray-500 mb-1.5">
              <span class="font-medium text-primary">{{ getBar(cmt.barId).value?.name ?? '未知吊杆' }}</span>
              <span class="mx-1">·</span>
              <span>{{ cmt.author }}</span>
              <span class="mx-1">·</span>
              <span>{{ formatTimestamp(cmt.createdAt) }}</span>
            </div>

            <p class="text-sm text-gray-700 leading-relaxed">{{ cmt.content }}</p>

            <div
              v-if="cmt.hasLateAttachment && cmt.attachmentName"
              class="mt-2 flex items-center gap-1.5 text-xs text-accent-warning bg-amber-50 px-2 py-1 rounded-engineer"
            >
              <Paperclip class="w-3 h-3" />
              <span>{{ cmt.attachmentName }}</span>
              <AlertTriangle class="w-3 h-3 ml-auto" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="comments.length === 0" class="text-center py-12 text-gray-400 text-sm">
        暂无匹配的评审批注
      </div>
    </div>
  </div>
</template>
