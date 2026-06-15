<template>
  <div v-if="store.selectedPointLatestReview">
    <div class="section-title">
      <el-icon :size="16" color="#909399"><Clock /></el-icon>
      <span style="margin-left: 6px">旧版意见（V{{ store.selectedPointLatestReview.version - 1 }}及之前版本保留）</span>
    </div>
    <el-card class="old-opinion mb-16" shadow="never">
      <div style="color: #909399; font-size: 13px; margin-bottom: 8px">
        📝 此为上一版复核意见，不会被新表盖掉 · 可回溯对比
      </div>
      <div style="background: #fdf6ec; padding: 12px 16px; border-radius: 4px; border-left: 3px solid #e6a23c">
        {{ store.selectedPointLatestReview.oldOpinion }}
      </div>
    </el-card>

    <div class="section-title mt-16">
      <el-icon :size="16" color="#409eff"><EditPen /></el-icon>
      <span style="margin-left: 6px">当前版本（V{{ store.selectedPointLatestReview.version }}）</span>
    </div>

    <el-form label-width="110px">
      <el-form-item label="人工备注" required>
        <div>
          <el-input
            v-model="remarkDraft"
            type="textarea"
            :rows="4"
            placeholder="填写本次复核的人工备注、现场走访情况、与商户/居民沟通记录等……"
            @blur="onRemarkSave"
          />
          <div style="margin-top: 6px; color: #909399; font-size: 12px">
            💡 备注自动保存，刷新不丢失，且会作为"人工确认变化"写入历史记录
          </div>
        </div>
      </el-form-item>
      <el-form-item label="复核结论">
        <el-radio-group v-model="conclusion">
          <el-radio-button label="按核定容量执行" />
          <el-radio-button label="核减后执行" />
          <el-radio-button label="暂停外摆" />
          <el-radio-button label="需再议" />
        </el-radio-group>
      </el-form-item>
    </el-form>

    <div v-if="store.selectedPointLatestReview.changes.length" class="mt-16">
      <div class="section-title">
        <el-icon :size="16" color="#67c23a"><Sort /></el-icon>
        <span style="margin-left: 6px">本次版本修改轨迹（可解释给运营主管）</span>
      </div>
      <el-timeline>
        <el-timeline-item
          v-for="(c, idx) in store.selectedPointLatestReview.changes"
          :key="idx"
          :timestamp="c.changeTime"
          :color="changeColor(c.field)"
        >
          <div>
            <b>{{ fieldLabel(c.field) }}</b>
            <span style="margin: 0 8px; color: #909399">由</span>
            <span class="change-before">{{ formatVal(c.oldValue) || '(空)' }}</span>
            <span style="margin: 0 8px; color: #909399">改为</span>
            <span class="change-after">{{ formatVal(c.newValue) || '(空)' }}</span>
            <el-tag size="small" type="info" style="margin-left: 8px">{{ c.operator }}</el-tag>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useReviewStore } from '@/store/review'

const store = useReviewStore()

const remarkDraft = ref(store.selectedPointLatestReview?.manualRemark || '')
const conclusion = ref('核减后执行')

watch(
  () => store.selectedPointLatestReview,
  (r) => {
    if (r) remarkDraft.value = r.manualRemark
  },
  { immediate: true }
)

function onRemarkSave() {
  if (!store.selectedPoint) return
  store.updateReviewRemark(store.selectedPoint.id, remarkDraft.value)
  ElMessage.success('人工备注已保存至历史记录')
}

function fieldLabel(f: string) {
  return {
    manualRemark: '人工备注',
    capacitySuggestion: '建议容量',
    status: '复核状态',
    confirmReason: '待确认原因',
    impactScope: '影响范围'
  }[f] || f
}
function changeColor(f: string) {
  return {
    manualRemark: '#409eff',
    capacitySuggestion: '#67c23a',
    status: '#f56c6c',
    confirmReason: '#e6a23c',
    impactScope: '#e6a23c'
  }[f] || '#909399'
}
function formatVal(v: any) {
  if (typeof v === 'string' && v.length > 40) return v.slice(0, 40) + '…'
  return v
}
</script>

<style lang="scss" scoped>
.old-opinion :deep(.el-card__body) {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
