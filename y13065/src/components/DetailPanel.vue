<script setup lang="ts">import { computed, ref } from 'vue';
import { Layers, User, Clock, CheckCircle, XCircle, Pencil, MessageSquarePlus } from 'lucide-vue-next';
import type { Bar, ReviewComment, FilterCriteria } from '@/types';
import { formatCoordinate, formatTimestamp } from '@/utils/coordinate';
const props = defineProps<{
 bar: Bar | null;
 comments: ReviewComment[];
}>();
const emit = defineEmits<{
 (e: 'update-status', commentId: string, status: '待复核' | '已通过' | '需修改', reason: string): void;
 (e: 'capture-shot', title: string): void;
}>();
const barComments = computed(() => props.comments.filter(c => c.barId === props.bar?.id));
const statusOptions: Array<'待复核' | '已通过' | '需修改'> = ['待复核', '已通过', '需修改'];
const newReason = ref('');
const selectedStatusFor = ref<string | null>(null);
function confirmUpdate(cmtId: string, status: '待复核' | '已通过' | '需修改') {
 if (!newReason.value.trim()) {
 newReason.value = '林姐复核后判断调整';
 }
 emit('update-status', cmtId, status, newReason.value);
 selectedStatusFor.value = null;
 newReason.value = '';
}
const statusColor = (s: string) => {
 switch (s) {
 case '已通过': return 'text-accent-pass bg-green-50 border-green-200';
 case '需修改': return 'text-accent-danger bg-red-50 border-red-200';
 default: return 'text-gray-600 bg-gray-50 border-gray-200';
 }
};
const statusIcon = (s: string) => {
 switch (s) {
 case '已通过': return CheckCircle;
 case '需修改': return XCircle;
 default: return Clock;
 }
};
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="!bar" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
      <div class="text-center">
        <Layers class="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>选择吊杆或批注查看详情</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto scrollbar-thin">
      <div class="bg-primary text-white px-4 py-3">
        <h3 class="font-title text-base">{{ bar.name }}</h3>
        <div class="text-xs text-primary-light mt-0.5">{{ bar.id }} · {{ bar.zone }}</div>
      </div>

      <div class="p-4 border-b border-gray-200 bg-white">
        <h4 class="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
          <Layers class="w-3 h-3" />
          坐标信息（stage-local 舞台本地坐标系）
        </h4>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div class="bg-slate-50 rounded-engineer py-2 border border-gray-200">
            <div class="text-[10px] text-gray-500">X</div>
            <div class="font-mono-num font-medium text-gray-800">{{ formatCoordinate(bar.x) }}<span class="text-[10px] text-gray-400 ml-0.5">mm</span></div>
          </div>
          <div class="bg-slate-50 rounded-engineer py-2 border border-gray-200">
            <div class="text-[10px] text-gray-500">Y</div>
            <div class="font-mono-num font-medium text-gray-800">{{ formatCoordinate(bar.y) }}<span class="text-[10px] text-gray-400 ml-0.5">mm</span></div>
          </div>
          <div class="bg-slate-50 rounded-engineer py-2 border border-gray-200">
            <div class="text-[10px] text-gray-500">Z</div>
            <div class="font-mono-num font-medium text-gray-800">{{ formatCoordinate(bar.z) }}<span class="text-[10px] text-gray-400 ml-0.5">mm</span></div>
          </div>
          <div class="bg-slate-50 rounded-engineer py-2 border border-gray-200">
            <div class="text-[10px] text-gray-500">长度</div>
            <div class="font-mono-num font-medium text-gray-800">{{ formatCoordinate(bar.length) }}<span class="text-[10px] text-gray-400 ml-0.5">mm</span></div>
          </div>
        </div>
      </div>

      <div class="p-4 border-b border-gray-200 bg-white">
        <div class="flex items-center gap-2 mb-3">
          <MessageSquarePlus class="w-3.5 h-3.5 text-primary" />
          <h4 class="text-xs font-medium text-gray-600">林姐复核操作</h4>
        </div>

        <div v-for="cmt in barComments" :key="cmt.id" class="mb-3 pb-3 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="badge" :class="statusColor(cmt.status)">
                  <component :is="statusIcon(cmt.status)" class="w-3 h-3" />
                  {{ cmt.status }}
                </span>
                <span class="text-[10px] text-gray-400">
                  <User class="w-2.5 h-2.5 inline -mt-0.5" /> {{ cmt.author }} · {{ formatTimestamp(cmt.createdAt) }}
                </span>
              </div>
              <p class="text-sm text-gray-700">{{ cmt.content }}</p>

              <div v-if="selectedStatusFor !== cmt.id" class="mt-2 flex items-center gap-1.5">
                <span class="text-[11px] text-gray-500">改为：</span>
                <button
                  v-for="opt in statusOptions"
                  :key="opt"
                  class="text-[11px] px-2 py-0.5 border rounded-engineer transition-colors hover:bg-gray-50"
                  :class="cmt.status === opt ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400' : 'border-primary/40 text-primary hover:border-primary'"
                  :disabled="cmt.status === opt"
                  @click="selectedStatusFor = cmt.id"
                >
                  {{ opt }}
                </button>
              </div>

              <div v-else class="mt-2 animate-fade-in">
                <div class="flex items-center gap-1.5 mb-1.5">
                  <span class="text-[11px] text-gray-500">选择新状态：</span>
                  <button
                    v-for="opt in statusOptions"
                    :key="opt"
                    class="text-[11px] px-2 py-0.5 rounded-engineer border transition-colors"
                    :class="cmt.status === opt ? 'border-gray-200 text-gray-400 bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'"
                    :disabled="cmt.status === opt"
                  >
                    {{ opt }}
                  </button>
                </div>
                <input
                  v-model="newReason"
                  type="text"
                  placeholder="填写修改原因（自动记入历史）..."
                  class="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-engineer focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary mb-1.5"
                />
                <div class="flex gap-1.5">
                  <button
                    v-for="opt in statusOptions.filter(s => s !== cmt.status)"
                    :key="opt"
                    class="text-[11px] px-2.5 py-1 rounded-engineer text-white transition-colors"
                    :class="opt === '已通过' ? 'bg-accent-pass hover:bg-green-700' : opt === '需修改' ? 'bg-accent-danger hover:bg-red-700' : 'bg-gray-500 hover:bg-gray-600'"
                    @click="confirmUpdate(cmt.id, opt)"
                  >
                    确认改为「{{ opt }}」
                  </button>
                  <button
                    class="text-[11px] px-2.5 py-1 rounded-engineer border border-gray-300 text-gray-600 hover:bg-gray-50"
                    @click="selectedStatusFor = null"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="barComments.length === 0" class="text-xs text-gray-400 text-center py-3">
          暂无批注记录
        </div>
      </div>
    </div>
  </div>
</template>
