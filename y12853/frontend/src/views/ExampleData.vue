<template>
  <div class="page-wrapper">
    <el-card>
      <template #header>
        <strong>🧪 示例数据 · 首次打开即用（海事安全员无需先造半天表）</strong>
      </template>
      <el-alert
        type="success" :closable="false" show-icon
        title="生成后会自动填充：潮汐表、水质记录（含负深度样点）、船舶轨迹、潮窗计算结果"
        style="margin-bottom: 16px;"
      />
      <el-space wrap>
        <el-button type="primary" size="large" :loading="loading" @click="seed(false)">
          <el-icon><MagicStick /></el-icon> 生成示例数据
        </el-button>
        <el-button type="danger" size="large" :loading="loading" @click="seed(true)">
          <el-icon><Refresh /></el-icon> 强制重建（清空旧数据）
        </el-button>
      </el-space>
      <el-divider />
      <el-descriptions :column="3" border size="default" title="当前数据存量">
        <el-descriptions-item label="潮汐记录">{{ summary.tide_records || 0 }}条</el-descriptions-item>
        <el-descriptions-item label="水质记录">
          {{ summary.water_quality_records || 0 }}条
          <el-tag v-if="summary.negative_depth_samples" type="danger" size="small" style="margin-left:8px;">
            含{{ summary.negative_depth_samples }}个负深度
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="轨迹记录">{{ summary.trajectory_records || 0 }}条</el-descriptions-item>
        <el-descriptions-item label="潮窗结果" :span="3">{{ summary.tide_window_results || 0 }}条</el-descriptions-item>
      </el-descriptions>
      <el-divider />
      <el-result
        v-if="lastResult"
        :icon="lastResult.skipped ? 'info' : 'success'"
        :title="lastResult.skipped ? '已有数据，已跳过' : '示例数据已就绪'"
        :sub-title="lastResult.summary || lastResult.reason || ''"
      >
        <template #extra>
          <el-space>
            <el-button type="primary" @click="$router.push('/dashboard')">查看仪表盘</el-button>
            <el-button @click="$router.push('/tide-window')">查看潮窗列表</el-button>
            <el-button @click="$router.push('/formulas')">查看公式说明</el-button>
          </el-space>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { exampleApi } from '@/api'
const loading = ref(false)
const summary = ref({})
const lastResult = ref(null)

const load = async () => {
  const { data } = await exampleApi.summary()
  summary.value = data
}
const seed = async (force) => {
  loading.value = true
  try {
    const { data } = await exampleApi.seed(force)
    lastResult.value = data
    ElMessage.success(data.summary || data.reason || '完成')
    await load()
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
